import { env } from '../config/env';

export async function llmInvoke(
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  // ── Route 1: Local Ollama ──────────────────────────────────────────────────
  if (env.LOCAL_AI_URL) {
    return invokeOllama(env.LOCAL_AI_URL, prompt, signal);
  }

  // ── Route 2: Deterministic stub (development / CI) ─────────────────────────
  return invokeStub(prompt);
}

// ─── Ollama implementation ────────────────────────────────────────────────────
async function invokeOllama(
  url: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const MODEL = 'gemma2:2b'; // must match the model pulled in docker-compose entrypoint

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model:  MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,     // low temp = deterministic, schema-compliant JSON
          num_predict: 1024,    // hard cap on tokens
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

  const json = await response.json() as { response: string; done: boolean };

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
      skills:    ['React', 'TypeScript', 'Node.js', 'Docker', 'Mongoose'],
      education: [{ degree: 'B.Tech in Computer Science', institution: 'PES University', year: '2026' }],
      projects:  [{
        title:       'Real-time Operations Dashboard',
        techStack:   ['React', 'Redis', 'Socket.io'],
        description: 'Engineered a low-latency WebSocket queue for large-scale operations under load.',
      }],
    });
  }

  return JSON.stringify({ matchReason: 'Strong candidate matching role requirements.', matchScore: 90 });
}
