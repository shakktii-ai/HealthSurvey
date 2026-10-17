# Family Verification & Health Impact Survey Management System

A web-based platform designed for field workers, administrators, and donors to manage family identity verification, administer health survey questionnaires, track field operations, and analyze community health impact.

This repository implements **Phase 00 (Project Foundation Setup)**, **Phase 01 (Authentication & Role-Based Access Control)**, and **Phase 02 (Superadmin Master Data Management)**.

---

## 1. Project Overview & Role Architecture

The system enforces strict Role-Based Access Control (RBAC) across three distinct user roles:

### A. Superadmin (`/admin/dashboard`)
- Full administrative access to system modules, configuration, and user roles.
- Can create and manage Field Worker and Donor accounts.
- **Phase 02 Master Data Governance**: Manages Projects, Mandals, Primary Health Centres (PHCs) & Facilities, Villages (with cascading hierarchy), and Key Stakeholders (ASHAs, Facility Staff, and Government Officials).
- In later phases: Manages families, assignments, questionnaires, survey records, and reports.

### B. Field Worker (`/field/dashboard`)
- Access restricted to authorized field data collection activities.
- Cannot manage users, access superadmin administrative functions, or edit master data.
- In later phases: Performs household identity verification, ASHA interviews, facility staff surveys, and government official assessments.
- **Workflow Rule**: Completed surveys become *Completed directly* without a bottleneck review/approval stage (Superadmin may audit and correct afterward).

### C. Donor (`/donor/dashboard`)
- Read-only access to authorized aggregate health impact metrics and dashboards.
- Cannot edit records, submit surveys, or access admin master data.
- **Privacy Rule**: Household personally identifiable information (PII) like names, phone numbers, and addresses is strictly masked and restricted by default.

---

## 2. Phase 02: Master Data Management

Phase 02 establishes the foundational geographic hierarchy, health facility registry, and stakeholder directories required for survey operations and assignments in subsequent phases.

### A. Geographic & Facility Hierarchy
```text
Project (e.g. Integrated Tribal Health Initiative)
   └── Mandal (e.g. Ananthagiri, Araku Valley, Chinthapalli)
         └── PHC / Facility (e.g. Araku AH, Sunkarametta PHC, Ananthagiri PHC)
               └── Village / Habitation (e.g. Sunkarametta, Kothavalasa)
```

- **Cascading Integrity**: Server-side Route Handlers strictly validate that child entities match their parent's scope (e.g. facility belongs to the selected mandal, and mandal belongs to the selected project).
- **Service Categories**: Facilities are categorized by service tiers: `Deep-dive`, `Light-touch`, and `Standard`.
- **Reference Records**: 9 Mandals and 18 Healthcare Facilities are seeded as initial reference data via `npm run seed:master`.
- **Soft Deactivation vs. Hard Deletion**: Deactivation is strictly preferred over deletion to preserve historical associations and audit integrity. Inactive parents prevent new child assignments without breaking existing historical records.

### B. Stakeholder Directory & PII Safeguards
- Master records for:
  1. `asha` (ASHA Workers)
  2. `facility_staff` (Medical Officers, Staff Nurses, Lab Technicians)
  3. `government_official` (Tahsildars, DM&HOs, Sub-Collectors)
- **PII Protection**: Stakeholder phone numbers are kept private and masked (`••••••`) in the UI with authorized reveal toggles. Phone numbers are automatically sanitized and omitted from the `AuditLog` collection.

### C. Lightweight Audit Trail
Every master data creation, update, and status toggle records an immutable audit entry in the `AuditLog` collection:
- `actorId` and `actorEmail` (Acting Superadmin)
- `entityType` (`Project`, `Mandal`, `Facility`, `Village`, `Stakeholder`, `User`)
- `entityId`
- `action` (`CREATE`, `UPDATE`, `STATUS_CHANGE`)
- `before` and `after` snapshots (with passwords and PII sanitized)
- `timestamp`

---

## 3. Required Node.js Version

- **Node.js**: `v18.18.0` or higher (Recommended: `v20.x` LTS or `v24.x`)
- **Package Manager**: `npm` (v9.x or higher)

Check your installed versions:
```bash
node -v
npm -v
```

---

## 4. Installation & Environment Configuration

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Configure `.env.local` by copying `.env.example`:
   ```bash
   # Windows (PowerShell):
   Copy-Item .env.example .env.local

   # macOS / Linux:
   cp .env.example .env.local
   ```

3. Update `.env.local` with your configuration:
   ```env
   # MongoDB Atlas Connection String
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/family_health_survey?retryWrites=true&w=majority

   # Session Secret (at least 32 characters for HMAC signing)
   SESSION_SECRET=your_random_secret_at_least_32_characters

   # Initial Superadmin Setup (used by npm run seed:admin)
   SUPERADMIN_NAME=Super Admin
   SUPERADMIN_EMAIL=admin@example.com
   SUPERADMIN_PASSWORD=your_secure_admin_password_min_8_chars
   ```

> **Security Rule**: Never commit `.env.local` or sensitive database/session secrets to source control.

---

## 5. Master Data Seeding & Admin Setup

1. **Bootstrap Superadmin**:
   ```bash
   npm run seed:admin
   ```
   Creates the initial administrative user (`admin@healthsurvey.org`).

2. **Seed Initial Reference Master Data**:
   ```bash
   npm run seed:master
   ```
   Idempotently registers project `ITHNI-01`, 9 reference Mandals (Ananthagiri, Araku Valley, Chinthapalli, etc.), and 18 facilities (Araku AH, Sunkarametta PHC, etc.) without creating duplicates.

---

## 6. Development & Automated Testing

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js local development server on `http://localhost:3000` |
| `npm run build` | Compile optimized production build (Turbopack) |
| `npm run start` | Run production server locally |
| `npm run lint` | Run ESLint checks across codebase |
| `npm run seed:admin` | Safely create the initial Superadmin account |
| `npm run seed:master` | Seed primary project, 9 mandals, and 18 reference facilities |
| `npm run test:auth` | Run Phase 01 authentication and RBAC automated test suite (30 tests) |
| `npm run test:phase02` | Run Phase 02 master data, RBAC, cascading validation test suite (39 tests) |

---

## 7. Master Data API Routes

All endpoints under `/api/admin/` require an active Superadmin session (`401` if unauthenticated, `403` if Field Worker or Donor).

| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/projects` | `GET`, `POST` | List and create survey projects |
| `/api/admin/projects/:id` | `GET`, `PUT`, `PATCH` | Retrieve, update, or toggle status of project |
| `/api/admin/mandals` | `GET`, `POST` | List and create administrative mandals |
| `/api/admin/mandals/:id` | `GET`, `PUT`, `PATCH` | Retrieve, update, or toggle status of mandal |
| `/api/admin/facilities` | `GET`, `POST` | List and create PHCs / healthcare facilities |
| `/api/admin/facilities/:id` | `GET`, `PUT`, `PATCH` | Retrieve, update, or toggle status of facility |
| `/api/admin/villages` | `GET`, `POST` | List and create villages with cascading hierarchy |
| `/api/admin/villages/:id` | `GET`, `PUT`, `PATCH` | Retrieve, update, or toggle status of village |
| `/api/admin/stakeholders` | `GET`, `POST` | List and register ASHAs, facility staff, and officials |
| `/api/admin/stakeholders/:id` | `GET`, `PUT`, `PATCH` | Retrieve, update, or toggle status of stakeholder |

---

## 8. Master Data UI Modules

| URL | Component | Features |
|---|---|---|
| `/admin/dashboard` | `AdminDashboardPage` | Overview metrics cards with live counts for Projects, Mandals, Facilities, Villages, and Stakeholders |
| `/admin/projects` | `ProjectManager` | Project duration, status toggling, search, validation modal |
| `/admin/mandals` | `MandalManager` | Mandal registry linked to projects, search, status toggles |
| `/admin/facilities` | `FacilityManager` | Facility type, service category badges (`Deep-dive`, `Light-touch`, `Standard`), filters |
| `/admin/villages` | `VillageManager` | 3-step cascading dropdowns: Project → Mandal → PHC / Facility |
| `/admin/stakeholders` | `StakeholderManager` | ASHA, Staff, Official directory with PII phone privacy masking & reveal |

---

## 9. Folder Structure Reference

```text
family-health-survey/
├── public/
│   ├── images/
│   └── icons/
├── scripts/
│   ├── init-admin.js        # Superadmin bootstrapper
│   ├── seed-master-data.js  # Phase 02 idempotent reference data seeder
│   ├── test-auth.js         # Phase 01 test suite (30 tests)
│   └── test-phase02.js      # Phase 02 test suite (39 tests)
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── dashboard/   # Live master data summary & user management
│   │   │   ├── projects/    # Projects management page
│   │   │   ├── mandals/     # Mandals management page
│   │   │   ├── facilities/  # PHC & facilities management page
│   │   │   ├── villages/    # Village management page
│   │   │   └── stakeholders/# Key stakeholder registry page
│   │   ├── field/dashboard/ # Field worker operational portal
│   │   ├── donor/dashboard/ # Donor impact analytics portal
│   │   ├── login/           # Authentication login page
│   │   ├── api/
│   │   │   ├── admin/       # Protected Superadmin Route Handlers
│   │   │   ├── auth/        # Authentication & session handlers
│   │   │   └── health/      # Health check probe
│   │   ├── layout.jsx
│   │   └── page.jsx
│   ├── components/
│   │   ├── admin/           # ProjectManager, MandalManager, FacilityManager, VillageManager, StakeholderManager, UserManager
│   │   ├── ui/              # Button, Card, Badge
│   │   ├── layout/          # AppShell, Sidebar (with Master Data nav), Navbar, Footer
│   │   └── common/          # Native SVG Icons (Icons.jsx)
│   ├── lib/
│   │   ├── audit.js         # Lightweight audit logging utility with PII sanitization
│   │   ├── auth.js          # Password hashing, HMAC token signing & guards
│   │   └── mongodb.js       # Mongoose connection pooling & caching
│   ├── models/
│   │   ├── User.js          # User schema with RBAC roles
│   │   ├── Project.js       # Project master schema
│   │   ├── Mandal.js        # Mandal master schema
│   │   ├── Facility.js      # Healthcare facility schema
│   │   ├── Village.js       # Village master schema
│   │   ├── Stakeholder.js   # Stakeholder registry schema
│   │   └── AuditLog.js      # Audit log schema
│   ├── services/
│   │   ├── authService.js
│   │   ├── userService.js
│   │   └── masterDataService.js # Business logic, relationship integrity, and audit integration
│   └── middleware.js
├── .env.example
├── jsconfig.json
├── package.json
└── README.md
```
