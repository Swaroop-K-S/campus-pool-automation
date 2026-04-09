import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { UserModel } from '../models';

export const login = async (credentials: { email: string; password: string }) => {
  const { email, password } = credentials;

  const user = await UserModel.findOne({ email, isActive: true });
  if (!user || !user.passwordHash) {
    throw new Error('Invalid credentials');
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new Error('Account locked due to too many failed attempts. Try again later.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // lock for 15 mins
    }
    await user.save();
    throw new Error('Invalid credentials');
  }

  // Success, reset login attempts
  if (user.failedLoginAttempts > 0 || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
  }

  const payload = {
    userId: user._id.toString(),
    collegeId: user.collegeId?.toString(),
    email: user.email,
    role: user.role
  };

  const tokens = generateTokens(payload);

  // Save refresh token to DB
  user.refreshToken = tokens.refreshToken;
  await user.save();

  return { ...tokens, user: { userId: user._id.toString(), name: user.name, email: user.email, collegeId: user.collegeId } };
};

export const refresh = async (token: string) => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;

    const user = await UserModel.findOne({ _id: decoded.userId, refreshToken: token });
    if (!user) throw new Error();

    const payload = {
      userId: user._id.toString(),
      collegeId: user.collegeId?.toString(),
      email: user.email
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
  await UserModel.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
};

const generateTokens = (payload: any) => {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY as any });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY as any });

  return { accessToken, refreshToken };
};
