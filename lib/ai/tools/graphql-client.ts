const GQL_ENDPOINT = "http://localhost:8000";

export async function graphqlFetch<T = unknown>({
  query,
  variables,
  jwtCookie,
}: {
  query: string;
  variables?: Record<string, unknown>;
  jwtCookie: string | undefined;
}): Promise<{ data?: T; error?: string }> {
  // Extract operation name for readable logs
  const operationMatch = query.match(/(?:query|mutation)\s+(\w+)/);
  const operationName = operationMatch?.[1] ?? "anonymous";

  console.log(
    `[GraphQL] → ${operationName}`,
    variables ? JSON.stringify(variables) : ""
  );

  let response: Response;
  try {
    response = await fetch(GQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(jwtCookie ? { Cookie: `JWT=${jwtCookie}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[GraphQL] ✗ ${operationName}: ${message}`);
    return { error: `Failed to reach API: ${message}` };
  }

  if (!response.ok) {
    console.error(`[GraphQL] ✗ ${operationName}: HTTP ${response.status}`);
    return { error: `API returned HTTP ${response.status}` };
  }

  const json = await response.json();

  if (json.errors?.length) {
    console.error(`[GraphQL] ✗ ${operationName}:`, json.errors[0].message);
    return { error: json.errors[0].message };
  }

  console.log(`[GraphQL] ✓ ${operationName}`);
  return { data: json.data as T };
}
