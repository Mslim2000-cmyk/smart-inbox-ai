// Shared client-side fetch helper for every demo AI endpoint (classify,
// summarize, reply). Centralizes the "429 means rate limited, anything else
// non-ok is a generic failure" distinction so each caller's UI can show the
// right message without re-deriving it.
export class DemoAiRateLimitedError extends Error {}

export async function postDemoAiJson<T>(
  url: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new DemoAiRateLimitedError(`Rate limited: ${url}`);
  }
  if (!res.ok) {
    throw new Error(`Request to ${url} failed with status ${res.status}`);
  }

  return res.json();
}
