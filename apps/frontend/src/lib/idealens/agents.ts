import type {
  ConceptSketchOutput,
  ResearchOutput,
} from "./types";

function extractJson<T>(text: string): T {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object in model output");
  }
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

async function anthropicJson(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key || key.startsWith("stub")) {
    throw new Error("ANTHROPIC_API_KEY is not set (or is a stub) in root .env");
  }
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const block = data.content?.find((b) => b.type === "text");
  const text = block?.text ?? "";
  if (!text) throw new Error("Empty Anthropic response");
  return text;
}

async function geminiJson(system: string, user: string): Promise<string> {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    "";
  if (!key || key.startsWith("stub")) {
    throw new Error("GEMINI_API_KEY is not set (or is a stub) in root .env");
  }
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "";
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

async function completeJson(system: string, user: string): Promise<string> {
  const useAnthropic = Boolean(
    process.env.ANTHROPIC_API_KEY?.trim() &&
      !process.env.ANTHROPIC_API_KEY.startsWith("stub"),
  );
  if (useAnthropic) return anthropicJson(system, user);
  return geminiJson(system, user);
}

const RESEARCH_SYSTEM = `You are a senior UX researcher. Be skeptical and behavior-focused.
Respond with ONLY a single JSON object (no markdown) with this exact shape:
{
  "assumptions": [{"text": string, "confidence": "known"|"guessing"|"unknown"}],
  "open_questions": string[],
  "risk_flags": string[]
}
Use 3–8 assumptions.`;

export async function runResearcher(idea: string): Promise<ResearchOutput> {
  const raw = await completeJson(
    RESEARCH_SYSTEM,
    `Product idea to stress-test:\n\n${idea}`,
  );
  return extractJson<ResearchOutput>(raw);
}

export async function runDesigner(
  idea: string,
  componentNames: string[],
): Promise<ConceptSketchOutput> {
  const lib =
    componentNames.length > 0
      ? componentNames.slice(0, 120).join(", ")
      : "(no components)";
  const system = `You are a senior UX designer. Propose ONE pragmatic product concept.
You MUST only reference UI components from this exact list (subset is fine): ${lib}
Respond with ONLY a single JSON object (no markdown) with this exact shape:
{
  "concept_name": string,
  "primary_surface": string,
  "components_used": string[],
  "user_flow": string[],
  "key_interactions": string[],
  "open_design_questions": string[]
}
Every name in components_used must appear in the allowed list.`;

  const raw = await completeJson(
    system,
    `Product idea:\n\n${idea}\n\nGround the concept in the listed components only.`,
  );
  const out = extractJson<ConceptSketchOutput>(raw);
  const allowed = new Set(componentNames);
  out.components_used = (out.components_used ?? []).filter((c) =>
    allowed.has(c),
  );
  return out;
}
