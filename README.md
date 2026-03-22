# CampusPool — Antigravity Prompt Package
# README — Read this first!

## What's in this package

| File | Where to use it | Purpose |
|---|---|---|
| `MASTER_PROMPT.md` | Antigravity Manager View → New Task | The big initial prompt — start here |
| `.antigravity/rules.md` | Copy to your project root as `.antigravity/rules.md` | Always-on agent rules (auto-loaded) |
| `.agent/workflows/campuspool-workflows.md` | Copy to `.agent/workflows/` | Type /new-api-route, /new-page, etc. |
| `.agent/skills/campuspool-skills.md` | Copy to `.agent/skills/` | Auto-triggered specialized knowledge |
| `PHASE_PROMPTS.md` | Copy one phase at a time into Antigravity chat | Step-by-step build prompts |

---

## QUICK START — Do this in order

### Step 1: Setup your project folder
```bash
mkdir campuspool
cd campuspool
```

### Step 2: Copy the config files
Copy these into your campuspool folder:
- `.antigravity/rules.md`
- `.agent/workflows/campuspool-workflows.md`  
- `.agent/skills/campuspool-skills.md`

### Step 3: Open in Antigravity
File → Open Folder → select campuspool/

Antigravity will auto-load `.antigravity/rules.md` immediately.

### Step 4: Switch to Manager View
Click the Manager View icon (top left grid icon).
Set mode to: **Plan Mode** (for Phase 1-3) then **Agent-Assisted** (for Phase 4+).

### Step 5: Paste MASTER_PROMPT.md
Copy the entire contents of MASTER_PROMPT.md.
Click "New Task" in Manager View.
Paste. Hit Enter.

The agent will produce a full Plan Artifact. Review it carefully before approving.

### Step 6: Build phase by phase
After the plan is approved, switch to Editor View.
Open PHASE_PROMPTS.md and copy one phase prompt at a time.
Complete each phase before moving to the next.

---

## USING WORKFLOWS

After project is set up, type these in Antigravity chat to trigger workflows:

| Command | Use when |
|---|---|
| `/new-api-route` | You need to add a new Express endpoint |
| `/new-page` | You need to build a new React page |
| `/add-notification` | Adding email/WhatsApp/push to a feature |
| `/add-xlsx-feature` | Adding Excel import or export |
| `/build-qr-system` | Working on the event-day QR feature |
| `/room-assignment` | Building or debugging room assignment |
| `/security-audit` | Before deployment — run a security check |

---

## PARALLEL AGENTS STRATEGY (Fastest approach)

Instead of building linearly, use Manager View to run parallel agents.
See the `multi-agent-parallel-build` skill for the exact split.

**Sprint 1** (2-3 hours with parallel agents):
- Agent 1: Backend models + auth
- Agent 2: Frontend scaffold + routing
- Agent 3: Shared Zod schemas

**Sprint 2** (3-4 hours):
- Agent 1: Form builder backend
- Agent 2: Form builder frontend
- Agent 3: Notification service
- Agent 4: XLSX operations

**Sprint 3** (3-4 hours):
- Agent 1: QR system + Socket.io
- Agent 2: Student verification + welcome page
- Agent 3: Room assignment engine

**Sprint 4** (2-3 hours):
- Agent 1: HR portal
- Agent 2: Invigilator view
- Agent 3: Analytics + polish

**Total estimated time with parallel agents: 10-14 hours of agent time**
(vs 30-40 hours linear)

---

## ENVIRONMENT VARIABLES NEEDED

Before running the app, fill these in `.env`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/campuspool

# JWT
JWT_ACCESS_SECRET=your-random-secret-here
JWT_REFRESH_SECRET=another-random-secret-here

# Server
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Per-college SMTP (stored in DB, this is the default/fallback)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password

# Twilio (stored in DB per college, this is default/fallback)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

---

## RECOMMENDED MODEL IN ANTIGRAVITY

For complex phases (1, 3, 7, 8): Use **Gemini 3.1 Pro** (best planning)
For fast phases (4, 5, 6, 9, 10, 11): Use **Claude Sonnet 4.6** (fastest generation)
For security audit workflow: Use **Gemini 3.1 Pro** (more thorough)

---

## IF THE AGENT GETS STUCK

Common issues and fixes:

**Agent writes a route without collegeId filter:**
→ Type: "You forgot the multi-tenancy rule. Every DB query must include collegeId from req.user.collegeId. Fix all queries in the file you just created."

**Agent uses class components:**
→ Type: "Rules violation: use functional components only. Refactor to functional component with hooks."

**Agent hardcodes a JWT secret:**
→ Type: "Security violation: JWT secret must come from process.env.JWT_ACCESS_SECRET. Fix immediately."

**Agent creates CSS files instead of Tailwind:**
→ Type: "Rules violation: use TailwindCSS utility classes only. No CSS files, no styled-components, no inline styles. Refactor."

**Agent writes any = anywhere in TypeScript:**
→ Type: "TypeScript strict mode violation: no 'any' types allowed. Replace with proper types or 'unknown' with type guard."

---

## TESTING YOUR BUILD

After each phase, paste this prompt:

```
Use the Antigravity browser agent to test the feature you just built.
1. Start the backend: cd packages/backend && npm run dev
2. Start the frontend: cd packages/frontend && npm run dev
3. Open http://localhost:5173 in the browser agent
4. Walk through the [FEATURE NAME] user flow completely
5. Capture screenshots as Artifacts
6. Report any bugs as a list with severity (critical/medium/low)
7. Fix all critical bugs before marking this phase complete
```

---

Good luck building CampusPool! 🚀
