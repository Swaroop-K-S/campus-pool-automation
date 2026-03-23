# CampusPool — Campus Placement Automation Platform

A full-stack campus placement automation platform that streamlines the entire placement drive lifecycle — from drive creation through to final student selection.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, Recharts, Socket.io-client |
| Backend | Node.js + Express, TypeScript, MongoDB + Mongoose, Socket.io |
| Auth | JWT (access + refresh tokens), bcrypt |
| File Processing | multer, XLSX, exceljs |
| Notifications | web-push (browser), nodemailer (email), twilio (SMS) |
| Real-time | Socket.io (QR rotation, round status, live assignments) |

## How to Run Locally

### Prerequisites
- Node.js ≥ 18
- MongoDB running on `mongodb://localhost:27017`

### Steps

```bash
# 1. Clone the repo
git clone <repo-url> && cd campuspool-antigravity

# 2. Install all dependencies
npm install --workspaces

# 3. Create backend .env
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your values (see Environment Variables below)

# 4. Seed the database (creates platform admin)
cd packages/backend && npx ts-node src/seed.ts

# 5. Start backend (Terminal 1)
cd packages/backend && npm run dev

# 6. Start frontend (Terminal 2)
cd packages/frontend && npm run dev

# 7. Open browser
# http://localhost:5173
# Login: admin@campuspool.in / admin123
```

## Environment Variables

### Backend (`packages/backend/.env`)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/campuspool
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
VAPID_PUBLIC_KEY=    # Optional: for push notifications
VAPID_PRIVATE_KEY=   # Optional: for push notifications
```

### Frontend (`packages/frontend/.env`)
```
VITE_API_URL=http://localhost:5000/api/v1
```

## Architecture

```
campuspool-antigravity/
├── packages/
│   ├── backend/
│   │   └── src/
│   │       ├── controllers/   # Route handlers
│   │       ├── models/        # Mongoose schemas
│   │       ├── routes/        # Express routers
│   │       ├── services/      # Business logic (email, push, room-assignment)
│   │       ├── middleware/     # Auth, role-guard, error handling
│   │       └── socket.ts      # Socket.io server
│   └── frontend/
│       └── src/
│           ├── components/    # Shared layouts (Admin, HR, Invigilator, Platform)
│           ├── pages/         # All page components by portal
│           ├── store/         # Zustand auth store
│           ├── hooks/         # useSocket
│           ├── services/      # Axios API client
│           └── router.tsx     # All routes
```

## Portals

| Portal | Path | Role |
|--------|------|------|
| Platform Admin | `/platform/*` | `platform_admin` |
| College Admin | `/admin/*` | `college_admin` |
| Company HR | `/hr/*` | `company_hr` |
| Invigilator | `/invigilator/*` | `invigilator` |
| Student (Public) | `/event/*` | No auth (session token) |

## Phase Completion Status

- [x] **Phase 1** — Auth, Admin Dashboard, Platform Admin
- [x] **Phase 2** — Drive CRUD, Drive Detail, Applications
- [x] **Phase 3** — Form Builder (drag-and-drop), Public Apply Page
- [x] **Phase 4** — Shortlist, Notifications, Event Day Setup
- [x] **Phase 5** — QR System, Student Check-in, Welcome Page
- [x] **Phase 6** — Room Assignment Engine, Round Progression
- [x] **Phase 7** — HR Portal, Invigilator Portal, Analytics, Push, Final Polish

## License

MIT
