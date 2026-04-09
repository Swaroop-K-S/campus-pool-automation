import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import * as authService from '../services/auth.service';
import { logAuditEvent } from '../services/audit.service';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const credentials = req.body;
  try {
    const { accessToken, refreshToken, user } = await authService.login(credentials);
    
    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000 }); // 15 mins
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

    await logAuditEvent({
      userId: user.userId,
      action: 'LOGIN',
      resourceType: 'User',
      resourceId: user.userId,
      ipAddress: req.ip || req.socket.remoteAddress
    });

    res.status(200).json({ success: true, data: { user } });
  } catch (error: unknown) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token is required' });
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
    
    res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(200).json({ success: true, data: { message: 'Tokens refreshed' } });
  } catch (error: unknown) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await authService.logout(req.user.userId);
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  // Return the currently authenticated user's payload
  res.status(200).json({ success: true, data: req.user });
});
