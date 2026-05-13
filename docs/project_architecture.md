# CampusPool Automation - Project Architecture & Workflow

**Last Updated:** May 9, 2026
**Stack:** Python (FastAPI) Backend, React (Vite) Frontend.

## 1. Core Purpose
CampusPool is a real-time placement drive automation platform. It manages physical logistics, student registration, event-day check-ins, and complex multi-round routing (Aptitude, GD, Tech, HR).

## 2. End-to-End Workflow

### Phase 1: Drive Setup & Creation (Admin)
- **Drive Details:** Admin inputs Company Name, Package, Job Locations, and Drive Date.
- **Form Builder:** Admin creates a registration form with active Start/Stop dates.
- **Round Sequencing:** Admin defines the chronological order of rounds (1. Seminar, 2. Aptitude, etc.).
- **Venue & Room Setup:** Admin assigns physical spaces (Seminar Hall with capacity, or uploads XLSX lists of rooms with seat capacities for GD/Aptitude). *This can be completed later, before Event Day starts.*
- **Calendar Sync:** Drive is automatically synced to the Admin's Google Calendar.
- **Drive Preview:** A visual timeline/simulation of the configured event day is shown to the Admin.
- **Call Letter Setup:** Admin provides Google Maps link, Reporting Time, and "What to Bring" checklist.

### Phase 2: Registration & Shortlisting (Pre-Event)
- **Registration:** System generates a form link. Can be auto-shared (email/WhatsApp) via settings toggle or copied manually.
- **ID Generation:** Students submit the form and are assigned a unique ID.
- **Shortlisting (Manual to Auto):**
  1. Admin downloads raw registration data as XLSX.
  2. Admin manually filters candidates offline.
  3. Admin drops the *shortlisted* XLSX file back into the system.
- **Call Letter Dispatch:** The Engine reads the shortlist and auto-sends an email/WhatsApp "Call Letter" (including Venue, Reporting Time, and requirements) to shortlisted students. *Only these students can check in.*

### Phase 3: Event Day Check-In (Morning Of)
- **The QR Display:** Admin displays a massive system-generated QR code on a screen at the venue. 
  - **Dynamic vs Static:** Admin can toggle the QR type. "Static" means one QR code works all day. "Dynamic" means the QR code regenerates and rotates every 30 seconds (using WebSockets to update the Admin's display and validate against a rolling secret on the backend) to prevent screenshot sharing.
- **Authentication Lock:** Students scan the QR with their phones. To proceed, they *must* log in using the unique ID generated during registration.
- **Attendance:** Logging in marks the student as "Present" and records their exact arrival time.

### Phase 4: The Live Event & Logistics Engine ("The Butter")
- **Student's Live Guide:** The Student Page becomes a live itinerary (e.g., "Seminar at 9am, C Block").
- **Admin Command Center:** A split-screen/partitioned dashboard allowing Admin to monitor multiple rounds simultaneously.
- **The Engine:** When a round finishes, the engine takes the *present* students and the *venue constraints* to calculate next moves:
  - *Aptitude:* Fills rooms to exact seat capacity.
  - *Group Discussion:* Clusters students based on room availability and seats.
- **Live Routing:** Pushes real-time mobile notifications telling students exactly which room, floor, and block to go to.

### Phase 5: Round Progression & Selection
- **Asynchronous Flow:** Rounds run concurrently. If a GD group finishes early, they flow directly into the active Tech round. Admin manually clicks Start/Stop for these rounds.
- **The XLSX Advancement Engine (MVP Phase):**
  - Admin drops an XLSX file of students who *passed* the current round.
  - *Passed:* Receive a "Congratulations" notification and room allocation for the next round.
  - *Failed:* Receive a polite rejection message.
- **Final Selection:** When the final round's XLSX is dropped, surviving students receive the ultimate "Congratulations, you are selected!" notification.

## 3. Technical Architecture (To Be Implemented)
- **Backend:** FastAPI, MongoDB (Motor), WebSockets (Socket.io/FastAPI WebSockets) for real-time engine, Celery/Redis for background tasks (email/WhatsApp dispatch).
- **Frontend:** React, Vite, Tailwind CSS (or similar), Zustand/Context for state. Admin Dashboard requires a split-pane layout manager.
