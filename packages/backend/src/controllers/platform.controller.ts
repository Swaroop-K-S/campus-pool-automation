import { Request, Response } from 'express';
import { CollegeModel } from '../models';
import { asyncHandler } from '../utils/async-handler';
import webpush from 'web-push';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.model';
import { RoleEnum } from '@campuspool/shared';

// GET /api/v1/platform/colleges
export const getColleges = asyncHandler(async (req: Request, res: Response) => {
  const colleges = await CollegeModel.find().sort({ createdAt: -1 });
  
  res.status(200).json({ success: true, data: colleges });
});

// POST /api/v1/platform/colleges
export const createCollege = asyncHandler(async (req: Request, res: Response) => {
  const { name, address, adminEmail, adminPassword } = req.body;

  // Generate VAPID keys
  const vapidKeys = webpush.generateVAPIDKeys();

  const college = await CollegeModel.create({
    name,
    address,
    config: {
      theme: { primaryColor: '#4f46e5', logoUrl: '' },
      vapidKeys: {
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey
      }
    },
    status: 'active'
  });

  // Create initial admin user for this college
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await UserModel.create({
    email: adminEmail,
    password: hashedPassword,
    role: RoleEnum.enum.college_admin,
    collegeId: college._id,
    profile: {
      firstName: 'Admin',
      lastName: name,
      phone: ''
    }
  });

  res.status(201).json({ success: true, data: college });
});
