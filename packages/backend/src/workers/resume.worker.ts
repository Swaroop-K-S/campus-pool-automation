import { Queue, Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis';
import { StudentProfileModel } from '../models/student-profile.model';
import { llmInvoke, OllamaUnavailableError } from '../utils/llm';

export const resumeParsingQueue = new Queue('resumeParsingQueue', { connection: redisClient });

export const resumeParsingWorker = new Worker(
  'resumeParsingQueue',
  async (job: Job) => {
    const { usn, rawText } = job.data as { usn: string; rawText: string };
    console.log(`[Resume Worker] Starting ATS extraction — USN: ${usn} | Attempt: ${job.attemptsMade + 1}`);

    const profile = await StudentProfileModel.findOne({ usn });
    if (!profile) throw new Error(`[Resume Worker] Student profile not found for USN: ${usn}`);

    await StudentProfileModel.findByIdAndUpdate(profile._id, { parsingStatus: 'pending' });

    const prompt = buildAtsPrompt(rawText);

    // ── Timeout: 45s for local model (Ollama GPU warm-up), 15s for cloud stub ──
    const TIMEOUT_MS = process.env.LOCAL_AI_URL ? 45_000 : 15_000;
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), TIMEOUT_MS);

    let responseText: string;
    try {
      responseText = await llmInvoke(prompt, abortController.signal);
    } catch (err) {
      clearTimeout(timeoutHandle);
      if (err instanceof OllamaUnavailableError) {
        console.warn(`[Resume Worker] Ollama not ready yet for ${usn}. BullMQ will retry.`);
        throw err; 
      }
      if ((err as any)?.name === 'AbortError') {
        throw new Error(`[Resume Worker] LLM timeout after ${TIMEOUT_MS}ms for USN ${usn}`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutHandle);
    }

    // ── Parse & validate the LLM response ───────────────────────────────────
    let parsedData: { skills: string[]; education: any[]; projects: any[] };
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      throw new Error(
        `[Resume Worker] LLM returned non-JSON for ${usn}. Raw: ${responseText.slice(0, 200)}`,
      );
    }

    const normalised = {
      skills:    Array.isArray(parsedData.skills)    ? parsedData.skills    : [],
      education: Array.isArray(parsedData.education) ? parsedData.education : [],
      projects:  Array.isArray(parsedData.projects)  ? parsedData.projects  : [],
    };

    await StudentProfileModel.findByIdAndUpdate(profile._id, {
      $set: {
        parsingStatus: 'completed',
        parsedResume:  normalised,
      },
    });

    console.log(`[Resume Worker] ✅ Completed ATS extraction for ${usn}`);
    return { success: true, usn };
  },
  {
    connection: redisClient,
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        const delays = [0, 10_000, 30_000, 60_000];
        return delays[Math.min(attemptsMade, delays.length - 1)];
      },
    },
  },
);

resumeParsingWorker.on('failed', async (job, err) => {
  if (!job) return;
  const { usn } = job.data as { usn: string };
  console.error(`[Resume Worker] ❌ Job permanently failed for ${usn}:`, err.message);
  await StudentProfileModel.findOneAndUpdate({ usn }, { $set: { parsingStatus: 'failed' } });
});

export async function enqueueResumeParsing(usn: string, rawText: string) {
  return resumeParsingQueue.add(
    'extract-json-from-resume',
    { usn, rawText },
    {
      attempts:      4,
      removeOnComplete: true,
      removeOnFail:  false,
      backoff: { type: 'custom' },
    },
  );
}

function buildAtsPrompt(rawText: string): string {
  return `You are an expert HR ATS (Applicant Tracking System) parser.
Your task is to extract structured information from the resume text below.

STRICT RULES:
1. Return ONLY valid JSON. No markdown, no code fences, no explanation text.
2. The JSON must follow this EXACT schema — no extra keys, no missing keys:
   {
     "skills": ["string"],
     "education": [{"degree": "string", "institution": "string", "year": "string"}],
     "projects": [{"title": "string", "techStack": ["string"], "description": "string"}]
   }
3. Normalise all tech stack names: "React.js" → "React", "NodeJS" → "Node.js", "Mongo" → "MongoDB".
4. If a field cannot be found, use an empty array [].
5. Do NOT add any text before or after the JSON object.

ONE-SHOT EXAMPLE — Given this resume snippet:
  "Priya has a B.Tech in CSE from RVCE (2024). Skills: React, Node.js, PostgreSQL.
   Project: LiveBoard — a collaborative whiteboard using WebSockets and React."

Expected output:
{
  "skills": ["React", "Node.js", "PostgreSQL"],
  "education": [{"degree": "B.Tech in Computer Science", "institution": "RVCE", "year": "2024"}],
  "projects": [{"title": "LiveBoard", "techStack": ["WebSockets", "React"], "description": "A collaborative whiteboard application built with real-time WebSocket communication."}]
}

Now parse the following resume:
---
${rawText}
---

Return ONLY the JSON object. Nothing else.`;
}
