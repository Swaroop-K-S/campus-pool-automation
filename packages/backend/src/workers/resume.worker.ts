import { Queue, Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis';
import { StudentProfileModel } from '../models/student-profile.model';
import { llmInvoke } from '../utils/llm';

export const resumeParsingQueue = new Queue('resumeParsingQueue', { connection: redisClient });

export const resumeParsingWorker = new Worker('resumeParsingQueue', async (job: Job) => {
  const { usn, rawText } = job.data;
  console.log(`[Resume Worker] Commencing NLP extraction for USN: ${usn}`);

  try {
    const profile = await StudentProfileModel.findOne({ usn });
    if (!profile) throw new Error('Student Profile missing constraint.');

    // Pre-flight setup: Ensure it's marked as pending
    await StudentProfileModel.findByIdAndUpdate(profile._id, { parsingStatus: 'pending' });

    // AI Prompt Construction
    const prompt = `
      You are an expert HR ATS Parser. Extract the meaningful candidate profile strictly conforming to the following JSON schema:
      {
        "skills": ["string"],
        "education": [{ "degree": "string", "institution": "string", "year": "string" }],
        "projects": [{ "title": "string", "techStack": ["string"], "description": "string" }]
      }
      Aggressively normalize tech stacks (e.g. React.js to React).
      Do NOT include any markdown blocks. Return only parseable JSON.

      Raw Resume Text:
      ${rawText}
    `;

    // Strict 15-second Circuit Breaker
    const timeoutPromise = new Promise<string>((_, reject) => 
      setTimeout(() => reject(new Error('LLM Timeout: ATS Extraction Circuit Breaker Triggered')), 15000)
    );

    const responseText = await Promise.race([
      llmInvoke(prompt),
      timeoutPromise
    ]);

    const parsedData = JSON.parse(responseText);

    await StudentProfileModel.findByIdAndUpdate(profile._id, {
      $set: {
        parsingStatus: 'completed',
        parsedResume: {
          skills: parsedData.skills || [],
          education: parsedData.education || [],
          projects: parsedData.projects || []
        }
      }
    });

    console.log(`[Resume Worker] Successfully normalized and saved JSON for ${usn}`);
    return { success: true };

  } catch (error) {
    console.error(`[Resume Worker] Parsing critical failure for ${usn}:`, error);
    // Mark as failed so UI triggers the PDF fallback gracefully
    await StudentProfileModel.findOneAndUpdate({ usn }, { $set: { parsingStatus: 'failed' } });
    throw error;
  }
}, { connection: redisClient });

export async function enqueueResumeParsing(usn: string, rawText: string) {
  return await resumeParsingQueue.add('extract-json-from-resume', { usn, rawText }, {
    removeOnComplete: true,
    removeOnFail: false
  });
}
