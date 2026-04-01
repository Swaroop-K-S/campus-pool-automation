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

## Phase 7: Live Round Progression
1. **Invigilators** mark attendance in their assigned rooms and conduct the round (e.g., Aptitude test).
2. Once the round concludes, results are updated in the system (Pass/Fail).
3. **Real-time Synchronization:** Using `Socket.io`, these updates are pushed instantly to the students' mobile devices.
4. A student looks at their phone and immediately sees if they have been **Selected** or **Rejected** for the next round.
5. If selected, the app tells them **what to do next** and guides them to their newly assigned room for the subsequent round.

## Phase 8: Final Selection
1. This cycle repeats until the final HR round.
2. The system generates a final list of placed students. Analytics dashboards aggregate the data for college records.
