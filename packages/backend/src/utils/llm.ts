import { env } from '../config/env';

/**
 * llmInvoke
 *
 * Unified LLM gateway. Routing priority:
 *
 *   1. LOCAL_AI_URL is set → Ollama /api/generate (on-premise, privacy-compliant)
 *   2. Fallback            → Deterministic stub (dev / no-cloud mode)
 *
 * Cloud vendors (OpenAI / Anthropic) can be inserted in slot 2 before the stub
 * by checking for OPENAI_API_KEY / ANTHROPIC_API_KEY env vars if needed in future.
 *
 * @param prompt  Full prompt string (system + user content combined)
 * @param signal  Optional AbortSignal so callers can enforce their own timeout
 */
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

/**
 * Calls the Ollama /api/generate endpoint in non-streaming mode.
 * Handles two expected failure modes gracefully:
 *   - 503 / ECONNREFUSED → model still loading → caller should retry via BullMQ
 *   - Partial / invalid JSON in response → throws ParseError → BullMQ retry
 */
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
        stream: false,          // wait for the complete response, not SSE chunks
        options: {
          temperature: 0.1,     // low temp = deterministic, schema-compliant JSON
          num_predict: 1024,    // hard cap on tokens — resumes are small
        },
      }),
    });
  } catch (fetchError: any) {
    // ECONNREFUSED / timeout while Ollama is still loading the model into VRAM
    const msg = fetchError?.message ?? String(fetchError);
    throw new OllamaUnavailableError(
      `Ollama connection failed (model may still be loading): ${msg}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 503 || response.status === 502) {
      // Retryable — model not warm yet
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

  // Strip any accidental markdown fences the model inserted despite instructions
  return stripMarkdownFences(json.response);
}

/** Removes ```json ... ``` or ``` ... ``` wrappers a model occasionally adds */
function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

/** Sentinel error class — BullMQ can inspect the name to decide retry strategy */
export class OllamaUnavailableError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'OllamaUnavailableError';
  }
}

// ─── Deterministic stub (no cloud, no Docker) ────────────────────────────────

async function invokeStub(prompt: string): Promise<string> {
  // Simulate realistic inference latency
  await new Promise((r) => setTimeout(r, 500));

  // Simulate occasional model hallucination to test BullMQ retry path (5% chance)
  if (Math.random() > 0.95) {
    throw new Error('LLM Stub: simulated hallucination/timeout for resilience testing');
  }

  if (prompt.includes('career mentor') || prompt.includes('Improvement Plan')) {
    return JSON.stringify({
      strengths:          ['Strong problem-solving methodology', 'Clear communication of complex ideas'],
      criticalWeakness:   'Requires deeper optimization knowledge for large-scale systemic design',
      actionableNextSteps: [
        'Review advanced caching patterns (Redis/Memcached)',
        'Practice highly scalable system design questions',
        'Engage more confidently when explaining trade-offs',
      ],
    });
  }

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

  // Fallback (e.g. Room Assignment Match Score)
  return JSON.stringify({ matchReason: 'Strong candidate matching role requirements.', matchScore: 90 });
}
