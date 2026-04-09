# App Skills & Knowledge Base

This document outlines the requisite technical skills, domain knowledge, and architectural paradigms required to build, maintain, and scale the CampusPool Automation Platform.

## 1. Required Technical Skills

### Frontend Engineering
- **React.js (v18):** Deep understanding of functional components, hooks (`useEffect`, `useState`, `useCallback`, `useMemo`), and strict mode.
- **TypeScript:** Strong typing for components, API responses, and shared models to ensure type safety across the monorepo.
- **State Management (Zustand):** Managing global state such as authentication contexts, user roles, and UI states.
- **Tailwind CSS:** Utility-first CSS for rapid UI development, implementing responsive design, and adhering to consistent design tokens.
- **Websockets (Socket.io-client):** Handling real-time event listeners for live updates (e.g., QR rotation, status broadcasts).
- **Data Visualization (Recharts):** Building analytics dashboards for HR and Admin roles.

### Backend Engineering
- **Node.js & Express:** Structuring RESTful APIs, modular routing, and writing resilient middleware functions.
- **Database Architecture (MongoDB & Mongoose):** Schema modeling, indexing strategies, querying, aggregations, and maintaining relational integrity in a NoSQL environment.
- **Real-Time Communication (Socket.io):** Managing socket connections, rooms, namespaces, emitting events securely, and dealing with reconnections.
- **Authentication & Security:** Managing JWT lifecycles (Access & Refresh tokens), password hashing (`bcrypt`), role-based access control (RBAC), and securing API endpoints.
- **File Processing:** Handling multipart/form-data uploads (`multer`), processing/parsing spreadsheet data (`XLSX`, `exceljs`), and serving static assets securely.

### DevOps & Tooling
- **Monorepo Management:** Utilizing npm workspaces to manage `packages/frontend`, `packages/backend`, and `packages/shared`.
- **TypeScript Tooling (`tsx`, `ts-node`):** Compiling, type-checking, and running `.ts` scripts natively.
- **Environment Management:** Safely managing and distributing `.env` variables across environments and packages.

## 2. Core Operational Knowledge

### Domain Knowledge: Campus Placements
- **Lifecycle Understanding:** Must understand the workflow of a placement drive: Company Registration -> Drive Creation -> Student Application -> Shortlisting -> Rounds (Aptitude, Tech, HR) -> Final Selection.
- **Role Permissions:** Distinct understanding of access boundaries for Platform Admins, College Admins, Company HRs, Invigilators, and unauthenticated Students.
- **Event Logistics & Room Management:** Handling deep state for round progression and capacity-based room allocations per round for Invigilators and Admins.

### Architectural Paradigms
- **Dynamic QR Check-in System:** Implementing WebSocket-driven, rotating display QR codes (refreshing every 30s) to prevent spoofing and proxy attendance.
- **Mobile-First Student Guidance Portal:** Building a lightweight, highly responsive mobile web app interface that students launch post-QR scan, showing real-time selection status, next steps, and room directions.
- **Stateful vs Stateless Auth:** Understanding when to rely on stateless JWTs vs storing session states globally.
- **Real-time Event Synchronization:** Strategies (`Socket.io`) for broadcasting live status changes (Round assignments, Pass/Fail states) directly to the specific student's portal without overwhelming the server.
- **Bulk Data Handling:** Knowledge of processing large Excel uploads synchronously or asynchronously, extracting data robustly, and updating the database efficiently.
- **Notification Workflows:** Trigger mechanisms for multi-channel alerts via Push API (VAPID), Email (NodeMailer), and SMS (Twilio).

## 3. Maintenance & Next Steps
- **Code Consistency:** Maintain strict TypeScript compliance using `npm run typecheck --workspaces`.
- **Scaling Sockets:** As the app grows and concurrent connections increase during large drives, knowledge of scaling Socket.io with Redis adapters will be necessary.
- **Admin "God View" Design & Implementation:** Proficiency in building real-time, SVG-mapped or grid-based heatmaps using WebSockets, capacity threshold math, and dynamic color logic (Green/Amber/Red pulsing).
- **Systemic Locking (Panic Switching):** Expertise in implementing global state-based middleware guards (`drive-guard.middleware.ts`) that enforce operational freezes across heterogeneous student/panelist environments via unified socket broadcasts.
- **Secure Magic Link Authorization:** Architecting no-auth, token-based temporary portals (JWT-signed) that provide restricted sandboxes for room-specific operations with time-based expiry and session-less verification.
