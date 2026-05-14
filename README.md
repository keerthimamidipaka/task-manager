# Task Manager

A full-stack team task management application with role-based access control.

## 🌐 Live URL
https://task-manager-nine-mocha-80.vercel.app

## 🚀 Features
- ✅ Authentication (Signup/Login with JWT)
- 👥 Role-based access (Admin/Member)
- 📁 Project creation and management
- ✅ Task creation, assignment & status tracking
- 📊 Kanban board (TODO, IN PROGRESS, DONE)
- 📈 Dashboard with task statistics and progress bars
- 👤 Team member management
- 🔴 Overdue task highlighting
- 🎯 Priority levels (High/Medium/Low)

## 🛠️ Tech Stack
- **Frontend:** Next.js + Tailwind CSS (Vercel)
- **Backend:** Node.js + Express + TypeScript (Railway)
- **Database:** PostgreSQL (Supabase)
- **Auth:** JWT tokens + bcrypt

## 📡 API Endpoints
- POST /auth/signup - Register user
- POST /auth/login - Login user
- GET /projects - Get all projects
- POST /projects - Create project
- GET /projects/:id - Get project details
- POST /projects/:id/members - Add member
- POST /projects/:id/tasks - Create task
- PATCH /tasks/:id - Update task
- DELETE /tasks/:id - Delete task
- GET /dashboard - Get dashboard stats

## 🏃 Local Setup
1. Clone the repo
2. cd backend && npm install
3. Add .env with DATABASE_URL and JWT_SECRET
4. npx prisma migrate deploy
5. npx ts-node index.ts
6. cd frontend && npm install
7. npm run dev