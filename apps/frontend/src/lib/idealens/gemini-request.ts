/**
 * Serialize IdeaLens Gemini HTTPS calls and retry 429/503 with backoff.
 * Helps RPM bursts and transient throttling — not exhausted daily/monthly account quotas (fix in Google Console / billing).
 */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfterSec(res: Response): number | null {
  const h = res.headers.get("retry-after");
  if (!h) return null;
  const sec = Number(h.trim());
  if (!Number.isNaN(sec)) return sec;
  const when = Date.parse(h);
  if (!Number.isNaN(when)) return Math.max(0, (when - Date.now()) / 1000);
  return null;
}

function jitter(ms: number): number {
  return ms + Math.floor(ms * (Math.random() * 0.25));
}

/** Space out Gemini HTTPS calls inside this Next.js runtime (helps RPM-style limits). */
let gateTail = Promise.resolve();
const MIN_GAP_MS = Math.max(
  0,
  Number(process.env.GEMINI_MIN_REQUEST_GAP_MS ?? 400),
);
let lastGeminiEnded = Date.now();

function withGeminiGate<T>(run: () => Promise<T>): Promise<T> {
  const next = gateTail.then(async () => {
    const elapsed = Date.now() - lastGeminiEnded;
    const waitGap = Math.max(0, MIN_GAP_MS - elapsed);
    if (waitGap > 0) await sleep(waitGap);
    try {
      return await run();
    } finally {
      lastGeminiEnded = Date.now();
    }
  });
  gateTail = next.then(() => undefined).catch(() => undefined);
  return next as Promise<T>;
}

const MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.GEMINI_FETCH_MAX_ATTEMPTS ?? 6),
);

const BACKOFF_MS = Math.max(
  250,
  Number(process.env.GEMINI_FETCH_RETRY_BASE_MS ?? 2000),
);

export async function fetchGeminiGenerateContent(
  url: string,
  body: object,
): Promise<Response> {
  return withGeminiGate(async () => {
    let lastStatus = 0;
    let lastErr = "";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) return res;

      lastStatus = res.status;
      lastErr = await res.text().catch(() => "");

      if (res.status === 429 || res.status === 503) {
        if (attempt >= MAX_ATTEMPTS - 1) break;
        const raSec = parseRetryAfterSec(res);
        const raMs =
          raSec != null && raSec >= 1 && raSec <= 900 ? raSec * 1000 : 0;
        const expBackoff = Math.min(BACKOFF_MS * 2 ** attempt, 90_000);
        await sleep(jitter(Math.max(expBackoff, raMs)));
        continue;
      }

      throw new Error(`Gemini ${res.status}: ${lastErr.slice(0, 300)}`);
    }

    throw new Error(
      `Gemini ${lastStatus} after retries: ${lastErr.slice(0, 400)}`,
    );
  });
}
