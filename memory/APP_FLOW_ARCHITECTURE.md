# CampusPool: End-to-End Application Flow

This document details the complete lifecycle of a placement drive within the CampusPool platform, outlining the interaction between different user interfaces and backend systems.

## Phase 1: Drive Creation & Preparation
1. **College Admin** logs into the Admin portal.
2. They initiate a new placement drive, specifying the company details, job roles, eligibility criteria, and the structure of the selection process (e.g., Aptitude Round -> Technical Round -> HR Interview).

## Phase 2: Form Builder & Data Collection
1. **Admin** uses the drag-and-drop **Form Builder** to create a custom application form tailored to the company's requirements.
2. The platform generates a unique **Public Link** for the drive.
3. **Students** access this public link, fill out the form, upload resumes or photos, and submit their applications.
4. The backend securely stores this data and handles file uploads.

## Phase 3: Shortlisting & Notifications
1. After the deadline, the **Admin** uses the platform to filter students based on eligibility or custom criteria.
2. A shortlist is finalized.
3. The platform dispatches automated notifications (Email, SMS, Web Push) to the shortlisted students containing their unique event tokens or guidelines.

## Phase 4: Event Day - Secure Check-in
1. On the day of the drive, the **Admin/Invigilator** projects a **Dynamic QR Code** on a large screen at the venue.
2. To prevent proxy attendance, this QR code utilizes WebSockets to **refresh dynamically every 30 seconds**.
3. **Students** arrive and scan the QR code using their mobile devices.

## Phase 5: Student Web App (Real-time Guidance)
1. Scanning the QR code logs the student into a specialized, mobile-first **Student Web App** session.
2. This interface acts as their personal guide throughout the day. It shows their current status, profile, and active round.

## Phase 6: Event Management & Room Allocation (Admin/Invigilators)
1. Meanwhile, **Admins and Invigilators** utilize the Event Day Management dashboard.
2. They manage physical infrastructure (**Room Management**), creating rooms and setting seating capacities.
3. The **Room Assignment Engine** automatically (or manually) allocates checked-in students to specific rooms for the current round.

## Phase 7: Administrative "God View" & Panic Control
1. **Admins** monitor the entire campus in real-time via the **God View Heatmap**.
2. This dashboard uses WebSockets to show room occupancy, capacity alerts (Green -> Red pulsing), and panelist activity across all rounds.
3. In case of emergencies or coordination issues, the Admin can trigger the **Master Panic Switch**.
4. **Instant Lockdown:** This fires a global socket event that renders an impenetrable "Operations Paused" overlay on every student phone and invigilator tablet simultaneously.

## Phase 8: Dynamic Rubrics & Magic Links
1. **HR Panelists** receive a **Secure Magic Link** (valid for 24h) for their specific room.
2. They access a zero-login evaluation portal with **Dynamic Rubrics**.
3. They score students on criteria like "Technical Skills", "Body Language", and "Eye Contact" (or custom traits they define on the fly).
4. **Live Feedback:** Decisions (Selected/Rejected) are instantly synced to the student's personal dashboard with celebratory confetti.

## Phase 9: Final Selection & Analytics
1. This cycle repeats until the final HR round.
2. The system generates a final list of placed students. Analytics dashboards aggregate the data for college records.
