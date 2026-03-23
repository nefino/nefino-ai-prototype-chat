import { tool } from "ai";
import { z } from "zod";
import { graphqlFetch } from "./graphql-client";

const RUN_GEO_ANALYSIS_MUTATION = `
  mutation StartGeoAnalysis($inputs: GeoAnalysisInput!) {
    geo {
      analysisStart(inputs: $inputs) {
        analysisId
        geoAnalysis {
          pk
          name
          status
        }
      }
    }
  }
`;

const FIXED_REQUESTS = [
  {
    clusterName: "settlement",
    layers: [{ layerName: "settlements", bufferM: [100] }],
  },
];

const FIXED_OPERATIONS: never[] = [];

type RunGeoAnalysisProps = {
  jwtCookie: string | undefined;
};

export const runGeoAnalysis = ({ jwtCookie }: RunGeoAnalysisProps) =>
  tool({
    description:
      "Start a geo analysis for a project area. " +
      "Requires the project's name and areaGeometry (GeoJSON polygon string). " +
      "After calling this, poll with getGeoAnalysisStatus until status is SUCCESS or ERROR.",
    needsApproval: true,
    inputSchema: z.object({
      name: z.string().describe("A descriptive name for this analysis, e.g. the project name"),
      areaGeometry: z
        .string()
        .describe("GeoJSON geometry string from the project's areaGeometry field"),
    }),
    execute: async ({ name, areaGeometry }) => {
      if (!jwtCookie) {
        return { error: "Not authenticated: no JWT cookie found." };
      }

      const inputs = {
        name,
        specs: {
          scope: {
            type: "POLYGON",
            polygon: areaGeometry,
          },
          requests: FIXED_REQUESTS,
          operations: FIXED_OPERATIONS,
          output: {
            templateName: "default",
            type: "GPKG",
            crs: "EPSG_25832",
          },
        },
      };

      const { data, error } = await graphqlFetch({
        query: RUN_GEO_ANALYSIS_MUTATION,
        variables: { inputs },
        jwtCookie,
      });
      if (error) return { error };
      const result = (data as { geo: { analysisStart: { analysisId: string; geoAnalysis: { name: string; status: string } } } })?.geo?.analysisStart;
      if (!result) {
        return { error: "No result returned from geoAnalysisStart" };
      }
      return {
        analysisId: result.analysisId,
        name: result.geoAnalysis?.name,
        status: result.geoAnalysis?.status,
        message: "Analysis started. Use getGeoAnalysisStatus to poll for completion.",
      };
    },
  });
