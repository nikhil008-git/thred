export const DEFAULT_API_URL = "https://api.thred.fun";

export function apiBaseUrl(): string {
  return (process.env.THRED_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
}

export function apiKey(): string {
  const secret = process.env.THRED_API_KEY?.trim();
  if (!secret) throw new Error("THRED_API_KEY is required");
  return secret;
}

/** POSTs to the Thred API and returns the parsed JSON response. */
export async function callMcp(path: string, body: unknown): Promise<unknown> {
  const url = `${apiBaseUrl()}/api/mcp/${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey()}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // fetch hides the real reason (e.g. ECONNREFUSED) inside error.cause.
    let detail = String(error);
    const cause = error instanceof Error ? (error.cause as { code?: string; message?: string } | undefined) : undefined;
    if (cause?.message) detail = cause.code ? `${cause.code}: ${cause.message}` : cause.message;
    throw new Error(`Could not reach Thred API at ${url} (${detail})`);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage = (payload as { error?: string } | null)?.error;
    throw new Error(errorMessage || `Thred API request failed (${response.status})`);
  }

  return payload;
}
