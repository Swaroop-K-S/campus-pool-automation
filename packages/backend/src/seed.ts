import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { env } from './config/env';
import { UserModel, CollegeModel } from './models';

async function seed() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to DB');

  // Clear existing
  await CollegeModel.deleteMany({});
  await UserModel.deleteMany({});

  // Create default college
  const college = await CollegeModel.create({
    name: 'Demo College of Engineering',
    address: 'Bangalore, Karnataka - 560001',
    isActive: true
  });
  console.log('✅ College created:', college.name);

  // Create single admin user
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const admin = await UserModel.create({
    name: 'Admin',
    email: 'admin@campuspool.in',
    passwordHash,
    role: 'admin',
    collegeId: college._id,
    isActive: true
  });
  console.log('✅ Admin created:', admin.email);
  console.log('✅ Password: Admin@123');
  console.log('🚀 Seed complete!');

  await mongoose.disconnect();
}

seed().catch(console.error);
