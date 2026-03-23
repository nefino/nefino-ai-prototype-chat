import { tool } from "ai";
import { z } from "zod";
import { graphqlFetch } from "./graphql-client";

const GET_PROJECT_QUERY = `
  query GetProjectForAnalysis($id: ID!) {
    projects {
      project(id: $id) {
        id
        name
        status
        projectKind
        areaSize
        capacity
        areaGeometry
        places {
          placeId
          placeName
          level
        }
        latestNewsItems {
          id
          date
          description
          summary
          newsTopics
          href
        }
      }
    }
  }
`;

type GetProjectProps = {
  jwtCookie: string | undefined;
};

export const getProject = ({ jwtCookie }: GetProjectProps) =>
  tool({
    description:
      "Fetch a project's details including name, energy kind, area geometry, places, and latest news items. " +
      "Use this as the first step in a project analysis.",
    inputSchema: z.object({
      projectId: z.string().describe("The project ID to fetch"),
    }),
    execute: async ({ projectId }) => {
      if (!jwtCookie) {
        return { error: "Not authenticated: no JWT cookie found." };
      }
      const { data, error } = await graphqlFetch({
        query: GET_PROJECT_QUERY,
        variables: { id: projectId },
        jwtCookie,
      });
      if (error) return { error };
      return (data as { projects: { project: unknown } })?.projects?.project ?? { error: "Project not found" };
    },
  });
