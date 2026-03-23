import { tool } from "ai";
import { z } from "zod";
import { graphqlFetch } from "./graphql-client";

const GET_GEO_ANALYSIS_STATUS_QUERY = `
  query GetGeoAnalysisStatus($uuid: UUID!) {
    geo {
      geoAnalysis(uuid: $uuid, first: 1) {
        edges {
          node {
            pk
            name
            status
            url
            tilesetUrl
            createdAt
            startedAt
            finishedAt
            count
            specs {
              output {
                templateName
              }
            }
          }
        }
      }
    }
  }
`;

type GetGeoAnalysisStatusProps = {
  jwtCookie: string | undefined;
};

export const getGeoAnalysisStatus = ({ jwtCookie }: GetGeoAnalysisStatusProps) =>
  tool({
    description:
      "Poll the status of a running geo analysis by its ID. " +
      "Call this repeatedly after starting an analysis until status is SUCCESS or ERROR. " +
      "Status values: PENDING (queued), RUNNING (in progress), SUCCESS (done), ERROR (failed). " +
      "When SUCCESS, the result includes a download URL.",
    inputSchema: z.object({
      analysisId: z
        .string()
        .describe("The UUID returned by runGeoAnalysis (analysisId field)"),
    }),
    execute: async ({ analysisId }) => {
      if (!jwtCookie) {
        return { error: "Not authenticated: no JWT cookie found." };
      }

      const { data, error } = await graphqlFetch({
        query: GET_GEO_ANALYSIS_STATUS_QUERY,
        variables: { uuid: analysisId },
        jwtCookie,
      });
      if (error) return { error };

      const edges = (data as { geo: { geoAnalysis: { edges: { node: Record<string, unknown> }[] } } })?.geo?.geoAnalysis?.edges;
      if (!edges?.length) {
        return { error: `No analysis found for ID: ${analysisId}` };
      }

      const node = edges[0].node;
      return {
        analysisId,
        status: node.status as "PENDING" | "RUNNING" | "SUCCESS" | "ERROR",
        name: node.name,
        url: node.url ?? null,
        tilesetUrl: node.tilesetUrl ?? null,
        count: node.count ?? null,
        createdAt: node.createdAt,
        startedAt: node.startedAt ?? null,
        finishedAt: node.finishedAt ?? null,
        outputTemplate: (node.specs as { output?: { templateName?: string } } | null)?.output?.templateName ?? null,
        isFinished: node.status === "SUCCESS" || node.status === "ERROR",
      };
    },
  });
