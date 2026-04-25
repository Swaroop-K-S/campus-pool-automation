/**
 * seed.ts — CampusPool Development & Load-Test Data Seeder
 *
 * Seeds a minimal but realistic dataset into MongoDB:
 *   • 1 College   (if none exists — idempotent)
 *   • 1 Admin user (if none exists — idempotent)
 *   • 1 Drive     "Build for Bengaluru Mock Drive"
 *   • 1 Room      "Room 402" attached to the Drive
 *   • 5 Applications (shortlisted students) assigned to that Room
 *
 * After seeding, the script prints the exact IDs needed for load-test.js:
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │  driveId = <ObjectId>                               │
 *   │  roomId  = <ObjectId>                               │
 *   └─────────────────────────────────────────────────────┘
 *
 * Usage (from monorepo root):
 *   npx tsx packages/backend/src/seed.ts
 *
 * Or via npm script (if added to backend/package.json):
 *   npm run seed --workspace=packages/backend
 */

import mongoose from 'mongoose';
import bcrypt   from 'bcrypt';

import { env }              from './config/env';
import { CollegeModel }     from './models/college.model';
import { UserModel }        from './models/user.model';
import { DriveModel }       from './models/drive.model';
import { RoomModel }        from './models/room.model';
import { ApplicationModel } from './models/application.model';

// ─── Helper ─────────────────────────────────────────────────────────────────

const SEED_TAG = '[SEED]'; // prefix for every log line so they're easy to grep

function log(msg: string) {
  console.log(`${SEED_TAG} ${msg}`);
}

// ─── Student fixture data ────────────────────────────────────────────────────

interface StudentFixture {
  name:   string;
  email:  string;
  usn:    string;
  branch: string;
  cgpa:   number;
  phone:  string;
}

const STUDENT_FIXTURES: StudentFixture[] = [
  { name: 'Arjun Sharma',   email: 'arjun.sharma@college.edu',   usn: '1RV21CS001', branch: 'CSE', cgpa: 8.9, phone: '9876543210' },
  { name: 'Priya Nair',     email: 'priya.nair@college.edu',     usn: '1RV21CS002', branch: 'CSE', cgpa: 9.1, phone: '9876543211' },
  { name: 'Rohan Mehta',    email: 'rohan.mehta@college.edu',    usn: '1RV21EC003', branch: 'ECE', cgpa: 8.5, phone: '9876543212' },
  { name: 'Sneha Iyer',     email: 'sneha.iyer@college.edu',     usn: '1RV21IS004', branch: 'ISE', cgpa: 9.4, phone: '9876543213' },
  { name: 'Vikram Reddy',   email: 'vikram.reddy@college.edu',   usn: '1RV21ME005', branch: 'ME',  cgpa: 8.2, phone: '9876543214' },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  // ── Connect ──────────────────────────────────────────────────────────────
  log(`Connecting to MongoDB at ${env.MONGODB_URI.replace(/:([^@]+)@/, ':****@')}…`);
  await mongoose.connect(env.MONGODB_URI);
  log('✅ Connected to MongoDB');

  // ── 1. College (idempotent — reuse if already seeded) ────────────────────
  let college: any = await CollegeModel.findOne({ name: 'Demo College of Engineering' }).lean();

  if (!college) {
    college = await CollegeModel.create({
      name:    'Demo College of Engineering',
      address: 'Bangalore, Karnataka - 560001',
      isActive: true,
    });
    log(`✅ College created: ${college.name}`);
  } else {
    log(`ℹ️  College already exists: ${college.name}`);
  }

  const collegeId = college._id as mongoose.Types.ObjectId;

  // ── 2. Admin User (idempotent) ────────────────────────────────────────────
  const existingAdmin = await UserModel.findOne({ email: 'admin@campuspool.in' });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await UserModel.create({
      name:         'Admin',
      email:        'admin@campuspool.in',
      passwordHash,
      role:         'admin',
      collegeId,
      isActive:     true,
    });
    log('✅ Admin user created: admin@campuspool.in / Admin@123');
  } else {
    log('ℹ️  Admin user already exists: admin@campuspool.in');
  }

  // ── 3. Drive — clear only SEED drives to avoid nuking real data ──────────
  await DriveModel.deleteMany({
    collegeId,
    companyName: 'Build for Bengaluru (Mock)',
  });

  const drive = await DriveModel.create({
    collegeId,
    companyName:  'Build for Bengaluru (Mock)',
    jobRole:      'Software Development Engineer',
    ctc:          '₹18 LPA',
    locations:    ['Bengaluru', 'Hyderabad'],
    status:       'active',
    eventDate:    new Date(),
    reportTime:   '09:00 AM',
    venueDetails: {
      hallName: 'Main Auditorium',
      capacity: 300,
    },
    eligibility: {
      cgpa: { minimum: 7.5, ruleType: 'strict' },
      branches: ['CSE', 'ECE', 'ISE', 'ME'],
    },
    rounds: [
      { type: 'aptitude',   label: 'Aptitude Test',   order: 1, status: 'active',  isCustom: false },
      { type: 'technical',  label: 'Technical Round',  order: 2, status: 'pending', isCustom: false },
      { type: 'hr',         label: 'HR Interview',     order: 3, status: 'pending', isCustom: false },
    ],
    enableQueueTracking: true,
    formStatus:          'closed',
    tags:                ['seed', 'load-test', 'mock'],
  });

  const driveId = drive._id as mongoose.Types.ObjectId;
  log(`✅ Drive created: "${drive.companyName}" — ${drive.jobRole}`);

  // ── 4. Room ───────────────────────────────────────────────────────────────
  await RoomModel.deleteMany({ driveId });

  const room = await RoomModel.create({
    driveId,
    collegeId,
    round:    'technical',
    name:     'Room 402',
    location: '4th Floor, Block A',
    capacity: 30,
    panelists: [
      {
        name:      'Dr. Kavya Krishnan',
        email:     'kavya.krishnan@buildforblr.com',
        expertise: ['System Design', 'Algorithms'],
      },
      {
        name:      'Mr. Suresh Babu',
        email:     'suresh.babu@buildforblr.com',
        expertise: ['Frontend Engineering', 'React'],
      },
    ],
    isLocked:        false,
    allowedBranches: [],  // empty = all branches allowed
  });

  const roomId = room._id as mongoose.Types.ObjectId;
  log(`✅ Room created: "${room.name}" (round: ${room.round})`);

  // ── 5. Applications (5 shortlisted students) ─────────────────────────────
  await ApplicationModel.deleteMany({ driveId });

  const apps = await ApplicationModel.insertMany(
    STUDENT_FIXTURES.map((s, i) => ({
      driveId,
      collegeId,
      referenceNumber: `CP-MOCK-${String(i + 1).padStart(3, '0')}`,
      driveStudentId:  `${driveId.toString()}-${s.usn}`,
      status:          'shortlisted',
      currentRound:    'technical',
      assignedRoomId:  roomId,
      submittedAt:     new Date(),
      data: {
        name:     s.name,
        email:    s.email,
        usn:      s.usn,
        branch:   s.branch,
        cgpa:     s.cgpa,
        phone:    s.phone,
        year:     '4th Year',
      },
    }))
  );

  // Back-fill assignedStudents array on the Room
  await RoomModel.findByIdAndUpdate(roomId, {
    $set: { assignedStudents: apps.map((a) => a._id) },
  });

  log(`✅ ${apps.length} applications (students) seeded and assigned to ${room.name}`);

  // ── Print the IDs ─────────────────────────────────────────────────────────
  const border = '─'.repeat(58);
  console.log(`\n┌${border}┐`);
  console.log(`│  📋  COPY THESE INTO load-test.js                        │`);
  console.log(`├${border}┤`);
  console.log(`│  driveId = '${driveId.toString()}'          │`);
  console.log(`│  roomId  = '${roomId.toString()}'          │`);
  console.log(`└${border}┘\n`);

  console.log('Student emails seeded:');
  STUDENT_FIXTURES.forEach((s) => console.log(`  • ${s.email}`));
  console.log('');

  // ── Disconnect ────────────────────────────────────────────────────────────
  await mongoose.disconnect();
  log('🏁 Seed complete. Disconnected.');
}

seed().catch((err) => {
  console.error('[SEED] ❌ Fatal error:', err);
  process.exit(1);
});
