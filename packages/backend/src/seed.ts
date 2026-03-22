import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { env } from './config/env';
import { UserModel, CollegeModel } from './models';

async function seed() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to DB');

  // Create a dummy college
  const college = await CollegeModel.create({
    name: 'Test Engineering College',
    website: 'https://testcollege.edu',
    location: 'Bangalore',
    address: '123 Tech Park, Electronic City, Bangalore 560100',
    tier: 'Tier 1'
  });
  console.log('Created College:', college._id);

  // Create a college admin user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await UserModel.create({
    email: 'admin@college.edu',
    password: hashedPassword,
    name: 'College Admin Test',
    role: 'college_admin',
    collegeId: college._id,
    isActive: true
  });
  console.log('Created User:', user.email);

  await mongoose.disconnect();
  console.log('Done');
}

seed().catch(console.error);
