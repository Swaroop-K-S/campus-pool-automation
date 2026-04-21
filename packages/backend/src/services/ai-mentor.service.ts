import { Queue, Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis';
import { ApplicationModel, EvaluationModel, StudentProfileModel, DriveModel } from '../models';
import { llmInvoke } from '../utils/llm';
import mongoose from 'mongoose';

export const aiMentorQueue = new Queue('aiMentorQueue', { connection: redisClient });

/**
 * Worker that processes rubric data into high-fidelity AI improvement plans.
 */
export const aiMentorWorker = new Worker('aiMentorQueue', async (job: Job) => {
  const { driveId, collegeId } = job.data;
  console.log(`[AI Mentor Worker] Starting plan generation for Drive ${driveId}`);

  // 1. Fetch all student applications for this drive
  const applications = await ApplicationModel.find({ driveId }).populate('driveId', 'companyName').lean();

  let processedCount = 0;
  for (const app of applications) {
    try {
      // 2. Fetch all raw evaluation scores + comments for this student's application
      const evaluations = await EvaluationModel.find({ applicationId: app._id }).lean();
      
      if (!evaluations || evaluations.length === 0) {
        continue; // Skip if they didn't have any evaluations
      }

      const emailRaw = (app.data as any)?.email || (app.data as any)?.email_id || (app.data as any)?.['e-mail'];
      const usnRaw = (app.data as any)?.usn;
      
      if (!usnRaw || !emailRaw) continue;

      const usn = usnRaw.toUpperCase();
      const email = emailRaw.toLowerCase();

      // Find the profile to attach to
      const profile = await StudentProfileModel.findOne({ usn, email }).lean();
      if (!profile) continue;

      // 3. Construct heavily constrained prompt
      const prompt = `
        You are a highly empathetic but incredibly sharp career mentor. 
        Analyze this raw interview feedback for a student. 
        Raw Feedback Data: ${JSON.stringify(evaluations)}

        Output a strict JSON object with exactly three fields: 
        {"strengths": ["string", "string"], "criticalWeakness": "string", "actionableNextSteps": ["string", "string"]}
        Do NOT wrap in markdown \`\`\` blocks, return raw parsable stringified JSON only.
      `;

      // 4. Circuit Breaker (10-second timeout)
      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('LLM Timeout: Circuit Breaker Triggered')), 10000)
      );

      // 5. Invoke LLM with race
      const responseText = await Promise.race([
        llmInvoke(prompt),
        timeoutPromise
      ]);

      const parsedJSON = JSON.parse(responseText);

      // 6. Save back to StudentProfile
      await StudentProfileModel.findByIdAndUpdate(profile._id, {
        $set: {
          improvementPlan: {
            strengths: parsedJSON.strengths || [],
            criticalWeakness: parsedJSON.criticalWeakness || "Minor improvements needed in technical fluency.",
            actionableNextSteps: parsedJSON.actionableNextSteps || [],
            generatedAt: new Date(),
            driveId: new mongoose.Types.ObjectId(driveId)
          }
        }
      });

      processedCount++;
      job.updateProgress(Math.floor((processedCount / applications.length) * 100));
    } catch (err) {
      console.error(`[AI Mentor Worker] Failed to process application ${app._id}:`, err);
      // We log but continue the loop so one hallucinated error doesn't break the whole batch
      continue;
    }
  }

  console.log(`[AI Mentor Worker] Completed generation. Processed ${processedCount} profiles.`);
  return { success: true, count: processedCount };
}, { connection: redisClient });

export async function enqueueAIMentorJob(driveId: string, collegeId: string) {
  return await aiMentorQueue.add('generate-improvement-plan', { driveId, collegeId }, {
    removeOnComplete: true,
    removeOnFail: false
  });
}
