"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import Link from "next/link";

interface Stats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  project: { id: number; name: string };
  assignee: { name: string } | null;
}

interface Project {
  id: number;
  name: string;
  description: string;
  tasks: any[];
  members: any[];
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { router.push("/"); return; }
    setUser(JSON.parse(u));
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, projRes] = await Promise.all([
        API.get("/dashboard"),
        API.get("/projects")
      ]);
      setStats(dashRes.data.stats);
      setRecentTasks(dashRes.data.recentTasks);
      setProjects(projRes.data);
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProject.name) return;
    try {
      await API.post("/projects", newProject);
      setNewProject({ name: "", description: "" });
      setShowNewProject(false);
      fetchData();
    } catch {
      alert("Failed to create project");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const statusColor = (status: string) => {
    if (status === "TODO") return "bg-gray-100 text-gray-600";
    if (status === "IN_PROGRESS") return "bg-blue-100 text-blue-700";
    if (status === "DONE") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-600";
  };

  const priorityColor = (priority: string) => {
    if (priority === "HIGH") return "bg-red-100 text-red-700";
    if (priority === "MEDIUM") return "bg-yellow-100 text-yellow-700";
    if (priority === "LOW") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-600";
  };

  const priorityDot = (priority: string) => {
    if (priority === "HIGH") return "bg-red-500";
    if (priority === "MEDIUM") return "bg-yellow-500";
    return "bg-green-500";
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === "DONE") return false;
    return new Date(dueDate) < new Date();
  };

  const getProgress = (tasks: any[]) => {
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter(t => t.status === "DONE").length / tasks.length) * 100);
  };

  const filteredTasks = recentTasks.filter(t => {
    if (filter === "ALL") return true;
    return t.status === filter;
  });

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">⏳</div>
        <p className="text-gray-500 text-lg">Loading your workspace...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">TM</div>
          <span className="text-xl font-bold text-gray-800">Task Manager</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {user?.name ? getInitials(user.name) : "U"}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-1 ${user?.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
              {user?.role}
            </span>
          </div>
          <button onClick={logout} className="text-sm bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
          <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.name}! 👋</h1>
          <p className="text-blue-200 text-sm">
            You have {stats?.inProgress || 0} tasks in progress and {stats?.overdue || 0} overdue tasks.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total Tasks", value: stats.total, icon: "📋", color: "border-blue-200 bg-blue-50", textColor: "text-blue-600" },
              { label: "To Do", value: stats.todo, icon: "⏳", color: "border-gray-200 bg-gray-50", textColor: "text-gray-600" },
              { label: "In Progress", value: stats.inProgress, icon: "🔄", color: "border-yellow-200 bg-yellow-50", textColor: "text-yellow-600" },
              { label: "Done", value: stats.done, icon: "✅", color: "border-green-200 bg-green-50", textColor: "text-green-600" },
              { label: "Overdue", value: stats.overdue, icon: "🔴", color: "border-red-200 bg-red-50", textColor: "text-red-600" },
            ].map((s) => (
              <div key={s.label} className={`bg-white rounded-xl shadow-sm border ${s.color} p-4 text-center`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className={`text-3xl font-bold ${s.textColor}`}>{s.value}</div>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Progress Overview */}
        {stats && stats.total > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Overall Progress</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${Math.round((stats.done / stats.total) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700">
                {Math.round((stats.done / stats.total) * 100)}% Complete
              </span>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>📊 {stats.total} total</span>
              <span>✅ {stats.done} done</span>
              <span>🔄 {stats.inProgress} in progress</span>
              <span>⏳ {stats.todo} to do</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Projects */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">📁 Projects</h2>
                <p className="text-xs text-gray-400">{projects.length} active projects</p>
              </div>
              <button
                onClick={() => setShowNewProject(true)}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
              >
                + New Project
              </button>
            </div>

            {showNewProject && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Create New Project</h3>
                <input
                  type="text"
                  placeholder="Project name *"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button onClick={createProject} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
                    Create Project
                  </button>
                  <button onClick={() => setShowNewProject(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {projects.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📂</div>
                <p className="text-gray-400 text-sm">No projects yet.</p>
                <p className="text-gray-300 text-xs">Create your first project!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => {
                  const progress = getProgress(p.tasks);
                  const doneTasks = p.tasks.filter((t: any) => t.status === "DONE").length;
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`}>
                      <div className="border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition">{p.name}</h3>
                            {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {p.tasks.length} tasks
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{doneTasks}/{p.tasks.length} completed</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-green-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        {/* Members */}
                        {p.members && p.members.length > 0 && (
                          <div className="flex items-center gap-1 mt-3">
                            {p.members.slice(0, 4).map((m: any, i: number) => (
                              <div key={i} className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center -ml-1 first:ml-0 border border-white">
                                {getInitials(m.user?.name || "U")}
                              </div>
                            ))}
                            {p.members.length > 4 && (
                              <span className="text-xs text-gray-400 ml-1">+{p.members.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Tasks */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">📋 Recent Tasks</h2>
                <p className="text-xs text-gray-400">{recentTasks.length} recent tasks</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {["ALL", "TODO", "IN_PROGRESS", "DONE"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                    filter === f
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>

            {filteredTasks.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-gray-400 text-sm">No tasks found.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTasks.map((t) => (
                  <Link key={t.id} href={`/projects/${t.project.id}`}>
                    <div className={`border rounded-xl p-3 hover:shadow-md transition cursor-pointer ${
                      isOverdue(t.dueDate, t.status) ? "border-red-200 bg-red-50" : "border-gray-200"
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${priorityDot(t.priority)}`} />
                          <p className="font-medium text-gray-800 text-sm">{t.title}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(t.priority)}`}>
                          {t.priority}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">📁 {t.project.name}</span>
                          {t.assignee && <span className="text-xs text-gray-400">👤 {t.assignee.name}</span>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </div>
                      {isOverdue(t.dueDate, t.status) && (
                        <p className="text-xs text-red-500 mt-1">⚠️ Overdue!</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}