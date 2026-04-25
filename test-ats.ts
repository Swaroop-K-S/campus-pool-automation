import { connect } from 'mongoose';
import { enqueueResumeParsing } from './packages/backend/src/workers/resume.worker';
import { StudentProfileModel } from './packages/backend/src/models/student-profile.model';

const MONGODB_URI = 'mongodb://localhost:27017/campuspool';
const USN = 'TEST-ATS-' + Math.floor(Math.random() * 10000);

const messyResumeText = `
RESUME

John Doe
john.doe@example.com | 555-1234

EDUCATION
University of Technology - B.S. in Computer Engineering (2023)
GPA: 3.8/4.0

SKILLS:
Languages: Javascript, Python, Typescript, Java.
Frameworks & Libraries: ReactJS, node.js, express, Mongo DB, tailwind CSS.
Other stuff: Git, Docker orchestration, AWS (S3, EC2).

EXPERIENCE
Software Intern @ TechCorp
- Built a really cool internal dashboard. I used React and Redux for the frontend.
- Created REST APIs with Node.js and PostgreSQL.

PROJECTS
Project Alpha:
A weather prediction app using Python and scikit-learn. Deployed on Heroku. It was a fun project for a hackathon.

Project Beta:
Real-time chat app. Uses WebSockets, Redis, and React.js.
`;

async function testPipeline() {
  console.log('[Test] Connecting to MongoDB...');
  await connect(MONGODB_URI);

  console.log(`[Test] Creating mock student profile for ${USN}...`);
  await StudentProfileModel.create({
    usn: USN,
    email: 'john.doe@example.com',
    name: 'John Doe',
    applications: [],
    parsingStatus: 'idle',
  });

  console.log('[Test] Dropping messy resume into BullMQ...');
  await enqueueResumeParsing(USN, messyResumeText);

  console.log('[Test] Payload enqueued! Waiting for Ollama (Gemma 2) to parse...');

  // Poll the database until status changes from 'pending'
  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    const profile = await StudentProfileModel.findOne({ usn: USN });
    
    if (!profile) break;
    
    if (profile.parsingStatus === 'completed') {
      console.log('\n✅ [Test] SUCCESS! Gemma 2 parsed the JSON payload:');
      console.log(JSON.stringify(profile.parsedResume, null, 2));
      break;
    } else if (profile.parsingStatus === 'failed') {
      console.log('\n❌ [Test] FAILED to parse.');
      break;
    } else {
      process.stdout.write('.');
    }
  }

  process.exit(0);
}

testPipeline().catch(console.error);
