import AdmZip from "adm-zip";
import { tool } from "ai";
import * as XLSX from "xlsx";
import { z } from "zod";
import { graphqlFetch } from "./graphql-client";

const REQUEST_DOWNLOAD_URL_MUTATION = `
  mutation RequestDownloadUrl($uuid: UUID!) {
    geo {
      analysisDownload(analysisId: $uuid) {
        analysis {
          url
        }
      }
    }
  }
`;

type DownloadGeoAnalysisProps = {
  jwtCookie: string | undefined;
};

function xlsxToMarkdown(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sections: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (rows.length === 0) continue;

    sections.push(`## ${sheetName}\n`);

    const [headerRow, ...dataRows] = rows;
    const colCount = Math.max(...rows.map((r) => r.length));

    // Ensure header row has enough columns
    const header = Array.from({ length: colCount }, (_, i) => String(headerRow[i] ?? ""));
    sections.push(`| ${header.join(" | ")} |`);
    sections.push(`| ${header.map(() => "---").join(" | ")} |`);

    for (const row of dataRows) {
      const cells = Array.from({ length: colCount }, (_, i) => String(row[i] ?? ""));
      sections.push(`| ${cells.join(" | ")} |`);
    }

    sections.push("");
  }

  return sections.join("\n");
}

export const downloadGeoAnalysis = ({ jwtCookie }: DownloadGeoAnalysisProps) =>
  tool({
    description:
      "Download the result of a completed geo analysis and return its contents as markdown. " +
      "Only call this when getGeoAnalysisStatus reports status SUCCESS. " +
      "Requests a signed download URL, fetches the zip archive, extracts analysis_summary.xlsx, " +
      "and returns the spreadsheet content as formatted markdown tables.",
    inputSchema: z.object({
      analysisId: z
        .string()
        .describe("The UUID of the completed analysis (must have status SUCCESS)"),
    }),
    execute: async ({ analysisId }) => {
      if (!jwtCookie) {
        return { error: "Not authenticated: no JWT cookie found." };
      }

      // Step 1: Request the signed download URL
      const { data, error } = await graphqlFetch({
        query: REQUEST_DOWNLOAD_URL_MUTATION,
        variables: { uuid: analysisId },
        jwtCookie,
      });
      if (error) return { error };

      const url = (
        data as {
          geo: { analysisDownload: { analysis: { url: string } } };
        }
      )?.geo?.analysisDownload?.analysis?.url;

      if (!url) {
        return { error: "No download URL returned for this analysis." };
      }

      // Step 2: Download the zip file
      // Rewrite localhost:4566 to localstack so the Next.js server can reach LocalStack inside Docker.
      const rewrittenUrl = url.replace(
        /^(https?:\/\/)localhost(:\d+)?\//i,
        (_, scheme, port) => `${scheme}localstack${port ?? ""}/`,
      );

      let zipBuffer: Buffer;
      try {
        const response = await fetch(rewrittenUrl);
        if (!response.ok) {
          return {
            error: `Failed to download analysis zip: HTTP ${response.status} from ${rewrittenUrl}`,
          };
        }
        zipBuffer = Buffer.from(await response.arrayBuffer());
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: `Failed to fetch zip archive (${rewrittenUrl}): ${message}` };
      }

      // Step 3: Find and extract analysis_summary.xlsx
      let xlsxBuffer: Buffer;
      try {
        const zip = new AdmZip(zipBuffer);
        const entry = zip
          .getEntries()
          .find((e) => e.entryName.endsWith("analysis_summary.xlsx"));

        if (!entry) {
          return { error: "analysis_summary.xlsx not found inside the zip archive." };
        }

        xlsxBuffer = entry.getData();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: `Failed to read zip archive: ${message}` };
      }

      // Step 4: Convert xlsx to markdown
      try {
        const markdown = xlsxToMarkdown(xlsxBuffer);
        return { markdown };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: `Failed to parse Excel file: ${message}` };
      }
    },
  });
