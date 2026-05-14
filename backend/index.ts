import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "secret";

app.use(cors({ origin: "*" }));
app.use(express.json());

// Auth middleware
const auth = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ✅ SIGNUP
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already exists" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || "MEMBER" }
    });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// ✅ LOGIN
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "All fields required" });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// ✅ GET PROJECTS
app.get("/projects", auth, async (req: any, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { members: { some: { userId: req.user.id } } }
        ]
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        tasks: true
      }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// ✅ CREATE PROJECT
app.post("/projects", auth, async (req: any, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Project name required" });
    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: req.user.id,
        members: { create: { userId: req.user.id, role: "ADMIN" } }
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        tasks: true
      }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Failed to create project" });
  }
});

// ✅ GET SINGLE PROJECT
app.get("/projects/:id", auth, async (req: any, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            creator: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// ✅ ADD MEMBER TO PROJECT
app.post("/projects/:id/members", auth, async (req: any, res) => {
  try {
    const { email, role } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const member = await prisma.projectMember.create({
      data: { projectId: parseInt(req.params.id), userId: user.id, role: role || "MEMBER" },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: "Failed to add member" });
  }
});

// ✅ CREATE TASK
app.post("/projects/:id/tasks", auth, async (req: any, res) => {
  try {
    const { title, description, assigneeId, priority, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: "Task title required" });
    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId: parseInt(req.params.id),
        creatorId: req.user.id,
        assigneeId: assigneeId || null,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// ✅ UPDATE TASK STATUS
app.patch("/tasks/:id", auth, async (req: any, res) => {
  try {
    const { status, title, description, assigneeId, priority, dueDate } = req.body;
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(status && { status }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(priority && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null })
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// ✅ DELETE TASK
app.delete("/tasks/:id", auth, async (req: any, res) => {
  try {
    await prisma.task.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// ✅ DASHBOARD
app.get("/dashboard", auth, async (req: any, res) => {
  try {
    const allTasks = await prisma.task.findMany({
      where: {
        project: {
          OR: [
            { ownerId: req.user.id },
            { members: { some: { userId: req.user.id } } }
          ]
        }
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } }
      }
    });

    const now = new Date();
    const todo = allTasks.filter(t => t.status === "TODO").length;
    const inProgress = allTasks.filter(t => t.status === "IN_PROGRESS").length;
    const done = allTasks.filter(t => t.status === "DONE").length;
    const overdue = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE").length;

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { members: { some: { userId: req.user.id } } }
        ]
      }
    });

    res.json({
      stats: { total: allTasks.length, todo, inProgress, done, overdue },
      recentTasks: allTasks.slice(0, 5),
      totalProjects: projects.length
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));