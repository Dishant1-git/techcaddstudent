# Student Attendance & Complaint Management Portal
### Enterprise Production-Grade Fullstack Architecture

A modern, secure, responsive **Student Attendance & Complaint Management Portal** built for educational and training institutes. The platform features strict role-based access control (RBAC), multi-tier attendance verification by assigned trainers, confidential grievance redressal, real-time analytics, and multi-format report exports (CSV, Excel, PDF).

The project is structured into an industry-standard monorepo architecture featuring an independent `backend/` Express REST API and a high-performance `frontend/` React Single Page Application (SPA), orchestrated via npm workspaces.

---

## 📋 Table of Contents
1. [Production Directory Architecture](#-production-directory-architecture)
2. [Quick Start & Installation](#-quick-start--installation)
3. [NPM Scripts Guide](#-npm-scripts-guide)
4. [Environment Variables](#-environment-variables)
5. [Login Credentials for Testing](#-login-credentials-for-testing)
6. [User Roles & Permissions Matrix](#-user-roles--permissions-matrix)
7. [Step-by-Step Testing Guide](#-step-by-step-testing-guide)
   - [Student Workflow](#1-student-workflow)
   - [Trainer Workflow](#2-trainer-workflow)
   - [Admin Workflow](#3-admin-workflow-including-trainer-crud)
8. [Attendance Verification Lifecycle](#-attendance-verification-lifecycle)
9. [Confidential Complaint Privacy Logic](#-confidential-complaint-privacy-logic)
10. [Security & Authentication Architecture](#-security--authentication-architecture)
11. [Exporting Reports](#-exporting-reports)

---

## 🏛️ Production Directory Architecture

```
student-portal/
├── backend/                             # Independent Express REST API Service
│   ├── src/
│   │   ├── config/                      # Centralized environment & app settings
│   │   │   └── index.js
│   │   ├── db/                          # Database storage, schemas & seeders
│   │   │   ├── database.js              # Persistence adapter & transactions
│   │   │   ├── seed.js                  # Automated fixture seeder
│   │   │   └── data.json                # Active JSON database
│   │   ├── middleware/                  # Express middleware layer
│   │   │   ├── auth.js                  # JWT token validation & RBAC guards
│   │   │   ├── security.js              # Security headers, sanitization & rate limiting
│   │   │   ├── audit.js                 # Audit trail event logger
│   │   │   └── errorHandler.js          # Centralized error handler
│   │   ├── routes/                      # Modular REST API endpoints
│   │   │   ├── index.js                 # Aggregated /api router
│   │   │   ├── auth.js                  # Authentication & user profile
│   │   │   ├── students.js              # Student CRUD & roster
│   │   │   ├── trainers.js              # Trainer CRUD & directory
│   │   │   ├── courses.js               # Course catalog
│   │   │   ├── batches.js               # Cohorts & batch allocations
│   │   │   ├── attendance.js            # Marking, verification & reporting
│   │   │   ├── complaints.js            # Confidential grievance management
│   │   │   ├── notifications.js         # In-app real-time alerts
│   │   │   ├── analytics.js             # Institutional metrics & KPIs
│   │   │   ├── audit.js                 # Security audit logs
│   │   │   └── uploads.js               # Secure multipart file uploads
│   │   └── server.js                    # Express application bootstrap & server lifecycle
│   ├── uploads/                         # Storage directory for user attachments
│   │   └── .gitkeep
│   ├── tests/                           # Backend test suites
│   │   └── e2e.test.js                  # End-to-end security & workflow test suite
│   ├── .env.example                     # Backend environment template
│   ├── nodemon.json                     # Hot-reload configuration
│   └── package.json                     # Backend service dependencies
│
├── frontend/                            # Independent React + Vite SPA Client
│   ├── public/                          # Static public assets
│   ├── src/
│   │   ├── assets/                      # Media assets & styling
│   │   ├── components/                  # Reusable UI component library
│   │   │   ├── common/                  # Buttons, Cards, Modals, Badges, ExportReports
│   │   │   └── layout/                  # Navbar, Sidebar, DashboardLayout, Footer
│   │   ├── context/                     # React Context state management
│   │   │   ├── AuthContext.jsx          # Session & authentication state
│   │   │   ├── ToastContext.jsx         # Toast notification dispatch
│   │   │   └── NotificationContext.jsx  # Notification counter & dropdown
│   │   ├── hooks/                       # Custom hooks barrel exports
│   │   │   └── index.js
│   │   ├── pages/                       # Page views segmented by RBAC domain
│   │   │   ├── admin/                   # Admin dashboard, faculty/student CRUD, reports
│   │   │   ├── trainer/                 # Trainer verification, batches, profile
│   │   │   ├── student/                 # Student check-in, grievance submission, history
│   │   │   ├── auth/                    # Login, registration, password reset
│   │   │   └── common/                  # Profile, notifications, 404, unauthorized
│   │   ├── services/                    # Centralized API service & HTTP client
│   │   │   └── api.js
│   │   ├── utils/                       # Export formatters & date helpers
│   │   ├── App.jsx                      # Client router & route guards
│   │   ├── main.jsx                     # React root DOM mount
│   │   └── index.css                    # Tailwind CSS directives & custom styles
│   ├── index.html                       # HTML5 entry template
│   ├── vite.config.js                   # Vite configuration with backend proxy
│   ├── tailwind.config.js               # Tailwind design system tokens
│   ├── postcss.config.js                # PostCSS autoprefixer plugins
│   ├── .env.example                     # Frontend environment template
│   └── package.json                     # Frontend client dependencies
│
├── docs/                                # Documentation & screenshots
│   └── screenshots/
│       └── portal-preview.png
│
├── .gitignore                           # Production Git ignore patterns
├── .env.example                         # Root environment reference
├── package.json                         # Workspace orchestration package
└── README.md                            # Complete system documentation
```

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### 2. Install All Dependencies (Single Command)
Run from the root directory to install both frontend and backend dependencies via npm workspaces:
```bash
npm install
```

### 3. Seed Database with Realistic Demo Data
```bash
npm run seed
```

### 4. Run in Development Mode
Run both backend (with nodemon) and frontend (with Vite HMR) concurrently:
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5001`
- **Health Check**: `http://localhost:5001/api/health`

### 5. Run in Unified Production Mode
Build the optimized frontend bundle and start the production backend server (which automatically serves the frontend static build):
```bash
npm run build
npm start
```
Open **`http://localhost:5001`** in your browser.

---

## 🛠️ NPM Scripts Guide

| Command | Working Directory | Description |
| :--- | :--- | :--- |
| `npm run dev` | Root | Runs backend & frontend concurrently with colored terminal output |
| `npm run dev:backend` | Root / `backend` | Starts backend in development mode with nodemon auto-restart |
| `npm run dev:frontend`| Root / `frontend`| Starts frontend Vite dev server on port 5173 with API proxying |
| `npm run build` | Root / `frontend`| Compiles and optimizes React frontend into `frontend/dist` |
| `npm run start` | Root / `backend` | Launches the backend server in production mode |
| `npm run seed` | Root / `backend` | Initializes or refreshes database with default demo data |
| `npm run test` | Root / `backend` | Runs the full 26-assertion E2E security and workflow test suite |

---

## ⚙️ Environment Variables

### Backend (`backend/.env` or root `.env`)
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=portal-secure-production-jwt-secret-key-replace-in-prod
CORS_ORIGIN=*
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=/api
# Optional: override proxy target when backend runs on a custom port
# BACKEND_PORT=5001
```

---

## 🔑 Login Credentials for Testing

Use these credentials to test role separation, permissions, and security.

| Role | User Name | Email Address | Password | Role Description & Assigned Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Harinder Singh | `singhharinder.techcadd@gmail.com` | `Harinder@9203` | Master Administrator (Full institute control, faculty CRUD, reports, grievance resolution) |
| **Trainer** | Alex Rivera | `trainer.alex@portal.edu` | `trainer123` | Lead Trainer for *Full-Stack Web Dev (Batch FSWD-2026-A)* |
| **Trainer** | Sarah Jenkins | `trainer.sarah@portal.edu` | `trainer123` | Specialist for *Data Science & AI (Batch DSAI-2026-B)* |
| **Trainer** | Marcus Chen | `trainer.marcus@portal.edu` | `trainer123` | Instructor for *Cybersecurity & Cloud (Batch CYBER-2026-C)* |
| **Student** | John Doe | `student.john@portal.edu` | `student123` | Student ID `STU-2026-001` (*Batch FSWD-2026-A*, Assigned Trainer: Alex Rivera) |
| **Student** | Emily Watson | `student.emily@portal.edu` | `student123` | Student ID `STU-2026-002` (*Batch FSWD-2026-A*, Assigned Trainer: Alex Rivera) |
| **Student** | Michael Chang | `student.michael@portal.edu` | `student123` | Student ID `STU-2026-003` (*Batch DSAI-2026-B*, Assigned Trainer: Sarah Jenkins) |
| **Student** | Sophia Martinez | `student.sophia@portal.edu` | `student123` | Student ID `STU-2026-004` (*Batch DSAI-2026-B*, Assigned Trainer: Sarah Jenkins) |

---

## 🛡️ User Roles & Permissions Matrix

| Feature / Capability | Student | Trainer | Admin |
| :--- | :---: | :---: | :---: |
| **Sign In with Encrypted Password & JWT** | ✅ | ✅ | ✅ |
| **Mark Class Session Attendance** | ✅ | ❌ | ❌ |
| **View Personal Attendance History & Compliance %** | ✅ | ❌ | ❌ |
| **Submit Confidential Grievances / Complaints** | ✅ | ❌ | ❌ |
| **View Personal Complaints & Admin Responses** | ✅ | ❌ | ❌ |
| **View Student Profile & Assigned Trainer Contact** | ✅ | ❌ | ❌ |
| **Verify / Reject Assigned Students' Attendance** | ❌ | ✅ | ✅ (Override) |
| **View Assigned Batches & Students Directory** | ❌ | ✅ | ✅ |
| **Update Personal Trainer Profile (Bio, Domain, Phone)** | ❌ | ✅ | ✅ |
| **Access Student Complaints & Staff Notes** | ❌ | ❌ *(Strict 403 Block)* | ✅ *(Exclusive)* |
| **CRUD Operations on Trainers (Create, Read, Edit, Delete)** | ❌ | ❌ | ✅ *(Full CRUD)* |
| **CRUD Operations on Students (Create, Read, Edit, Delete)** | ❌ | ❌ | ✅ *(Full CRUD)* |
| **Course & Batch Management** | ❌ | ❌ | ✅ |
| **Attendance Oversight Across Institute** | ❌ | ❌ | ✅ |
| **Generate Multi-Filter Attendance Reports** | ❌ | ✅ *(Assigned Cohorts)* | ✅ *(All Cohorts)* |
| **Export Reports to CSV, Excel (.xlsx), and PDF** | ✅ *(Self)* | ✅ *(Assigned)* | ✅ *(Global)* |
| **System Security & Audit Trail Logs** | ❌ | ❌ | ✅ |
| **Broadcast Campus Announcements** | ❌ | ❌ | ✅ |

---

## 🧪 Step-by-Step Testing Guide

### 1. Student Workflow
1. **Sign In**: Navigate to `http://localhost:5173/login`, enter `student.john@portal.edu` / `student123`, and click **"Sign In to Portal"**.
2. **Dashboard**: Notice the **Student Profile card**, today's check-in status, and circular **Attendance Compliance Gauge**.
3. **Mark Attendance**:
   - Click **"Mark Attendance Today"** or **"Mark Check-In"**.
   - Select the class session (e.g. *Morning Lecture* or *Afternoon Practical Lab*).
   - Enter optional notes and submit.
   - Notice the status updates to **`Pending Verification`** (Students cannot approve their own attendance).
   - Try marking attendance for the same session again: Notice the system prevents duplicate attendance with a clear message.
4. **Report a Confidential Grievance**:
   - Go to **"Report Complaint"** in the sidebar.
   - Click **"Report a Complaint"**, select a category (*Course*, *Infrastructure*, *Trainer*, etc.), set priority, and write a subject and description.
   - Submit the grievance. Notice it appears in the table with status **`Open`**.
   - Notice that internal admin staff notes are hidden from the student view.

---

### 2. Trainer Workflow
1. **Sign In**: Log in with `trainer.alex@portal.edu` / `trainer123`.
2. **Dashboard Overview**:
   - View assigned cohorts (*Batch FSWD-2026-A*), student count, and pending verifications badge.
3. **Verify Attendance**:
   - Go to **"Attendance Verification"**.
   - Notice the attendance record submitted by John Doe (*Pending Verification*).
   - Click **"Verify"** -> Status changes immediately to **`Verified`**, recording the verification timestamp and trainer identity.
4. **Reject Attendance with Mandatory Reason**:
   - On a pending record, click **"Reject"**.
   - A modal appears requiring a mandatory explanation (e.g., *"Checked in late without prior approval"*).
   - Submit rejection -> Status becomes **`Rejected`** with the reason stored and dispatched to the student.
5. **Trainer Isolation Verification**:
   - Notice trainers have **no access to student complaints**. Any attempt to access grievance endpoints is blocked at the backend level with `403 Forbidden`.
6. **Trainer Profile Management**:
   - Go to **"Trainer Profile"**.
   - Edit name, domain specialization, direct phone, biography, or change password. Click **"Save Profile Changes"**.

---

### 3. Admin Workflow (Including Trainer CRUD)
1. **Sign In**: Log in with `admin@portal.edu` / `admin123`.
2. **Executive Oversight Dashboard**:
   - Review live KPIs (Total Students, Trainers, Batches, Today's Attendance, Grievance Resolution Rate).
   - Check the **"Low Attendance Alerts (< 75%)"** table.
   - View real-time **Daily Attendance Trends** and **Grievance Categories** charts.
3. **Full CRUD on Trainers (`/admin/trainers`)**:
   - **Create (Add Trainer)**: Click **"Add New Trainer"**, fill in Name, Email, Password, Trainer ID Code, Specialization, Phone, and Bio.
   - **Read (View Trainer)**: Click the **Eye icon** on any trainer row to view their detailed profile, assigned cohorts, and enrolled student list.
   - **Update (Edit Trainer)**: Click the **Edit icon** to update their profile or reset credentials.
   - **Delete / Deactivate**: Click the **Trash icon** to either soft deactivate the trainer or remove the record.
4. **Full CRUD on Students (`/admin/students`)**:
   - Add new students, assign them to courses, batches, and trainers, edit details, or deactivate accounts.
   - Click the **Eye icon** to view full student profile + complete attendance history + complete grievance history.
5. **Course & Batch Management (`/admin/courses` & `/admin/batches`)**:
   - Create, edit, and delete courses and batches; assign trainers and set student capacity limits.
6. **Complaints Hub (`/admin/complaints`)**:
   - View all confidential grievances across the institute.
   - Click **"Manage"** on a complaint:
     - Change status (*Open*, *Under Review*, *Resolved*, *Closed*).
     - Write the **Official Administrative Response** (sent to student notification and portal view).
     - Write **Private Internal Staff Notes** (visible only to administrators).
7. **Dedicated Attendance Reports Engine (`/admin/reports`)**:
   - Filter by Course, Batch, Trainer, Student, Date Range, and Status.
   - View aggregate metrics and batch-wise compliance charts.
   - Export reports in **CSV**, **Excel (.xlsx)**, and printable **PDF**.
8. **Security & Audit Logs (`/admin/audit-logs`)**:
   - Review the immutable audit trail of logins, attendance verifications, rejections, and administrative actions.
9. **Broadcast Announcements (`/admin/settings`)**:
   - Broadcast notifications to all users, students only, or faculty only.

---

## 🔄 Attendance Verification Lifecycle

```
[Student Logs In]
       │
       ▼
[Selects Session & Marks Check-In]
       │
       ▼
[Backend Checks Duplicate Constraint (Student + Batch + Date + Session)]
       │
       ▼
[Status Initialized: "Pending Verification"]
       │
       ▼
[Real-Time Notification Sent to Assigned Trainer]
       │
       ▼
[Trainer Reviews Submission in Verification Console]
       │
       ├───► [VERIFY] ──► Status: "Verified" + Timestamp + Trainer ID
       │
       └───► [REJECT] ──► Requires Mandatory Reason ──► Status: "Rejected" + Reason
       │
       ▼
[Student Receives Alert & Compliance % Automatically Recalculated]
```

---

## 🔒 Confidential Complaint Privacy Logic

```
[Student Submits Grievance with Optional Attachment]
       │
       ▼
[Stored Securely with Status "Open"]
       │
       ├───► [TRAINER ACCESS] ──► STRICTLY BLOCKED (403 Forbidden)
       │
       └───► [ADMIN ACCESS ONLY]
                   │
                   ▼
       [Admin Reviews in Complaints Hub]
                   │
                   ▼
       [Admin Updates Status & Submits:]
          • Official Public Response (Visible to Student)
          • Private Staff Notes (Hidden from Student)
                   │
                   ▼
       [Student Receives Notification & Reads Official Response]
```

---

## 🔐 Security & Authentication Architecture

1. **Explicit Password Verification**:
   - Authentication uses SHA-256 bcrypt password hashing with salt rounds.
   - Automatic login bypass is disabled; credentials must be authenticated against the backend database on every sign-in.
2. **JWT Token Authorization**:
   - Authenticated sessions issue signed JSON Web Tokens (JWT) containing encoded user IDs and role claims.
3. **Backend Role-Based Access Control (RBAC)**:
   - Backend API endpoints are protected by role-checking middleware:
     - `requireAuth`: Validates bearer tokens and checks that account status is active.
     - `requireAdmin`: Enforces administrative permissions.
     - `requireTrainer`: Ensures trainer-only endpoints cannot be breached by students.
     - `requireTrainerOrAdmin`: Scopes verification access to assigned trainers or administrators.
     - `requireStudent`: Protects student-specific operations.
4. **Data Isolation**:
   - Direct database queries enforce trainer-to-batch and student-to-record isolation.
   - Direct API calls attempting to cross role boundaries return `403 Forbidden`.
5. **Audit Trail**:
   - All critical actions (Logins, Attendance markings, Verifications, Rejections, Complaint status updates, Account modifications) are recorded in the system audit log with timestamps and IP addresses.

---

## 📊 Exporting Reports

From the **Attendance Reports** section (`/admin/reports` or `/trainer/reports` or `/student/attendance`), click the **"Export Report"** dropdown:
- **CSV Export**: Clean comma-separated format for data analysis.
- **Excel (.xlsx)**: Formatted multi-column spreadsheet with headers and student metadata.
- **PDF Document**: Formatted landscape printable report with metadata header, summary statistics, and styled table.

---

## 💻 Technical Stack

- **Backend**: Node.js, Express, JSON Relational Database Engine, JWT, BcryptJS, Multer.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, XLSX, jsPDF.
- **Architecture**: Monorepo with dedicated `frontend` and `backend` workspaces, decoupled API client, and production-ready build orchestration.
