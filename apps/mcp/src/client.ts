export const DEFAULT_API_URL = "https://api.thred.fun";

export function apiBaseUrl(): string {
  return (process.env.THRED_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
}

export function apiKey(): string {
  const secret = process.env.THRED_API_KEY?.trim();
  if (!secret) throw new Error("THRED_API_KEY is required");
  return secret;
}

export async function callMcp<T>(path: string, body: unknown): Promise<T> {
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
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause : null;
    const detail = cause ? `${"code" in cause && cause.code ? `${cause.code}: ` : ""}${cause.message}` : String(error);
    throw new Error(`Could not reach Thred API at ${url} (${detail})`);
  }

  const payload = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && payload.error
      ? payload.error
      : `Thred API request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}
