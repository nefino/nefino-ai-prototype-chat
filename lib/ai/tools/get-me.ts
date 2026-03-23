import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { graphqlFetch } from "./graphql-client";

const GET_ME_QUERY = `
  query GetMe {
    me {
      account {
        pk
        firstName
        lastName
        email
      }
    }
  }
`;

type GetMeProps = {
  session: Session;
  jwtCookie: string | undefined;
};

export const getMe = ({ session: _session, jwtCookie }: GetMeProps) =>
  tool({
    description:
      "Retrieve the currently authenticated user's profile information including their name and email.",
    inputSchema: z.object({}),
    execute: async () => {
      if (!jwtCookie) {
        return { error: "Not authenticated: no JWT cookie found." };
      }
      const { data, error } = await graphqlFetch({ query: GET_ME_QUERY, jwtCookie });
      if (error) return { error };
      return (data as { me: unknown })?.me ?? { error: "No data returned" };
    },
  });
