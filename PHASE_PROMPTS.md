# CampusPool — Phase-by-Phase Quick Prompts
# Copy one prompt at a time into Antigravity (Editor View or Manager View)
# Run them in order. Use PLAN MODE for Phases 1-3, FAST MODE for Phases 4+.

---

## PHASE 1 — Foundation
## Paste this FIRST into Antigravity Manager View (PLAN MODE)

```
Context: Building CampusPool — a multi-tenant SaaS campus placement automation platform.
Rules are in .antigravity/rules.md. Read them now before doing anything.

Task: Scaffold the complete project foundation.

1. Create the monorepo structure exactly as defined in MASTER_PROMPT.md
2. Set up packages/shared with all Zod schemas and TypeScript types for all DB collections
3. Set up packages/backend:
   - Express app with TypeScript
   - Mongoose connection with retry logic
   - All 9 Mongoose models (colleges, users, drives, formFields, applications, rooms, qrSessions, pushSubscriptions, notifications) with all indexes
   - JWT auth middleware (access token 15min, refresh token 7days)
   - Role guard middleware for all 5 roles
   - asyncHandler utility
   - Zod validation middleware
   - mongo-sanitize global middleware
   - CORS configured for frontend origin
   - Rate limiting on auth routes
   - Error handler middleware
   - Health check endpoint: GET /api/v1/health
4. Set up packages/frontend:
   - Vite + React 18 + TypeScript
   - TailwindCSS with custom color config (indigo primary)
   - React Router v6 with lazy-loaded pages
   - Route guard components per role
   - Axios service with interceptors (401 → redirect to login, 5xx → toast)
   - Zustand stores (auth store with persist)
   - react-hot-toast configured
   - Login page (works for all roles — role detected from JWT)
5. Create .env.example with all required variables
6. Create docker-compose.yml (MongoDB + backend + frontend)

Generate a Plan Artifact first. I will approve before you write code.
```

---

## PHASE 2 — Auth + College Onboarding
## Paste after Phase 1 is approved and built

```
Context: CampusPool, rules in .antigravity/rules.md.

Task: Build the complete auth system and college onboarding flow.

BACKEND:
1. POST /api/v1/auth/login — all roles, returns access + refresh tokens
2. POST /api/v1/auth/refresh — refresh token rotation
3. POST /api/v1/auth/logout
4. POST /api/v1/platform/colleges — platform admin creates a college (name, address, SMTP config, Twilio config)
5. GET /api/v1/platform/colleges — list all colleges (platform admin only)
6. POST /api/v1/college/:collegeId/users — college admin creates HR/invigilator accounts
7. VAPID key generation on college creation (store in college document)

FRONTEND:
1. Login page — clean, professional, works for all roles
2. Platform Admin dashboard shell (layout + sidebar)
3. College onboarding form page (for platform admin)
4. College Admin dashboard shell (layout + sidebar with all nav items)
5. After login, redirect to correct dashboard based on role from JWT

Test with browser agent: log in as each role, verify correct dashboard loads.
```

---

## PHASE 3 — Drive Management + Form Builder
## This is the most complex phase — use PLAN MODE

```
Context: CampusPool, rules in .antigravity/rules.md.

Task: Build placement drive management and the Google-Forms-like form builder.

BACKEND:
1. CRUD for drives: POST/GET/PUT/DELETE /api/v1/drives
2. Drive lifecycle endpoints: activate, start-event-day, complete
3. POST /api/v1/drives/:driveId/form — save form field configuration
4. GET /api/v1/drives/:driveId/form — get form config
5. GET /api/v1/form/:formToken — public endpoint, returns form config (no auth)
6. Validate that formToken is unique across the platform

FRONTEND — College Admin:
1. "New Drive" page with multi-step form:
   - Step 1: Company details (name, role, CTC, locations)
   - Step 2: Eligibility (min CGPA slider, branch checkboxes)
   - Step 3: Select rounds (drag-drop to order them)
   - Step 4: Confirm + create
2. Drive list page (cards with status badges, company logo placeholder)
3. Drive detail page (tabs: Overview | Form Builder | Applications | Shortlist | Event Day)
4. Form Builder tab — THIS IS THE KEY FEATURE:
   - Left panel: field type palette (10 field types with icons)
   - Center: droppable canvas showing fields in order
   - Right panel: field editor (edit selected field's properties)
   - Top bar: Preview button, Save button, field count
   - Bottom: large "Public Form Link" display with copy button
   - Use react-dnd for drag-and-drop
   - Animate field insertion/reordering (framer-motion)

Use PLAN MODE. Show me the component tree and data flow for the form builder specifically.
I want to see this before you code it.
```

---

## PHASE 4 — Student Application Form (Public)
## Fast Mode — relatively straightforward

```
Context: CampusPool, rules in .antigravity/rules.md.

Task: Build the public student application form at /apply/:formToken

BACKEND:
1. POST /api/v1/form/:formToken/submit — no auth required
   - Accept multipart/form-data (files + fields)
   - Upload resume (PDF, max 5MB) and photo (JPG/PNG, max 2MB) to GridFS
   - Validate all required fields against the form config
   - Check for duplicate submission (same email + driveId → return 409)
   - Store application with status = 'applied'
   - Return success with application reference number

FRONTEND (public, no login):
1. /apply/:formToken — dynamically renders form fields based on form config fetched from API
2. Render each field type correctly (file upload with drag-drop area, etc.)
3. Multi-step progress if form has more than 6 fields (group into logical steps)
4. Real-time validation with React Hook Form + Zod
5. File upload with progress indicator and preview (show filename for PDF, thumbnail for photo)
6. Thank-you page after successful submission: "Application submitted successfully! Your reference: [ID]"
7. Mobile-optimized (this will be filled on phones)

Use browser agent to test: submit a complete form with a PDF and JPG. Verify files stored in GridFS.
```

---

## PHASE 5 — Shortlist Upload + Notifications
## Fast Mode

```
Context: CampusPool, rules in .antigravity/rules.md. Read the xlsx-operations skill.

Task: Build shortlist upload, student management table, and notification system.

BACKEND:
1. POST /api/v1/drives/:driveId/shortlist/upload — multer + SheetJS parse
   - Match uploaded rows to applications by email OR usn (case-insensitive)
   - Update matched applications status → 'shortlisted'
   - Return: { matched: N, notFound: N, errors: [{row, reason}] }
2. GET /api/v1/drives/:driveId/applications — paginated, filterable by status, branch, CGPA
3. POST /api/v1/drives/:driveId/notify/mass — email + WhatsApp to ALL shortlisted students
   - Async batch processing (50 per batch, 1s delay)
   - Broadcast progress via Socket.io: notify:progress { sent, total, failed }
4. POST /api/v1/drives/:driveId/notify/student/:appId — notify individual student
5. GET /api/v1/drives/:driveId/applications/export — download as XLSX

FRONTEND — College Admin:
1. Applications tab: sortable/filterable table with all applicants
   - Columns: Photo, Name, USN, Branch, CGPA, Email, Status, Resume link
   - Status filter chips (All, Applied, Shortlisted, Attended, Selected)
2. Shortlist Upload section: drag-drop file area + upload result summary card
3. Shortlisted students view with:
   - "Notify All" button with confirmation dialog
   - Progress bar during mass send (from Socket.io events)
   - Per-student row: Email button, WhatsApp button (open compose modal)
4. Compose modal: pre-filled with template, {{variableName}} highlighted, editable before send

EMAIL TEMPLATES to build:
- shortlist-invitation.html (student invited for drive)
- congratulations.html (student selected)
Use table-based HTML email layout, works in Gmail/Outlook.
```

---

## PHASE 6 — Event Day Setup Panel
## Fast Mode

```
Context: CampusPool, rules in .antigravity/rules.md.

Task: Build the event day configuration panel for College Admin + Company HR.

BACKEND:
1. POST /api/v1/drives/:driveId/event-setup — save seminar + round configs
2. GET /api/v1/drives/:driveId/event-setup — get current setup
3. POST /api/v1/drives/:driveId/rooms — add rooms for a specific round
4. PUT /api/v1/drives/:driveId/rooms/:roomId — update room (add panelist, change capacity)
5. DELETE /api/v1/drives/:driveId/rooms/:roomId
6. POST /api/v1/drives/:driveId/schedule — save round schedule (times + durations)
7. PUT /api/v1/drives/:driveId/rounds/:roundType/activate — make a round 'active'
   - Broadcasts round:status_changed via Socket.io to all connected clients

FRONTEND — Event Day tab in Drive Detail:
1. Seminar setup card: hall name, capacity, date, start time
2. For each round in the drive, a collapsible section:
   - "Add Room" button → inline form: name, floor, capacity, panelist name + expertise tags
   - Room cards showing current rooms with panelist info
   - Seat utilization indicator (X seats configured / Y students invited)
3. Schedule timeline: drag to reorder rounds, set time for each
4. "Activate Round" button next to each round (only one active at a time)
5. Live student count: "127 students invited / 0 checked in" (updates via Socket.io)
```

---

## PHASE 7 — QR System + Student Verification + Welcome Page
## Use PLAN MODE — complex real-time system

```
Context: CampusPool, rules in .antigravity/rules.md. Read the qr-rotation-system skill.

Task: Build the complete event-day QR system, student verification, and welcome page.

Read the qr-rotation-system skill carefully first. Then build exactly as specified there.

ADDITIONAL REQUIREMENTS:
- QR Display page must work offline after first load (service worker caches it)
- Welcome page must handle the case where student has no room assigned yet:
  Show "Room assignments will be announced soon. Please wait in the seminar hall."
- Welcome page round roadmap: vertical timeline with icons per round type, 
  completed rounds in green, active in indigo with pulse animation, upcoming in gray
- Student verification must be rate-limited: max 5 attempts per IP per 10 minutes
- If student is already checked in (verified before), show "You've already checked in!" with their welcome page link

Use browser agent to simulate:
1. Open QR display page in one tab
2. Wait 30 seconds, verify QR rotates
3. Copy the QR URL manually
4. Open verify page in another tab, submit details
5. Verify welcome page loads with correct student name and schedule
```

---

## PHASE 8 — Room Assignment Engine
## Use PLAN MODE

```
Context: CampusPool, rules in .antigravity/rules.md. Read the room-assignment skill.

Task: Build the room assignment engine as specified in the room-assignment skill.

ADDITIONAL FRONTEND REQUIREMENTS for GD suggestion display:
- Show a "Match Quality" score: percentage of students matched to an expert in their field
- Use a visual card grid layout (not a table) for room assignments
- Each room card: room name, panelist name + expertise tags, list of assigned students
- Students draggable between cards (react-dnd)
- Color code students by branch (CS = blue, ME = amber, EC = teal, etc.)
- "AI Suggested" badge on cards where AI placed students
- "Manually Assigned" badge on cards where admin moved a student
- Sticky "Confirm Assignments" button at the bottom right
- Show warning if any room is over capacity (red border on that card)

After assignments are confirmed:
- POST /api/v1/drives/:driveId/rooms/confirm-assignments
- This stores all assignments to DB
- Broadcasts via Socket.io: assignments:confirmed { roundType, assignments }
- Welcome pages of all checked-in students update to show their room
```

---

## PHASE 9 — Round Progression + Pass Lists
## Fast Mode

```
Context: CampusPool, rules in .antigravity/rules.md.

Task: Build round progression — uploading pass lists and advancing students to next round.

BACKEND:
1. POST /api/v1/drives/:driveId/rounds/:roundType/results — upload pass list XLSX/CSV
   - Parse file, match students by USN or email
   - Students in file → status = '[roundType]_passed'
   - Students NOT in file (who were in that round) → status = '[roundType]_failed'
   - Broadcast via Socket.io: round:results_uploaded { roundType, passed: N, failed: N }
2. GET /api/v1/drives/:driveId/rounds/:roundType/students — students in that round
3. GET /api/v1/drives/:driveId/rounds/:roundType/export — download round's student list

FRONTEND:
1. Round Management view in Event Day tab (visible to both Admin and HR):
   - For each completed round: show passed/failed counts with progress bar
   - "Upload Results" button → file upload modal
   - Upload result preview: list of matched students (passed), unmatched rows (error)
   - Confirm button to apply results
2. After results applied: next round's room assignment panel becomes available
3. Running totals at the top: "Started: 127 → Aptitude: 89 → GD: 45 → Tech: 21 → HR: 12 → Selected: 8"
```

---

## PHASE 10 — Final Selection + Congratulations
## Fast Mode

```
Context: CampusPool, rules in .antigravity/rules.md. Read the push-notifications skill.

Task: Build final selection and the congratulations notification system.

1. POST /api/v1/drives/:driveId/final-selection — upload final selected students XLSX
   - Mark matched students: status = 'selected'
   - For each selected student, trigger async:
     a. Web Push notification (use web-push library + stored subscription)
     b. Email: congratulations template
     c. WhatsApp: congratulations message
     d. Socket.io emit: student:selected { applicationId } → triggers welcome page update

2. POST /api/v1/event/:driveId/push-subscribe — save push subscription (called from welcome page on load)

3. GET /api/v1/drives/:driveId/selected — list of selected students

4. Build the congratulations overlay on the welcome page (as specified in push-notifications skill)

5. Admin: Final Results page showing all selected students with:
   - Download as XLSX button
   - Stats: X selected from Y applications (conversion rate)
   - Branch-wise breakdown chart (bar chart using recharts)
```

---

## PHASE 11 — Company HR Portal + Invigilator View
## Use 2 parallel agents

```
AGENT 1 — Company HR Portal:
Context: CampusPool, rules in .antigravity/rules.md.

Build the Company HR portal. HR credentials are created by College Admin.
HR can only see data for the specific drive they are assigned to.

Pages to build:
1. HR Dashboard: drive overview (company they're hiring for, date, status, student funnel counts)
2. Students page: read-only table of students in the current active round
   - Show: Name, Branch, CGPA, Room Assignment
   - Cannot edit anything — this is read-only
3. Upload Results page:
   - Upload pass list XLSX for the round they're running
   - Preview before confirm
   - After confirming, round progresses automatically
4. GD Assignment page:
   - View AI-suggested room assignments
   - Can suggest changes (comment only, admin must approve)
   - See which panelist is in which room

All HR routes: auth guard role = 'company_hr', scoped to their driveId.

---

AGENT 2 — Invigilator View:
Context: CampusPool, rules in .antigravity/rules.md.

Build the Invigilator portal. Invigilators are assigned to one room.
Invigilators can ONLY view (no write operations at all).

Pages to build:
1. Invigilator dashboard: shows their assigned room name, round, floor
2. Student list: table of students assigned to their room
   - Name, USN, Branch, Photo (small thumbnail)
   - Real-time updates via Socket.io when assignments change
3. Round status banner: large, prominent display of current active round
   - Updates in real-time via Socket.io
4. Schedule view: full event day timeline (read-only)

All invigilator routes: auth guard role = 'invigilator', scoped to their roomId.
```

---

## PHASE 12 — Analytics + Polish
## Fast Mode

```
Context: CampusPool, rules in .antigravity/rules.md.

Task: Build analytics dashboard and final polish pass.

ANALYTICS (College Admin dashboard home):
1. Summary cards: Total Drives (this year), Total Applications, Conversion Rate (applied→selected), Active Drives
2. Application funnel chart (recharts BarChart): Applied → Shortlisted → Attended → Selected
3. Branch-wise pie chart: distribution of selected students by branch
4. Drive history table: recent drives with company name, date, applications count, selected count, status badge
5. All charts must work with real data from MongoDB aggregation pipelines

POLISH PASS:
1. Loading skeletons: every page that fetches data must show a skeleton (not a spinner)
2. Empty states: every table/list must have an illustrated empty state with helpful text
3. Error boundaries on every page
4. Responsive: test and fix every page at 375px, 768px, 1024px, 1440px
5. Dark mode: verify all text is readable
6. Page titles and meta tags for all routes
7. 404 page
8. Onboarding tooltips for first-time college admin (using react-joyride)

Use browser agent to do a full end-to-end walkthrough at the end:
College admin login → create drive → build form → submit test application → upload shortlist →
send notifications → set up event day → verify student → assign rooms → upload results → final selection.
Document any bugs found as GitHub Issue artifacts.
```
