# CampusPool — Master Build Prompt
# Paste this into Antigravity Manager View → New Task (use PLAN MODE)

---

## TASK: Build CampusPool — A Full-Stack SaaS Campus Placement Automation Platform

You are building **CampusPool**, a production-grade, multi-tenant SaaS web application for
automating end-to-end campus placement (pool) drives across multiple colleges.

---

## PHASE 1 — PROJECT SCAFFOLD & ARCHITECTURE

Before writing any code, produce a **Plan Artifact** that includes:
1. Full monorepo folder structure (frontend + backend + shared types)
2. MongoDB schema for all collections (list every field + type)
3. REST API route map (every endpoint, method, auth role required)
4. Component tree for every page and role
5. Environment variable list (.env.example)

Only proceed to code after I approve the plan.

---

## TECH STACK (do not deviate)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS + React Router v6 |
| Backend | Node.js 20 + Express + TypeScript |
| Database | MongoDB with Mongoose ODM |
| File Storage | MongoDB GridFS (resumes, photos, XLSX uploads) |
| Auth | JWT (access + refresh tokens), bcrypt password hashing |
| Email | Nodemailer (SMTP — configurable per college) |
| WhatsApp | Twilio WhatsApp Business API |
| Push Notifications | Web Push API (VAPID keys, service worker) |
| QR Code | qrcode npm package (server-side generation) |
| Excel Export | exceljs (XLSX download) |
| Excel Import | xlsx (SheetJS — parse uploaded shortlist files) |
| Real-time | Socket.io (event day live updates + QR rotation) |
| Validation | Zod (shared schemas frontend + backend) |
| State Management | Zustand |
| HTTP Client | Axios with interceptors |

---

## MULTI-TENANCY MODEL

- Each **College** is a tenant. They sign up and get their own isolated data namespace.
- A **Platform Super Admin** (CampusPool owner) can manage all colleges.
- All MongoDB collections include a `collegeId` field for tenant isolation.
- Colleges are billed/managed separately (stub billing — no real payment needed).

---

## USER ROLES & PERMISSIONS

### 1. Platform Super Admin
- Manage all colleges (create, suspend, configure)
- View platform-wide analytics
- Manage platform-level settings

### 2. College Admin (TPO — Training & Placement Officer)
- Create and manage placement drives
- Build application forms (form builder)
- View all student submissions
- Upload shortlist XLSX from company
- Send mass email + WhatsApp to shortlisted students
- Configure event day (rooms, seats, schedule, rounds)
- Download data as XLSX at any stage
- View real-time event dashboard
- Manage company HR credentials/access

### 3. Company HR / Panelist
- Login to company portal (credentials created by College Admin)
- Upload round result files (aptitude pass list, GD pass list, etc.)
- View list of students in their assigned round/room
- View AI-suggested GD room assignments (read-only)
- Approve or override AI-suggested assignments (with admin)

### 4. Room Invigilator
- Login with invigilator credentials
- View-only dashboard: see list of students assigned to their room
- See real-time round status and schedule
- No write/upload capabilities

### 5. Student
- No login required
- Fills public application form (link shared by college)
- Scans event-day QR code → identity verification → welcome page
- Receives push notification on selection (congratulations screen)

---

## COMPLETE FEATURE SPECIFICATIONS

### MODULE 1: College Onboarding
- College registration form (name, address, SMTP config, Twilio config, logo upload)
- Platform Super Admin approves/activates college
- Each college gets isolated dashboard at `/college/:collegeId/`

### MODULE 2: Placement Drive Management
- Create a drive: company name, job role, CTC, locations, eligibility (min CGPA, branches)
- Configure rounds: Admin selects which rounds this drive will have from:
  [PPT/Seminar, Aptitude Test, Coding Round, Group Discussion, Technical Interview, HR Interview]
  Rounds are ordered and can be reordered via drag-and-drop
- Drive status lifecycle: Draft → Active → Event Day → Completed

### MODULE 3: Form Builder (Google Forms-like)
- Drag-and-drop field builder
- Supported field types:
  - Text (single line)
  - Textarea (multi-line)
  - Number
  - Dropdown / Select
  - Radio buttons
  - Checkbox
  - Date picker
  - File upload (PDF for resume, JPG for photo — enforce MIME type + max size)
  - Email
  - Phone number
- Default fields always present: Full Name, USN, Branch, CGPA, Email, Phone
- Company-configurable additional fields
- Field properties: label, placeholder, required/optional, validation rules
- Form preview mode (see exactly what student sees)
- On save: generate a unique public URL → `/apply/:formToken`
- Display the public link prominently with a one-click copy button

### MODULE 4: Student Application (Public Form)
- No login required
- Student fills form at `/apply/:formToken`
- File uploads go to MongoDB GridFS
- On submit: store to `applications` collection with status = "applied"
- Show thank-you confirmation page
- Prevent duplicate submissions (check by email + driveId)

### MODULE 5: Shortlist Upload & Student Management
- Admin uploads company's shortlist XLSX (columns: Name, Email, USN, Phone)
- App parses XLSX, matches to applications by email/USN
- Matched students → status updated to "shortlisted"
- Unmatched rows shown with warning (student not found in DB)
- Shortlisted students page: table with Name, USN, Branch, CGPA, Email, Phone, Status
- Per-student action buttons: Send Email, Send WhatsApp (opens compose modal pre-filled)
- Mass action: "Notify All Shortlisted" button → send email + WhatsApp to all at once
- Email template: customizable per drive, with variables like {{studentName}}, {{companyName}}, {{driveDate}}
- WhatsApp message: plain text with same variables

### MODULE 6: Event Day Setup (Admin + HR Joint Panel)
- Configure seminar/venue details: hall name, capacity, date, start time
- Configure round-specific rooms:
  For each round (Aptitude, GD, Technical, HR):
  - Add rooms: room name, floor/location, seat capacity
  - Assign panelist(s) to each room (name + expertise/domain)
- Configure event schedule: each round with start time and estimated duration
- This data is used for student room assignment and the student welcome page

### MODULE 7: Dynamic QR Code System
- Generate a secure, time-limited QR code that encodes a signed JWT token
- Token payload: { driveId, timestamp, nonce }
- Token expires every 30 seconds → new token generated via Socket.io broadcast
- Display QR page at `/event/:driveId/qr-display` (full-screen, meant for projector/screen)
- QR rotates automatically every 30 seconds (old QRs become invalid immediately)
- Student scans → redirected to `/event/:driveId/verify`

### MODULE 8: Student Verification & Welcome Page
- At `/event/:driveId/verify`: student enters Full Name + Email + Phone
- Backend validates: check if this student is in the shortlisted + invited list for this drive
- If match: mark student as "attended", generate session token, redirect to welcome page
- If no match: show error "You are not registered for this drive"
- Welcome page shows:
  1. Student's name + personalized greeting
  2. Full event schedule (rounds, timings, locations — live data from admin setup)
  3. Student's assigned room for the CURRENT active round (if assigned)
  4. Live status indicator: "Currently Active: Aptitude Round — Room A201"
  5. A roadmap timeline showing all rounds with completion status
- Welcome page auto-updates via Socket.io when admin changes the active round

### MODULE 9: Room Assignment Engine
- After seminar attendance is confirmed:
  - System knows: total attended students + available rooms + seats per room
  - Auto-assign students randomly to rooms for Aptitude round
  - Show assignment preview to admin before confirming
  - Admin can manually drag students between rooms before confirming

- For GD Round (AI-suggested assignment):
  - Collect panelist expertise tags (e.g., "Computer Science", "Mechanical", "Marketing")
  - AI suggestion logic:
    1. Group students by branch/domain
    2. Match student groups to panelist with matching expertise
    3. Balance room sizes (no room should have more than capacity)
    4. Show suggestions as a visual room layout card to admin
  - Admin can accept suggestions, override, or manually reassign
  - Confirmation locks the assignment and notifies via Socket.io

### MODULE 10: Round Progression & Pass List Upload
- After each round, HR uploads pass list (XLSX or CSV with USN/Email column)
- System parses file, marks matching students as passed for that round
- Students not in the list → marked as eliminated for that round
- Dashboard updates automatically (Socket.io)
- Next round's assignment panel becomes available
- At any point, admin can download current round's student list as XLSX

### MODULE 11: Final Selection & Congratulations
- After all rounds, HR uploads final selected students list
- System marks students as "Selected"
- For each selected student:
  1. Show in-app congratulations screen at their welcome page (confetti animation)
  2. Send Web Push notification: "Congratulations! You have been selected by [Company]!"
  3. Send congratulations email
  4. Send congratulations WhatsApp message
- Admin sees final selected students list with option to download XLSX

### MODULE 12: Admin Data Export
- At any stage, admin can download:
  - All applications (XLSX with all fields + resume download links)
  - Shortlisted students
  - Attended students
  - Round-wise pass lists
  - Final selected students
- XLSX uses exceljs with formatted headers, college branding color

### MODULE 13: Analytics Dashboard (per College Admin)
- Cards: Total Drives, Total Applications, Total Shortlisted, Total Selected
- Chart: Application funnel (Applied → Shortlisted → Attended → Each Round → Selected)
- Recent drives list with status badges
- Branch-wise distribution chart

---

## DATABASE SCHEMA (implement exactly)

```
colleges: { _id, name, address, logo, smtpConfig{host,port,user,pass}, twilioConfig{accountSid,authToken,fromNumber}, vapidPublicKey, vapidPrivateKey, isActive, createdAt }

users: { _id, collegeId, name, email, passwordHash, role: enum['platform_admin','college_admin','company_hr','invigilator'], driveId(for hr/invigilator), isActive, createdAt }

drives: { _id, collegeId, companyName, jobRole, ctc, locations[], eligibility{minCGPA, branches[]}, rounds[{type, order, status:'pending|active|completed'}], formToken(unique), status:'draft|active|event_day|completed', eventDate, venueDetails{hallName,capacity}, schedule[{roundType,startTime,duration}], createdAt }

formFields: { _id, driveId, collegeId, fields[{id, type, label, placeholder, required, options[], validation{}, order}], createdAt }

applications: { _id, driveId, collegeId, data{name,usn,branch,cgpa,email,phone,...dynamic}, resumeFileId(GridFS), photoFileId(GridFS), status:'applied|shortlisted|invited|attended|round_N_passed|round_N_failed|selected|rejected', currentRound, attendedAt, submittedAt }

rooms: { _id, driveId, collegeId, round, name, floor, capacity, panelists[{name,expertise[]}], assignedStudents[applicationId], createdAt }

qrSessions: { _id, driveId, token(signed JWT), createdAt, expiresAt }

pushSubscriptions: { _id, applicationId, driveId, subscription{endpoint,keys{p256dh,auth}}, createdAt }

notifications: { _id, collegeId, driveId, recipientType:'all_shortlisted|individual', applicationId, channel:'email|whatsapp|push', status:'sent|failed', sentAt }
```

---

## FOLDER STRUCTURE (scaffold this exactly)

```
campuspool/
├── packages/
│   ├── shared/              # Shared Zod schemas + TypeScript types
│   │   ├── src/
│   │   │   ├── schemas/
│   │   │   └── types/
│   │   └── package.json
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── middleware/  # auth, multer, error handler
│   │   │   ├── models/      # Mongoose models
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/    # email, whatsapp, push, qr, excel
│   │   │   ├── utils/
│   │   │   └── socket/      # Socket.io handlers
│   │   ├── .env.example
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── platform-admin/
│       │   │   ├── college-admin/
│       │   │   ├── company-hr/
│       │   │   ├── invigilator/
│       │   │   ├── public/     # student form + QR verify + welcome
│       │   │   └── auth/
│       │   ├── components/
│       │   │   ├── form-builder/
│       │   │   ├── room-assignment/
│       │   │   ├── qr-display/
│       │   │   └── shared/
│       │   ├── store/          # Zustand stores
│       │   ├── hooks/
│       │   ├── services/       # API calls
│       │   └── types/
│       ├── public/
│       │   └── sw.js           # Service worker for push notifications
│       └── package.json
├── package.json                # Workspace root
└── docker-compose.yml          # MongoDB + backend + frontend
```

---

## EXECUTION ORDER

Build in this exact order. Complete and verify each phase before moving to the next.

**PHASE 1** — Scaffold + DB models + Auth system (all roles, JWT)
**PHASE 2** — College onboarding + Drive management APIs + basic frontend shell
**PHASE 3** — Form Builder (backend CRUD + frontend drag-drop UI)
**PHASE 4** — Public student form + file upload (GridFS)
**PHASE 5** — Shortlist upload + student management + Email/WhatsApp notifications
**PHASE 6** — Event day setup (rooms, schedule, panelists)
**PHASE 7** — Dynamic QR system + Socket.io + student verification + welcome page
**PHASE 8** — Room assignment engine (random for aptitude + AI-suggested for GD)
**PHASE 9** — Round progression + pass list upload
**PHASE 10** — Final selection + Web Push congratulations notification
**PHASE 11** — XLSX export (all stages)
**PHASE 12** — Analytics dashboard
**PHASE 13** — Company HR portal + Invigilator portal
**PHASE 14** — Polish: loading states, error handling, mobile responsiveness, dark mode

---

Use PLAN MODE. Generate the full architecture artifact first. I will review and approve before you write code.
