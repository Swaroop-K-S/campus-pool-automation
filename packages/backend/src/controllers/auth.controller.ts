import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import * as authService from '../services/auth.service';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const credentials = req.body;
  try {
    const tokens = await authService.login(credentials);
    res.status(200).json({ success: true, data: tokens });
  } catch (error: any) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token is required' });
  }

  try {
    const tokens = await authService.refresh(refreshToken);
    res.status(200).json({ success: true, data: tokens });
  } catch (error: any) {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await authService.logout(req.user.userId);
  }
  res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  // Return the currently authenticated user's payload
  res.status(200).json({ success: true, data: req.user });
});
