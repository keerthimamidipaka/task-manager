"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import API from "@/lib/api";
import Link from "next/link";

interface Member { id: number; name: string; email: string; }
interface Task {
  id: number; title: string; description: string;
  status: string; priority: string; dueDate: string | null;
  assignee: { id: number; name: string } | null;
  creator: { id: number; name: string };
}
interface Project {
  id: number; name: string; description: string;
  owner: { id: number; name: string };
  members: { user: Member; role: string }[];
  tasks: Task[];
}

const STATUS_COLS = ["TODO", "IN_PROGRESS", "DONE"];

export default function ProjectPage() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "MEDIUM", assigneeId: "", dueDate: "" });
  const [memberEmail, setMemberEmail] = useState("");
  const [editTask, setEditTask] = useState<Task | null>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { router.push("/"); return; }
    setUser(JSON.parse(u));
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await API.get(`/projects/${id}`);
      setProject(res.data);
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!taskForm.title) return;
    try {
      await API.post(`/projects/${id}/tasks`, {
        ...taskForm,
        assigneeId: taskForm.assigneeId ? parseInt(taskForm.assigneeId) : null,
        dueDate: taskForm.dueDate || null,
      });
      setTaskForm({ title: "", description: "", priority: "MEDIUM", assigneeId: "", dueDate: "" });
      setShowTaskForm(false);
      fetchProject();
    } catch { alert("Failed to create task"); }
  };

  const updateTaskStatus = async (taskId: number, status: string) => {
    try {
      await API.patch(`/tasks/${taskId}`, { status });
      fetchProject();
    } catch { alert("Failed to update task"); }
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      await API.delete(`/tasks/${taskId}`);
      fetchProject();
    } catch { alert("Failed to delete task"); }
  };

  const addMember = async () => {
    if (!memberEmail) return;
    try {
      await API.post(`/projects/${id}/members`, { email: memberEmail });
      setMemberEmail("");
      setShowMemberForm(false);
      fetchProject();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to add member");
    }
  };

  const priorityColor = (p: string) => {
    if (p === "HIGH") return "bg-red-100 text-red-700 border-red-200";
    if (p === "MEDIUM") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-green-100 text-green-700 border-green-200";
  };

  const statusLabel = (s: string) => s.replace("_", " ");
  const statusBg = (s: string) => {
    if (s === "TODO") return "bg-gray-100";
    if (s === "IN_PROGRESS") return "bg-blue-50";
    return "bg-green-50";
  };
  const statusHeader = (s: string) => {
    if (s === "TODO") return "bg-gray-500";
    if (s === "IN_PROGRESS") return "bg-blue-500";
    return "bg-green-500";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  if (!project) return null;

  const tasksByStatus = (status: string) => project.tasks.filter(t => t.status === status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm">← Dashboard</Link>
          <span className="text-gray-300">|</span>
          <span className="text-xl font-bold text-gray-800">✅ {project.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user?.name} ({user?.role})</span>
          <button onClick={() => { localStorage.clear(); router.push("/"); }} className="text-sm text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Project Header */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
              {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
              <p className="text-sm text-gray-400 mt-1">Owner: {project.owner.name}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowMemberForm(!showMemberForm)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition">
                + Add Member
              </button>
              <button onClick={() => setShowTaskForm(!showTaskForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
                + New Task
              </button>
            </div>
          </div>

          {/* Members */}
          <div className="mt-4 flex flex-wrap gap-2">
            {project.members.map((m) => (
              <span key={m.user.id} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                👤 {m.user.name} <span className="text-gray-400">({m.role})</span>
              </span>
            ))}
          </div>

          {/* Add Member Form */}
          {showMemberForm && (
            <div className="mt-4 bg-indigo-50 rounded-lg p-4 flex gap-3">
              <input
                type="email" placeholder="Member's email address"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button onClick={addMember} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition">Add</button>
              <button onClick={() => setShowMemberForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          )}

          {/* New Task Form */}
          {showTaskForm && (
            <div className="mt-4 bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Create New Task</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Task title *"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none col-span-2"
                />
                <input type="text" placeholder="Description (optional)"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none col-span-2"
                />
                <select value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                </select>
                <select value={taskForm.assigneeId}
                  onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">Unassigned</option>
                  {project.members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                  ))}
                </select>
                <input type="date" value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={createTask} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition">Create Task</button>
                <button onClick={() => setShowTaskForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STATUS_COLS.map((status) => (
            <div key={status} className={`rounded-xl ${statusBg(status)} border border-gray-200`}>
              <div className={`${statusHeader(status)} text-white px-4 py-3 rounded-t-xl flex justify-between items-center`}>
                <h3 className="font-semibold text-sm">{statusLabel(status)}</h3>
                <span className="bg-white bg-opacity-30 text-xs px-2 py-0.5 rounded-full">{tasksByStatus(status).length}</span>
              </div>
              <div className="p-3 space-y-3 min-h-32">
                {tasksByStatus(status).length === 0 ? (
                  <p className="text-gray-400 text-xs text-center py-4">No tasks</p>
                ) : (
                  tasksByStatus(status).map((task) => (
                    <div key={task.id} className="bg-white rounded-lg shadow-sm p-3 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-gray-800 text-sm">{task.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(task.priority)}`}>{task.priority}</span>
                      </div>
                      {task.description && <p className="text-xs text-gray-500 mb-2">{task.description}</p>}
                      {task.assignee && <p className="text-xs text-gray-400 mb-2">👤 {task.assignee.name}</p>}
                      {task.dueDate && (
                        <p className="text-xs text-gray-400 mb-2">
                          📅 {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                      {/* Status Actions */}
                      <div className="flex gap-1 flex-wrap mt-2">
                        {STATUS_COLS.filter(s => s !== status).map((s) => (
                          <button key={s} onClick={() => updateTaskStatus(task.id, s)}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded transition">
                            → {statusLabel(s)}
                          </button>
                        ))}
                        <button onClick={() => deleteTask(task.id)}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-500 px-2 py-1 rounded transition ml-auto">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}