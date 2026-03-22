import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { UserModel } from '../models';
import { LoginRequest, RoleEnum } from '@campuspool/shared';

// For scaffold purposes, we hardcode the platform admin check
export const login = async (credentials: LoginRequest) => {
  const { email, password } = credentials;

  // Check Platform Admin default seeded account
  if (email === env.PLATFORM_ADMIN_EMAIL) {
    if (password !== env.PLATFORM_ADMIN_PASSWORD) {
      throw new Error('Invalid credentials');
    }
    
    return generateTokens({
      userId: 'platform-admin-id',
      collegeId: 'platform',
      role: RoleEnum.enum.platform_admin
    });
  }

  // Normal user lookup
  const user = await UserModel.findOne({ email, isActive: true });
  if (!user || !user.passwordHash) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const payload = {
    userId: user._id.toString(),
    collegeId: user.collegeId?.toString(),
    role: user.role,
    driveId: user.driveId?.toString(),
    roomId: user.roomId?.toString()
  };

  const tokens = generateTokens(payload);
  
  // Save refresh token to DB
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return tokens;
};

export const refresh = async (token: string) => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
    
    // In scaffold we bypass DB check for platform admin
    if (decoded.role === RoleEnum.enum.platform_admin) {
      return generateTokens({
        userId: decoded.userId,
        collegeId: decoded.collegeId,
        role: decoded.role
      });
    }

    const user = await UserModel.findOne({ _id: decoded.userId, refreshToken: token });
    if (!user) throw new Error();

    const payload = {
      userId: user._id.toString(),
      collegeId: user.collegeId?.toString(),
      role: user.role,
      driveId: user.driveId?.toString(),
      roomId: user.roomId?.toString()
    };

    const tokens = generateTokens(payload);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return tokens;
  } catch (err) {
    throw new Error('Invalid refresh token');
  }
};

export const logout = async (userId: string) => {
  if (userId !== 'platform-admin-id') {
    await UserModel.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
  }
};

const generateTokens = (payload: any) => {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY as any });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY as any });
  
  return { accessToken, refreshToken };
};
