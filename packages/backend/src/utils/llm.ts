import { env } from '../config/env';

const JD_SYSTEM_PROMPT = `You are a highly precise Data Extraction API built for an enterprise Campus Placement system.
Your only purpose is to analyse Job Description (JD) text and extract the required fields into a strict, minified JSON object.

SCHEMA:
{
  "companyName": "string",
  "role": "string",
  "ctc": "string (e.g. '12 LPA'. If not found output 'Not Disclosed')",
  "cutoffCgpa": "number (e.g. 7.5. If not found output 0)",
  "allowedBranches": ["string (standardised abbreviations e.g. CSE, ISE, ECE, ME, CV, EEE)"],
  "requiredSkills": ["string (3-5 core technical skills)"],
  "location": "string (If not found output 'Pan India')"
}

STRICT RULES:
1. Output ONLY valid parseable JSON — no markdown fences, no preamble, no explanations.
2. If a field cannot be found use the default fallback values specified above.
3. Standardise branch names: 'Computer Science' → 'CSE', 'Electronics' → 'ECE', etc.`;

export async function llmInvoke(prompt: string, signal?: AbortSignal): Promise<string> {
  // ── Route 1: Local Ollama ──────────────────────────────────────────────────
  if (env.LOCAL_AI_URL) {
    return invokeOllama(env.LOCAL_AI_URL, prompt, signal);
  }

  // ── Route 2: Deterministic stub (development / CI) ─────────────────────────
  return invokeStub(prompt);
}

/**
 * JD-specific extraction — uses format:'json' to force Ollama's output into
 * valid JSON token space, making hallucinations structurally impossible.
 */
export async function llmInvokeJD(jdText: string, signal?: AbortSignal): Promise<string> {
  if (env.LOCAL_AI_URL) {
    return invokeOllamaJD(env.LOCAL_AI_URL, jdText, signal);
  }
  // Stub for local dev without Ollama
  return JSON.stringify({
    companyName: 'Demo Corp',
    role: 'Software Engineer',
    ctc: '12 LPA',
    cutoffCgpa: 7.0,
    allowedBranches: ['CSE', 'ISE'],
    requiredSkills: ['React', 'Node.js', 'MongoDB'],
    location: 'Bangalore',
  });
}

/**
 * Generate semantic embeddings for a given text.
 */
export async function llmEmbed(text: string, signal?: AbortSignal): Promise<number[]> {
  if (!env.LOCAL_AI_URL) {
    // Return a dummy 768-d vector for development
    return Array(768)
      .fill(0)
      .map(() => Math.random() - 0.5);
  }

  const baseUrl = env.LOCAL_AI_URL.replace('/api/generate', '');
  const url = `${baseUrl}/api/embeddings`;
  const MODEL = 'nomic-embed-text';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: MODEL,
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.status}`);
  }

  const json = (await response.json()) as { embedding: number[] };
  return json.embedding;
}

// ─── Ollama implementation ────────────────────────────────────────────────────
async function invokeOllama(url: string, prompt: string, signal?: AbortSignal): Promise<string> {
  const MODEL = 'gemma2:2b'; // must match the model pulled in docker-compose entrypoint

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.1, // low temp = deterministic, schema-compliant JSON
          num_predict: 1024, // hard cap on tokens
        },
      }),
    });
  } catch (fetchError: any) {
    const msg = fetchError?.message ?? String(fetchError);
    throw new OllamaUnavailableError(
      `Ollama connection failed (model may still be loading): ${msg}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 503 || response.status === 502) {
      throw new OllamaUnavailableError(
        `Ollama returned ${response.status} — model is not ready yet. BullMQ will retry.`,
      );
    }
    throw new Error(`Ollama error ${response.status}: ${body}`);
  }

  const json = (await response.json()) as { response: string; done: boolean };

  if (!json.response) {
    throw new Error('Ollama returned an empty response field.');
  }

  return stripMarkdownFences(json.response);
}

function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

// ─── JD-specific Ollama call (format:json constrained decoding) ───────────────
async function invokeOllamaJD(url: string, jdText: string, signal?: AbortSignal): Promise<string> {
  const MODEL = 'gemma2:2b';
  const combinedPrompt = `${JD_SYSTEM_PROMPT}\n\nExtract the details from this Job Description:\n---\n${jdText}\n---\n\nReturn ONLY the JSON object.`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: MODEL,
        prompt: combinedPrompt,
        stream: false,
        format: 'json', // ← constrained decoding: structurally impossible to output non-JSON
        options: {
          temperature: 0.1,
          num_predict: 512, // JD fields are compact — 512 tokens is more than enough
        },
      }),
    });
  } catch (fetchError: any) {
    throw new OllamaUnavailableError(
      `Ollama JD connection failed: ${fetchError?.message ?? fetchError}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Ollama JD error ${response.status}: ${body}`);
  }

  const json = (await response.json()) as { response: string; done: boolean };
  if (!json.response) throw new Error('Ollama JD returned empty response');

  return stripMarkdownFences(json.response);
}

export class OllamaUnavailableError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'OllamaUnavailableError';
  }
}

// ─── Deterministic stub (no cloud, no Docker) ────────────────────────────────
async function invokeStub(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 500));

  if (prompt.includes('HR ATS Parser')) {
    return JSON.stringify({
      skills: ['React', 'TypeScript', 'Node.js', 'Docker', 'Mongoose'],
      education: [
        { degree: 'B.Tech in Computer Science', institution: 'PES University', year: '2026' },
      ],
      projects: [
        {
          title: 'Real-time Operations Dashboard',
          techStack: ['React', 'Redis', 'Socket.io'],
          description:
            'Engineered a low-latency WebSocket queue for large-scale operations under load.',
        },
      ],
    });
  }

  return JSON.stringify({
    matchReason: 'Strong candidate matching role requirements.',
    matchScore: 90,
  });
}
