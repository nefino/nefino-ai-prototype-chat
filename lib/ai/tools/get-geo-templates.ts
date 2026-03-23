import { tool } from "ai";
import { z } from "zod";
import { graphqlFetch } from "./graphql-client";

const GET_GEO_TEMPLATES_QUERY = `
  query GetGeoTemplates($inputs: GeoAnalysisTemplateInput) {
    geo {
      geoAnalysisTemplate(inputs: $inputs) {
        id
        type
        placeName
        energyType
        planStatus
        formValues {
          operations {
            operationName
            input
          }
          requests {
            clusterName
            layers {
              layerName
              bufferM
            }
          }
        }
      }
    }
  }
`;

type GetGeoTemplatesProps = {
  jwtCookie: string | undefined;
};

export const getGeoTemplates = ({ jwtCookie }: GetGeoTemplatesProps) =>
  tool({
    description:
      "Fetch the best-matching geo analysis template for the given energy type and place. " +
      "Returns the single best template (first result). " +
      "Pass the returned template's formValues directly to runGeoAnalysis.",
    inputSchema: z.object({
      energyType: z
        .enum(["WIND", "SOLAR", "HYDROGEN", "BATTERY_STORAGE", "NOT_DEFINED"])
        .describe(
          "Energy type derived from the project's projectKind (e.g. WIND → WIND, SOLAR → SOLAR)"
        ),
    }),
    execute: async ({ energyType }) => {
      if (!jwtCookie) {
        return { error: "Not authenticated: no JWT cookie found." };
      }
      const { data, error } = await graphqlFetch({
        query: GET_GEO_TEMPLATES_QUERY,
        variables: { inputs: { energyType, place: "DE" } },
        jwtCookie,
      });
      if (error) return { error };
      const templates = (data as { geo: { geoAnalysisTemplate: unknown[] } })?.geo?.geoAnalysisTemplate ?? [];
      const template = templates[0] ?? null;
      if (!template) return { error: "No matching template found." };
      return { template };
    },
  });
