/**
 * CampusPool — Full Drive Seed Script
 * ====================================
 * Seeds 9 placement drives for the 2028 Engineering Batch,
 * spread across Aug 2025 – Apr 2026, with realistic student
 * applications. Includes 3 completed drives.
 *
 * Run: npx tsx scripts/seed-drives.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { randomBytes } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campuspool';

// ─────────────────── Helpers ───────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randFloat = (min: number, max: number, decimals = 1) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const genDriveStudentId = (prefix: string, n: number) =>
  `${prefix}${String(n).padStart(4, '0')}`;

const genRefNumber = (n: number) =>
  `CP-2025-${String(n).padStart(5, '0')}`;

const genFormToken = () => randomBytes(12).toString('hex');

// ─────────────────── Student Data ───────────────────

const BRANCHES = ['CSE', 'ISE', 'ECE', 'ME', 'CV', 'EEE', 'MBA', 'MCA', 'AIML', 'DS'];
const CITIES = ['Bengaluru', 'Hyderabad', 'Mumbai', 'Pune', 'Chennai'];

const FIRST_NAMES = [
  'Aarav','Aditya','Akash','Ananya','Anjali','Arjun','Aryan','Bhavna',
  'Chirag','Deepika','Divya','Farhan','Gaurav','Harini','Ishaan','Jaya',
  'Kabir','Karan','Kavya','Keerthi','Krish','Lakshmi','Manoj','Meera',
  'Mihir','Nandini','Nikhil','Nitin','Pooja','Pradeep','Prajwal','Priya',
  'Rahul','Raj','Ranjini','Rekha','Rohit','Roshan','Ruchika','Sachin',
  'Sahana','Sakshi','Sandeep','Sanjana','Siddharth','Sneha','Soumya',
  'Suresh','Tanvi','Tejas','Uday','Varun','Vidya','Vikram','Vinay','Yash',
  'Yashaswi','Zara','Dhruv','Esha','Faisal','Gayatri','Hitesh','Indu',
  'Jagadeesh','Kalyani','Lalitha','Madhan','Naga','Omkar','Pavan','Qazi',
];

const LAST_NAMES = [
  'Sharma','Patel','Reddy','Kumar','Singh','Rao','Joshi','Nair','Iyer',
  'Menon','Hegde','Gowda','Shetty','Kamath','Acharya','Bhat','Desai',
  'Pillai','Iyengar','Krishnan','Rajan','Subramanian','Naidu','Chandra',
  'Verma','Gupta','Mehta','Shah','Jain','Choudhury','Das','Banerjee',
  'Chatterjee','Sen','Ghosh','Roy','Bose','Dutta','Malhotra','Kapoor',
];

// ─────────── Generate 80 Unique Students (2028 Engineering Batch) ─────────

let studentCounter = 1;

function generateStudent(index: number) {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const branch = pick(BRANCHES);
  const usn = `1RV21${branch.padEnd(3,'X').substring(0,3)}${String(index).padStart(3,'0')}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@rvce.edu.in`;
  const cgpa = randFloat(6.0, 9.8);
  const phone = `9${randInt(600000000, 999999999)}`;
  const tenth = randInt(72, 97);
  const twelfth = randInt(68, 95);
  const city = pick(CITIES);
  const linkedin = `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}${index}`;
  const github = `https://github.com/${firstName.toLowerCase()}${index}`;

  return {
    fullName: `${firstName} ${lastName}`,
    email,
    usn,
    phone,
    branch,
    cgpa: cgpa.toString(),
    tenthPercentage: tenth.toString(),
    twelfthPercentage: twelfth.toString(),
    currentCity: city,
    linkedIn: linkedin,
    github,
    graduationYear: '2028',
  };
}

const ALL_STUDENTS = Array.from({ length: 80 }, (_, i) => generateStudent(i + 1));

// ─────────────────── Drive Definitions ───────────────────

interface DriveDef {
  companyName: string;
  jobRole: string;
  ctc: string;
  locations: string[];
  tags: string[];
  eventDate: Date;
  rounds: { type: string; label: string; order: number; isCustom: boolean }[];
  minCGPA: number;
  branches: string[];
  status: 'active' | 'completed' | 'event_day';
  formStatus: 'open' | 'closed';
  studentCount: number;
  // For completed drives — how many % actually selected
  selectionRate?: number;
}

const DRIVES: DriveDef[] = [
  // ─── Completed Drives (Aug–Sep 2025) ───
  {
    companyName: 'Infosys',
    jobRole: 'Systems Engineer',
    ctc: '3.6 LPA',
    locations: ['Bengaluru', 'Pune', 'Hyderabad'],
    tags: ['Mass Recruiter', 'Service Based'],
    eventDate: new Date('2025-08-15'),
    rounds: [
      { type: 'ppt', label: 'Company Presentation', order: 1, isCustom: false },
      { type: 'aptitude', label: 'Aptitude Test', order: 2, isCustom: false },
      { type: 'hr_interview', label: 'HR Interview', order: 3, isCustom: false },
    ],
    minCGPA: 6.5,
    branches: ['CSE', 'ISE', 'ECE', 'ME', 'EEE', 'AIML', 'DS'],
    status: 'completed',
    formStatus: 'closed',
    studentCount: 45,
    selectionRate: 0.55,
  },
  {
    companyName: 'Wipro',
    jobRole: 'Project Engineer',
    ctc: '3.5 LPA',
    locations: ['Bengaluru', 'Chennai', 'Mumbai'],
    tags: ['Mass Recruiter'],
    eventDate: new Date('2025-09-05'),
    rounds: [
      { type: 'aptitude', label: 'Online Test', order: 1, isCustom: false },
      { type: 'technical_interview', label: 'Technical Interview', order: 2, isCustom: false },
      { type: 'hr_interview', label: 'HR Interview', order: 3, isCustom: false },
    ],
    minCGPA: 6.0,
    branches: ['CSE', 'ISE', 'ECE', 'ME', 'EEE', 'MCA'],
    status: 'completed',
    formStatus: 'closed',
    studentCount: 40,
    selectionRate: 0.45,
  },
  {
    companyName: 'Accenture',
    jobRole: 'Associate Software Engineer',
    ctc: '4.5 LPA',
    locations: ['Bengaluru', 'Hyderabad'],
    tags: ['Mass Recruiter', 'Consulting'],
    eventDate: new Date('2025-09-22'),
    rounds: [
      { type: 'aptitude', label: 'Accenture Online Test', order: 1, isCustom: false },
      { type: 'coding', label: 'Coding Assessment', order: 2, isCustom: false },
      { type: 'hr_interview', label: 'HR Interview', order: 3, isCustom: false },
    ],
    minCGPA: 6.5,
    branches: ['CSE', 'ISE', 'AIML', 'DS', 'MCA'],
    status: 'completed',
    formStatus: 'closed',
    studentCount: 38,
    selectionRate: 0.42,
  },
  // ─── Active Drives (Oct 2025 – Apr 2026) ───
  {
    companyName: 'TCS',
    jobRole: 'Software Engineer',
    ctc: '4.0 LPA',
    locations: ['Bengaluru', 'Mumbai', 'Noida', 'Pune'],
    tags: ['Mass Recruiter', 'Product'],
    eventDate: new Date('2025-10-10'),
    rounds: [
      { type: 'ppt', label: 'Company PPT', order: 1, isCustom: false },
      { type: 'aptitude', label: 'TCS NQT', order: 2, isCustom: false },
      { type: 'hr_interview', label: 'HR Interview', order: 3, isCustom: false },
    ],
    minCGPA: 6.0,
    branches: ['CSE', 'ISE', 'ECE', 'ME', 'EEE', 'MCA', 'AIML', 'DS'],
    status: 'active',
    formStatus: 'open',
    studentCount: 50,
  },
  {
    companyName: 'Cognizant',
    jobRole: 'Programmer Analyst',
    ctc: '4.0 LPA',
    locations: ['Bengaluru', 'Chennai', 'Pune'],
    tags: ['Mass Recruiter'],
    eventDate: new Date('2025-11-14'),
    rounds: [
      { type: 'aptitude', label: 'GenC Assessment', order: 1, isCustom: false },
      { type: 'technical_interview', label: 'Technical Interview', order: 2, isCustom: false },
      { type: 'hr_interview', label: 'HR Interview', order: 3, isCustom: false },
    ],
    minCGPA: 6.0,
    branches: ['CSE', 'ISE', 'ECE', 'AIML', 'DS', 'MCA'],
    status: 'active',
    formStatus: 'open',
    studentCount: 42,
  },
  {
    companyName: 'Capgemini',
    jobRole: 'Analyst',
    ctc: '4.25 LPA',
    locations: ['Bengaluru', 'Hyderabad', 'Mumbai'],
    tags: ['Consulting'],
    eventDate: new Date('2025-12-08'),
    rounds: [
      { type: 'aptitude', label: 'Capgemini Test', order: 1, isCustom: false },
      { type: 'gd', label: 'Group Discussion', order: 2, isCustom: false },
      { type: 'hr_interview', label: 'HR Interview', order: 3, isCustom: false },
    ],
    minCGPA: 6.5,
    branches: ['CSE', 'ISE', 'ECE', 'MBA', 'MCA', 'AIML'],
    status: 'active',
    formStatus: 'open',
    studentCount: 36,
  },
  {
    companyName: 'Mphasis',
    jobRole: 'Software Engineer',
    ctc: '5.5 LPA',
    locations: ['Bengaluru'],
    tags: ['Product', 'Mid Tier'],
    eventDate: new Date('2026-01-20'),
    rounds: [
      { type: 'aptitude', label: 'Online Aptitude', order: 1, isCustom: false },
      { type: 'coding', label: 'Coding Round', order: 2, isCustom: false },
      { type: 'technical_interview', label: 'Technical Interview', order: 3, isCustom: false },
      { type: 'hr_interview', label: 'HR Interview', order: 4, isCustom: false },
    ],
    minCGPA: 7.0,
    branches: ['CSE', 'ISE', 'AIML', 'DS'],
    status: 'active',
    formStatus: 'open',
    studentCount: 28,
  },
  {
    companyName: 'Oracle',
    jobRole: 'Applications Developer',
    ctc: '8.5 LPA',
    locations: ['Bengaluru', 'Hyderabad'],
    tags: ['Dream Company', 'Product'],
    eventDate: new Date('2026-02-18'),
    rounds: [
      { type: 'aptitude', label: 'Online Assessment', order: 1, isCustom: false },
      { type: 'coding', label: 'Technical Coding', order: 2, isCustom: false },
      { type: 'technical_interview', label: 'Technical Round 1', order: 3, isCustom: false },
      { type: 'hr_interview', label: 'HR Round', order: 4, isCustom: false },
    ],
    minCGPA: 7.5,
    branches: ['CSE', 'ISE', 'AIML', 'DS'],
    status: 'active',
    formStatus: 'open',
    studentCount: 22,
  },
  {
    companyName: 'Siemens',
    jobRole: 'Jr. Software Developer',
    ctc: '7.0 LPA',
    locations: ['Bengaluru', 'Pune'],
    tags: ['Core', 'Dream Company'],
    eventDate: new Date('2026-04-05'),
    rounds: [
      { type: 'aptitude', label: 'Technical Screening', order: 1, isCustom: false },
      { type: 'technical_interview', label: 'Panel Interview', order: 2, isCustom: false },
      { type: 'hr_interview', label: 'HR Discussion', order: 3, isCustom: false },
    ],
    minCGPA: 7.0,
    branches: ['CSE', 'ISE', 'ECE', 'EEE', 'ME'],
    status: 'active',
    formStatus: 'open',
    studentCount: 24,
  },
];

// ─────────────────── Main Seed ───────────────────

async function seed() {
  console.log('🌱 Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db!;

  // 1. Find college
  const college = await db.collection('colleges').findOne({});
  if (!college) {
    console.error('❌ No college found. Run the base seed first (npm run seed) or ensure a college document exists.');
    process.exit(1);
  }
  console.log(`✅ College: ${college.name || college._id}`);

  // 2. Find admin user
  const adminUser = await db.collection('users').findOne({ collegeId: college._id });
  if (!adminUser) {
    console.error('❌ No admin user found for this college.');
    process.exit(1);
  }
  console.log(`✅ Admin: ${adminUser.email}`);

  // 3. Wipe existing drives + applications (clean slate for demo data)
  const existingDrives = await db.collection('drives').countDocuments({ collegeId: college._id });
  if (existingDrives > 0) {
    console.log(`\n⚠️  Found ${existingDrives} existing drives. Clearing for clean seed…`);
    const driveIds = await db.collection('drives')
      .find({ collegeId: college._id }, { projection: { _id: 1 } })
      .toArray();
    const ids = driveIds.map((d: any) => d._id);
    await db.collection('applications').deleteMany({ driveId: { $in: ids } });
    await db.collection('drives').deleteMany({ collegeId: college._id });
    console.log('   Cleared existing drives and applications.\n');
  }

  let totalApps = 0;
  let refCounter = 1;

  for (const def of DRIVES) {
    console.log(`\n📋 Creating drive: ${def.companyName} — ${def.jobRole}`);

    // Filter eligible students for this drive
    const eligible = ALL_STUDENTS.filter(s =>
      def.branches.includes(s.branch) && parseFloat(s.cgpa) >= def.minCGPA
    );

    // Pick a subset
    const shuffled = eligible.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(def.studentCount, shuffled.length));

    // Determine round statuses for completed drives
    const rounds = def.rounds.map(r => ({
      ...r,
      status: def.status === 'completed' ? 'completed' : 'pending',
    }));

    // Create the drive document
    const driveDoc = {
      collegeId: college._id,
      companyName: def.companyName,
      jobRole: def.jobRole,
      ctc: def.ctc,
      locations: def.locations,
      tags: def.tags,
      status: def.status,
      formStatus: def.formStatus,
      formToken: genFormToken(),
      eventDate: def.eventDate,
      reportTime: '09:00',
      venueDetails: { hallName: 'Main Seminar Hall', capacity: 300 },
      eligibilityCriteria: {
        minCgpa: def.minCGPA,
        allowedBranches: def.branches,
      },
      rounds,
      createdAt: new Date(def.eventDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: def.eventDate,
    };

    const driveResult = await db.collection('drives').insertOne(driveDoc);
    const driveId = driveResult.insertedId;
    console.log(`   Drive created: ${driveId} | ${selected.length} students`);

    // Build applications
    const prefix = def.companyName.substring(0, 3).toUpperCase();
    const apps = selected.map((student, i) => {
      const appRefNum = genRefNumber(refCounter++);
      const driveStudentId = genDriveStudentId(prefix, i + 1);

      // Determine status based on drive status
      let appStatus = 'shortlisted'; // they've been shortlisted/invited
      if (def.status === 'completed' && def.selectionRate !== undefined) {
        const isSelected = i < Math.floor(selected.length * def.selectionRate);
        appStatus = isSelected ? 'selected' : 'rejected';
      }

      return {
        referenceNumber: appRefNum,
        driveStudentId,
        driveId,
        collegeId: college._id,
        status: appStatus,
        currentRound: def.status === 'completed' ? 'completed' : null,
        attendedAt: def.status === 'completed' ? def.eventDate : null,
        submittedAt: new Date(def.eventDate.getTime() - 20 * 24 * 60 * 60 * 1000),
        data: {
          fullName: student.fullName,
          email: `${student.email.replace('@rvce.edu.in', '')}+${prefix.toLowerCase()}@rvce.edu.in`,
          usn: student.usn,
          phone: student.phone,
          branch: student.branch,
          cgpa: student.cgpa,
          tenthPercentage: student.tenthPercentage,
          twelfthPercentage: student.twelfthPercentage,
          currentCity: student.currentCity,
          linkedIn: student.linkedIn,
          github: student.github,
          graduationYear: student.graduationYear,
        },
        createdAt: new Date(def.eventDate.getTime() - 20 * 24 * 60 * 60 * 1000),
        updatedAt: def.eventDate,
      };
    });

    if (apps.length > 0) {
      await db.collection('applications').insertMany(apps);
      const selectedCount = apps.filter(a => a.status === 'selected').length;
      const rejectedCount = apps.filter(a => a.status === 'rejected').length;
      const shortlistedCount = apps.filter(a => a.status === 'shortlisted').length;
      console.log(`   Applications inserted: ${apps.length} | Selected: ${selectedCount} | Rejected: ${rejectedCount} | Shortlisted: ${shortlistedCount}`);
      totalApps += apps.length;
    }
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`✅ Seeding complete!`);
  console.log(`   • Drives created : ${DRIVES.length}`);
  console.log(`   • Completed      : ${DRIVES.filter(d => d.status === 'completed').length}`);
  console.log(`   • Active         : ${DRIVES.filter(d => d.status === 'active').length}`);
  console.log(`   • Total apps     : ${totalApps}`);
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
