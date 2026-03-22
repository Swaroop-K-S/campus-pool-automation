import mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campuspool');
  if(!mongoose.connection.db) {
      console.log('No db');
      process.exit(1);
  }
  const db = mongoose.connection.db;
  const college = await db.collection('colleges').findOne({});
  let drive = await db.collection('drives').findOne({});
  if (!drive) {
    if(!college) {
       console.log("No college found either. Make sure you ran npm run seed");
       process.exit(1);
    }
    console.log("No drives found, creating one for tests...");
    const nd = await db.collection('drives').insertOne({
        collegeId: college._id,
        companyName: 'Infosys Test Drive',
        jobRole: 'Software Engineer',
        ctc: '5 LPA',
        status: 'draft',
        rounds: [ { type: 'aptitude', status: 'pending' }, { type: 'technical_interview', status: 'pending' } ],
        createdAt: new Date(), updatedAt: new Date()
    });
    drive = { _id: nd.insertedId, collegeId: college._id } as any;
  }
  
  await db.collection('applications').insertMany([
    { driveId: drive!._id, collegeId: drive!.collegeId, status: 'applied', data: { fullName: 'Candidate One', email: 'candidate1@example.com', usn: '1RV20CS001', phone: '9999999991' }, createdAt: new Date(), updatedAt: new Date() },
    { driveId: drive!._id, collegeId: drive!.collegeId, status: 'applied', data: { fullName: 'Candidate Two', email: 'candidate2@example.com', usn: '1RV20CS002', phone: '9999999992' }, createdAt: new Date(), updatedAt: new Date() }
  ]);

  const wsData = [
    ['Name', 'Email', 'USN', 'Phone'],
    ['Candidate One', 'candidate1@example.com', '1RV20CS001', '9999999991'],
    ['Candidate Two', 'candidate2@example.com', '1RV20CS002', '9999999992'],
    ['Not Found', 'notfound@example.com', '1RV20CS999', '0000000000']
  ];
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Shortlist");
  xlsx.writeFile(wb, "../../test-shortlist.xlsx");
  console.log("test-shortlist.xlsx generated in root directory!");
  process.exit(0);
}

run();
