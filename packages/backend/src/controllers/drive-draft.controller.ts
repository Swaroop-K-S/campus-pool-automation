import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { redisClient } from '../config/redis';

const DRAFT_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const draftKey = (userId: string) => `drive_draft:${userId}`;

// GET /api/v1/drives/draft
// Returns the saved draft state for the current admin, or null if none exists.
export const getDraft = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const raw = await redisClient.get(draftKey(userId));
  if (!raw) {
    return res.status(200).json({ success: true, data: null });
  }
  return res.status(200).json({ success: true, data: JSON.parse(raw) });
});

// POST /api/v1/drives/draft
// Upserts the full wizard form state into Redis with a 24h TTL.
// Called from the frontend on a 2s debounce — no heavy logic needed here.
export const saveDraft = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const state = req.body; // the full JSON snapshot from the frontend

  if (!state || typeof state !== 'object') {
    return res.status(400).json({ success: false, error: 'Draft state must be a JSON object.' });
  }

  await redisClient.set(draftKey(userId), JSON.stringify(state), 'EX', DRAFT_TTL_SECONDS);
  return res.status(200).json({ success: true, data: { saved: true } });
});

// DELETE /api/v1/drives/draft
// Clears the draft after successful form submission — prevents stale re-hydration.
export const deleteDraft = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  await redisClient.del(draftKey(userId));
  return res.status(200).json({ success: true, data: { cleared: true } });
});
