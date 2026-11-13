// Minimal Gemini API client for Convex actions (default runtime, uses fetch).
// Reads GEMINI_API_KEY from the Convex deployment environment. Every call is a
// paid external request; transient errors are retried with backoff.
import {
  DECISION_MODEL,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_PREFIX,
} from "./triageConfig";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const RETRYABLE_STATUSES = new Set([429, 500, 503]);
const MAX_ATTEMPTS = 4;
const DEFAULT_RETRY_DELAY_MS = 5_000;
// Daily quotas answer with retry delays of hours; fail instead of waiting.
const MAX_RETRY_DELAY_MS = 60_000;
const REQUEST_TIMEOUT_MS = 30_000;

export type DecisionQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

export type DecisionAnswer = { choice: string; confidence: number };

export function hasGeminiApiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function embedText(text: string): Promise<number[]> {
  const json = (await callGemini(
    `models/${EMBEDDING_MODEL}:batchEmbedContents`,
    {
      requests: [
        {
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text: `${EMBEDDING_PREFIX}${text}` }] },
          output_dimensionality: EMBEDDING_DIMENSIONS,
        },
      ],
    },
  )) as { embeddings: Array<{ values: number[] }> };

  return json.embeddings[0].values;
}

/** Throws when the response lacks an answer for any asked question. */
export async function decide<Key extends string>(
  input: string,
  questions: Partial<Record<Key, DecisionQuestion>>,
): Promise<Partial<Record<Key, DecisionAnswer>>> {
  const json = (await callGemini("decisions", {
    model: DECISION_MODEL,
    input,
    questions,
  })) as { answers?: Partial<Record<Key, DecisionAnswer>> };

  for (const key of Object.keys(questions)) {
    if (!json.answers?.[key as Key]) {
      throw new Error(`Gemini decision response has no answer for "${key}".`);
    }
  }

  return json.answers ?? {};
}

async function callGemini(path: string, body: unknown): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the Convex environment.");
  }

  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${API_BASE}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.ok) {
      return await response.json();
    }

    const errorText = await response.text();
    const delay = retryDelayMs(errorText);
    const canRetry =
      RETRYABLE_STATUSES.has(response.status) &&
      attempt < MAX_ATTEMPTS &&
      delay <= MAX_RETRY_DELAY_MS;

    if (!canRetry) {
      throw new Error(
        `Gemini ${path} failed (${response.status}): ${errorText.slice(0, 500)}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

function retryDelayMs(errorText: string) {
  const match = errorText.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
  return match ? Number(match[1]) * 1000 + 1000 : DEFAULT_RETRY_DELAY_MS;
}
