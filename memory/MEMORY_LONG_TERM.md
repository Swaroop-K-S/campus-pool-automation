# Long-Term Memory

**Last Updated:** 2026-04-02 (Session 3 — Walk-in, Projector, Passport, Prep Resources)

## Project Goal
**CampusPool** is a full-stack campus placement automation platform designed to streamline the entire placement drive lifecycle — from drive creation through to final student selection.

---

## Tech Stack & Core Technologies

### Frontend (`packages/frontend`)
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand (auth store: `useAuthStore`)
- **Data Visualization:** Recharts (`LineChart`, `BarChart`, `PieChart`, `ResponsiveContainer`)
- **Real-time:** Socket.io-client (`useSocket` hook)
- **API Client:** Axios (configured in `src/services/api.ts`, uses `VITE_API_URL`)
- **Routing:** React Router v6 (`createBrowserRouter`)
- **UI Extras:** `lucide-react` icons, `react-hot-toast`, `canvas-confetti`, `react-dropzone`, `@dnd-kit/*`

### Backend (`packages/backend`)
- **Framework:** Node.js + Express + TypeScript
- **Database:** MongoDB + Mongoose
- **Real-time:** Socket.io
- **Auth:** JWT (Access 15m + Refresh 7d) via `jsonwebtoken`, `bcrypt`
- **File Processing:** `multer`, `xlsx`, `exceljs`
- **Notifications:** `nodemailer` (email), `twilio` (WhatsApp/SMS), `web-push` (browser push)
- **QR:** `qrcode` library + JWT-signed tokens (30s expiry, auto-rotated)
- **Config:** `dotenv` via `src/config/env.ts`

### Shared (`packages/shared`)
- Zod schemas + TypeScript types for `Drive`, `Application`, `DriveStatusEnum`, `RoundTypeEnum`

---

## Architecture

Monorepo managed with npm workspaces. Three packages: `backend`, `frontend`, `shared`.

```
campuspool-antigravity/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── controllers/       # Business logic
│   │   │   ├── routes/            # Express routers
│   │   │   ├── models/            # Mongoose schemas
│   │   │   ├── middleware/        # auth.middleware.ts (JWT guard)
│   │   │   ├── services/          # email.service, whatsapp.service, qr.service, room-assignment.service
│   │   │   ├── socket/            # handlers/qr.handler.ts (QR rotation), index.ts (getIO)
│   │   │   └── utils/             # resolve-template.ts ({{var}} substitution)
│   │   └── scripts/
│   │       └── seed-drives.ts     # npm run seed:drives → 9 drives, 319 apps
│   ├── frontend/
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── college-admin/ # 8 admin pages (incl. drive-detail with God View tab)
│   │       │   └── public/        # 8 student-facing pages
│   │       │   │   ├── apply.tsx, verify.tsx, welcome.tsx   # core student flow
│   │       │   │   ├── status-lookup.tsx                    # pre-event USN lookup
│   │       │   │   ├── qr-display.tsx                       # admin QR wall
│   │       │   │   ├── passport.tsx                         # cross-drive student vault
│   │       │   │   ├── projector.tsx                        # live wall display (no auth)
│   │       │   │   └── invigilator.tsx                      # magic-link invigilator portal
│   │       ├── components/
│   │       │   ├── admin/         # LiveRoundsTab, DriveAuditLog, EventDayRoadmap
│   │       │   └── shared/        # AdminLayout, CommandPalette, DownloadButton, ProtectedRoute
│   │       ├── hooks/             # use-socket.ts
│   │       ├── store/             # auth.store.ts (Zustand)
│   │       └── services/          # api.ts (Axios instance)
│   └── shared/
│       └── src/
│           └── schemas/           # Zod schemas, exported as types
└── memory/
    ├── MEMORY_SHORT_TERM.md
    ├── MEMORY_LONG_TERM.md       ← this file
    ├── APP_FLOW_ARCHITECTURE.md
    └── skills.md
```

---

## Data Models (Mongoose)

### Drive
Key fields: `companyName`, `jobRole`, `ctc`, `status`, `isPaused` (emergency toggle), `rounds[]`, `eventDate`, `venueDetails` {hallName, capacity}, `resources[]` {title, url} (prep materials for students)

### Application
Key fields: `driveId`, `collegeId`, `data` (Mixed — dynamic form fields), `status` (applied/shortlisted/invited/attended/selected/rejected), `driveStudentId` (unique, sparse, e.g. `INF0042`, `WI-001` for walk-ins), `referenceNumber`, `attendedAt`, `currentRound`

### Room
Key fields: `driveId`, `collegeId`, `name`, `floor`, `capacity`, `round`, `assignedStudents[]`, `panelists[]`

### QRSession
Key fields: `driveId`, `token`, `expiresAt` (30s TTL)

### Notification
Key fields: `driveId`, `applicationId`, `channel`, `status`, `sentAt`

### StudentProfile *(NEW — `student_profiles` collection)*
Key fields: `usn` (indexed), `email`, `name`, `branch`, `collegeId` (indexed), `lastSeen`  
Purpose: Persistent cross-drive student identity for the CampusPool Passport portal.  
Created/updated via `upsert` on successful Passport verification. USN is the primary natural key.

---

## Frontend Routes (All Registered in `router.tsx`)

### Public (No Auth)
| Path | Component | Purpose |
|------|-----------|---------|
| `/apply/:formToken` | `PublicApplyPage` | Student application form |
| `/event/:driveId/qr-display` | `QRDisplayPage` | Admin QR screen (rotates 30s) |
| `/event/:driveId/verify` | `VerifyPage` | Student QR scan check-in |
| `/event/:driveId/welcome/:appId` | `WelcomePage` | Student event-day dashboard |
| `/event/:driveId/my-status` | `StatusLookupPage` | Pre-event USN status lookup + prep resources |
| `/event/:driveId/projector` | `ProjectorPage` | Live wall display for projectors (polls 8s) |
| `/passport` | `PassportPage` | Cross-drive student identity vault (JWT auth) |
| `/invigilator/:token` | `InvigilatorPortal` | Magic-link panelist portal |
| `/login` | `LoginPage` | Admin login |

### Admin (Protected — `ProtectedRoute` → `AdminLayout`)
| Path | Component |
|------|-----------|
| `/admin/dashboard` | `AdminDashboardPage` |
| `/admin/drives/new` | `NewDriveWizard` |
| `/admin/drives/:driveId` | `DriveDetailPage` (7 tabs) |
| `/admin/drives/:driveId/room-assignment` | `RoomAssignmentPage` |
| `/admin/drives/:driveId/rounds` | `RoundManagementPage` |
| `/admin/drives/:driveId/rooms/:roomId/print` | `PrintManifestPage` |
| `/admin/analytics` | `AnalyticsPage` |
| `/admin/settings` | `SettingsPage` |

---

## Backend API Routes (All Registered & Tested)

### Auth (`/api/v1/auth`)
`POST /login`, `POST /refresh`, `POST /logout`

### Drives (`/api/v1/drives`)
CRUD + activate + clone + archive + form builder + form schedule + shortlist upload + bulk notify

### Event (`/api/v1/drives/:driveId`)
| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /event-setup` | Admin JWT | Update event day config + resources |
| `GET /event-setup` | Admin JWT | Fetch event config (includes resources[]) |
| `PATCH /start-event` | Admin JWT | Begin event day |
| `POST /rooms` | Admin JWT | Create room |
| `GET /rooms`, `DELETE /rooms/:id` | Admin JWT | Room management |
| `POST /rounds/:type/advance-present` | Admin JWT | **Single-click advance all attended students** |
| **`POST /walk-in`** | Admin JWT | **Fast-track register unregistered walk-in student** |

### QR / Student (`/api/v1/event/:driveId`)
| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /info` | None | Drive info for verify/status pages |
| `GET /qr/current` | None | Current QR data URL (auto-starts rotation) |
| `POST /verify` | None | Student check-in (returns `alreadyCheckedIn` flag) |
| `GET /status-lookup?usn=XXX` | None | Pre-event USN lookup — returns status, Drive ID, venue, resources |
| `GET /welcome/:appId` | Session token | Student dashboard data |
| **`GET /projector-stats`** | **None (public)** | **Live wall display stats — drive summary, check-ins, round breakdown** |
| `POST /qr/start` | Admin JWT | Start QR rotation |
| `POST /qr/stop` | Admin JWT | Stop QR rotation |

### Passport (`/api/v1/passport`)
| Endpoint | Auth | Purpose |
|----------|------|---------|
| **`POST /passport/verify`** | None | Verify USN+email against applications, issue 8h Passport JWT |
| **`GET /passport/profile`** | Passport JWT | Full cross-drive history, stats, drive list |

### Analytics (`/api/v1/analytics`)
`GET /summary`, `GET /branch-distribution`, `GET /drives-history`, `GET /selected`

---

## Socket.io Event Contract

### Server → Client
| Event | Payload | Listener |
|-------|---------|---------|
| `qr:refresh` | `{ qrDataUrl, expiresAt }` | `qr-display.tsx` |
| `round:status_changed` | `{ roundType, status, nextRound }` | `welcome.tsx`, `drive-detail.tsx` |
| `student:verified` | `{ count, studentName }` | `drive-detail.tsx` (live stats) |
| `assignments:confirmed` | — | `welcome.tsx` (re-fetch room) |
| `student:selected` | `{ applicationId }` | `welcome.tsx` (confetti) |
| `student:status_changed` | — | `welcome.tsx` (re-fetch) |
| `notify:progress` | `{ sent, total, failed, done }` | `drive-detail.tsx` |
| `event:stats` | `{ invited, checkedIn, … }` | `drive-detail.tsx` |
| `student:sos` | `{ applicationId, room, … }` | Admin (SOS alert) |
| `drive:paused` | `{ driveId, isPaused }` | `welcome.tsx`, `invigilator.tsx` (lockdown overlay) |
| **`event:walk_in_registered`** | `{ driveStudentId, name, usn, branch }` | **God View live feed** |

### Client → Server
| Event | Emitted from |
|-------|-------------|
| `join:drive` | Admin + student pages |
| `join:app` | `welcome.tsx` |
| `student:sos` | `welcome.tsx` SOS button |

---

## Template Variable System (`resolve-template.ts`)

`buildVarsForStudent(app, drive, college)` resolves these `{{variables}}` in email/WhatsApp templates:

| Variable | Source |
|----------|--------|
| `{{name}}` | `app.data.fullName / name` |
| `{{usn}}` | `app.data.usn` |
| `{{branch}}` | `app.data.branch` |
| `{{cgpa}}` | `app.data.cgpa` |
| `{{email}}` | `app.data.email` |
| `{{phone}}` | `app.data.phone` |
| `{{driveId}}` | `app.driveStudentId` (e.g. `INF0042`) |
| `{{referenceNumber}}` | `app.referenceNumber` |
| `{{companyName}}` | `drive.companyName` |
| `{{jobRole}}` | `drive.jobRole` |
| `{{ctc}}` | `drive.ctc` |
| `{{eventDate}}` | `drive.eventDate` (formatted) |
| `{{venueName}}` | `drive.venueDetails.hallName` |
| `{{collegeName}}` | `college.name` |
| `{{statusPageUrl}}` | `${FRONTEND_URL}/event/${driveId}/my-status` |

---

## getWelcomeData Response Shape (IMPORTANT)

`GET /event/:driveId/welcome/:appId` returns:
```json
{
  "status": "attended|rejected|selected|shortlisted",
  "student": { "name", "branch", "usn", "email" },
  "drive": { "companyName", "jobRole", "schedule", "rounds", "venueDetails", "eventDate", "reportTime" },
  "assignedRoom": { "name", "floor" } | null,
  "activeRound": { "type", "status" } | null,
  "isSelected": true | false
}
```
> **CRITICAL:** `status` and `reportTime` MUST be in this response. `welcome.tsx` uses `data.status` to detect rejected students and `drive.reportTime` for the standby card.

---

## Environment Variables Required

### Backend (`.env`)
```
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
FRONTEND_URL=http://localhost:5173   # used in statusPageUrl generation
PORT=5000
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:5000/api/v1
```

---

## Seeded Test Data (2028 Engineering Batch)
- **Script:** `npm run seed:drives` (`packages/backend/scripts/seed-drives.ts`)
- **Drives:** 9 total — 3 completed (Infosys, Wipro, Accenture), 6 active (TCS, Cognizant, Capgemini, Mphasis, Oracle, Siemens)
- **Applications:** 319 total across all drives
- **driveStudentId format:** `{COMPANY_PREFIX}{4-digit-number}` e.g. `INF0042`, `TCS0017`
- **Branches:** CSE, ISE, ECE, ME, EEE, AIML, DS, MCA, MBA (RVCE 2028 batch)

---

## Portals & Roles
| Portal | Path | Status |
|--------|------|--------|
| Platform Admin | `/platform/*` | ❌ Out of scope |
| **College Admin** | `/admin/*` | ✅ Fully built |
| Company HR | `/hr/*` | ❌ Out of scope |
| **Invigilator** | `/invigilator/*` | ✅ Secure Magic-Link Built |
| **Student (Public)** | `/event/*` | ✅ Fully built |

---

## Known Architectural Decisions & Rules

1. **Temp IDs are drive-scoped only.** `driveStudentId` becomes meaningless after drive completion. Never persist across drives.
2. **QR token is JWT-signed (30s TTL).** Frontend auto-fetches new QR. Student must scan a currently-displayed QR — photos of old QRs bounce at `verifyStudent`.
3. **Round 1 attendance = QR scan.** No manual attendance entry. `advance-present` uses `status='attended'` as the single source of truth.
4. **No-shows are auto-rejected.** On `advance-present`, all students still in `applied` status get `rejected`. No separate action.
5. **Session tokens for students are 8h JWT.** Stored in `localStorage` as `campuspool_session_${appId}`. Cleared when drive ends.
6. **Email/WhatsApp are fire-and-forget async.** Backend returns `200 OK` immediately after queuing. Progress is pushed via `notify:progress` socket.
7. **Room assignment uses true round-robin** across available rooms for the active round to ensure even distribution.
8. **USN format enforced:** Regex `^[A-Z0-9]{5,20}$` on application form. Frontend auto-uppercases on the verify and status-lookup pages.
9. **Walk-in Drive Student IDs use `WI-` prefix** (e.g. `WI-001`, `WI-002`). Count is derived from `ApplicationModel.countDocuments({ driveId })` at registration time. Walk-ins get `walkIn: true` in their `data` field.
10. **Passport JWT is separate from admin JWT.** Uses the same `JWT_ACCESS_SECRET` but carries `{ usn, collegeId, email }` in payload. Token key in localStorage: `campuspool_passport_token`. Expiry: 8 hours.
11. **Projector display endpoint is intentionally public (no auth).** It's designed to run on a wall-mounted screen with no admin interaction. Only exposes non-sensitive aggregate data — no individual contact details.
12. **StudentProfile is upserted, never duplicated.** `findOneAndUpdate({ usn, collegeId }, data, { upsert: true })` ensures one profile per student per college regardless of how many times they verify.

---

## Phase Completion Status

| Feature | Status |
|---------|--------|
| Auth (login, JWT, refresh) | ✅ |
| Admin dashboard + drive CRUD | ✅ |
| Form builder (drag-and-drop) | ✅ |
| Application management | ✅ |
| Shortlist upload + bulk notify | ✅ |
| Email template builder with variables | ✅ |
| WhatsApp template builder | ✅ |
| `{{statusPageUrl}}` in templates | ✅ |
| Room assignment (auto + manual) | ✅ |
| Round management | ✅ |
| Event Day — QR rotation (30s) | ✅ |
| Event Day — Student check-in (verify) | ✅ |
| Event Day — Already-checked-in flash UX | ✅ |
| Event Day — Welcome dashboard | ✅ |
| Event Day — Standby state (checked-in, no round) | ✅ |
| Event Day — Rejected state UI | ✅ |
| Event Day — Selected state + confetti | ✅ |
| Event Day — SOS button | ✅ |
| Single-click advance-present | ✅ |
| Pre-event status lookup page | ✅ |
| Analytics (trends, leaderboard, selection rate) | ✅ |
| Database seeding (2028 batch) | ✅ |
| SSO | ❌ Out of scope |
| Geo-fencing | ❌ Out of scope |
| Platform/HR portals | ❌ Out of scope |
| **Event Day — Drive Master Switch (Panic Button)** | ✅ |
| **Event Day — God View Heatmap (Live Room Monitor)** | ✅ |
| **Event Day — Student Queue Tracking & Wait Time** | ✅ |
| **Invigilator — Dynamic Scorecards (Rubrics)** | ✅ |
| **Invigilator — JWT Magic Link System** | ✅ |
| **Pre-Drive Preparation Resources** | ✅ resources[] on Drive; student-facing card on status-lookup |
| **CampusPool Passport (Student Identity Vault)** | ✅ StudentProfileModel + JWT auth + cross-drive history dashboard |
| **Walk-in Fast-Track Registration** | ✅ POST /walk-in → WI-001 IDs + God View modal + Socket.io broadcast |
| **Projector Wall Display** | ✅ Public polling endpoint + full dark 1080p React page + God View button |

---

## Masterplan Progress (60-point Roadmap)

| Phase | Items | Done | Remaining highlights |
|-------|-------|------|----------------------|
| Phase 1 — Event Day Ecosystem | 20 | ~15 | Walk-in ✅, Projector ✅, Panic ✅, God View ✅, Queue ✅. Missing: Estimated Wait Time engine, Offline PWA, WebRTC audio, Badge printing |
| Phase 2 — Room Logistics Engine | 10 | ~2 | Basic rooms + capacity done. Missing: drag-and-drop re-assign, auto-spillover, constraint AI |
| Phase 3 — Student Web Experience | 10 | 10 | **100% COMPLETE** — Passport ✅, Prep Resources ✅, Status Lookup ✅ |
| Phase 4 — Admin Controls & Rules | 10 | ~1 | Drive cloning only. Missing: policy engine, audit trails, company CRM, NOC generator |
| Phase 5 — Hyper-Scale Infrastructure | 10 | 0 | Cmd+K palette, Redis cache, E2E tests, microservices — not started |
