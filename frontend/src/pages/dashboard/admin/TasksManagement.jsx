import { useEffect, useState } from "react";
import {
  FiCheckSquare,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSearch,
  FiClock,
  FiAlertCircle,
  FiAlertTriangle,
} from "react-icons/fi";

import DashboardLayout from "../../../components/layout/DashboardLayout";

import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../../../services/taskService";

import { getProjects } from "../../../services/projectService";
import { getUsers } from "../../../services/userService";

export default function TasksManagement() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: "",
    assigneeId: "",
    dueDate: "",
    status: "TODO",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        getTasks(),
        getProjects(),
        getUsers(),
      ]);

      setTasks(tasksRes.data || []);
      setProjects(projectsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setForm({
      title: "",
      description: "",
      projectId: "",
      assigneeId: "",
      dueDate: "",
      status: "TODO",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const payload = {
        ...form,
        projectId: Number(form.projectId),
        assigneeId: Number(form.assigneeId),
      };

      if (editId) {
        await updateTask(editId, payload);
      } else {
        await createTask(payload);
      }

      resetForm();
      await fetchData();
    } catch (err) {
      console.error("Error saving task:", err);
      alert("Failed to save task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (task) => {
    setEditId(task.id);
    setForm({
      title: task.title || "",
      description: task.description || "",
      projectId: task.projectId || "",
      assigneeId: task.assigneeId || "",
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      status: task.status || "TODO",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      setLoading(true);
      await deleteTask(id);
      await fetchData();
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper validation tools
  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === "DONE") return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Statistics Calculations
  const totalTasks = tasks.length;
  const todoTasks = tasks.filter((task) => task.status === "TODO").length;
  const progressTasks = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const completedTasks = tasks.filter((task) => task.status === "DONE").length;
  
  // Calculate specific total of overdue targets
  const overdueCount = tasks.filter((task) => isOverdue(task.dueDate, task.status)).length;

  const filteredTasks = tasks.filter(
    (task) =>
      task.title?.toLowerCase().includes(search.toLowerCase()) ||
      task.description?.toLowerCase().includes(search.toLowerCase()) ||
      task.Project?.title?.toLowerCase().includes(search.toLowerCase()) ||
      task.assignee?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "DONE":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "IN_PROGRESS":
        return "bg-amber-50 text-amber-700 border-amber-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getProgress = (status) => {
    switch (status) {
      case "DONE":
        return 100;
      case "IN_PROGRESS":
        return 60;
      default:
        return 20;
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (id) => {
    const colors = ["bg-slate-600", "bg-slate-700", "bg-zinc-600", "bg-neutral-600"];
    return colors[id % colors.length] || colors[0];
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#fafafa] p-8 text-slate-600 antialiased">
        {/* Page Header */}
        <div className="mb-8 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                <FiCheckSquare className="text-slate-900" size={22} />
                Tasks Management
              </h1>
              <p className="text-sm text-slate-400 mt-1">Organize, assign, and track workspace operations.</p>
            </div>
            <div className="text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              {totalTasks} total tasks
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {[
            { label: "Total Tasks", val: totalTasks, color: "text-slate-900" },
            { label: "To Do", val: todoTasks, color: "text-slate-600" },
            { label: "In Progress", val: progressTasks, color: "text-amber-600" },
            { label: "Completed", val: completedTasks, color: "text-emerald-600" },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <h2 className={`text-3xl font-bold mt-2 tracking-tight ${stat.color}`}>
                {stat.val}
              </h2>
            </div>
          ))}
        </div>

        {/* Overdue Notification Banner */}
        {overdueCount > 0 && (
          <div className="mb-8 p-4 bg-red-50/70 border border-red-100 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in">
            <FiAlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-900 tracking-tight">
                Attention Needed: Overdue Tasks Detected
              </h3>
              <p className="text-xs text-red-700/90 mt-0.5">
                There are currently <strong className="font-semibold">{overdueCount}</strong> task{overdueCount !== 1 ? "s" : ""} past due thresholds. Review timelines or update statuses below to keep metrics accurate.
              </p>
            </div>
            <button 
              onClick={() => setSearch("Overdue")} 
              className="text-xs font-semibold bg-white text-red-700 border border-red-200 rounded-lg px-3 py-1.5 shadow-sm hover:bg-red-50 transition-colors"
            >
              Filter Registry
            </button>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Form Section */}
          <div className="lg:col-span-1 sticky top-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
              <h2 className="font-bold text-base text-slate-900 mb-5 tracking-tight">
                {editId ? "Update Task Details" : "Create New Task"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Task Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter task title..."
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all placeholder:text-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Description
                  </label>
                  <textarea
                    placeholder="Enter task description..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows="3"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all resize-none placeholder:text-slate-300"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Project Target
                  </label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all bg-white"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Assign To
                  </label>
                  <select
                    value={form.assigneeId}
                    onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all bg-white"
                    required
                  >
                    <option value="">Select User</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all bg-white"
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? (
                      <span className="inline-block animate-spin">⟳</span>
                    ) : editId ? (
                      "Update Task"
                    ) : (
                      "Create Task"
                    )}
                  </button>

                  {editId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3.5 rounded-lg transition-all"
                    >
                      <FiX size={16} />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Table Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base text-slate-900 tracking-tight">
                    Tasks Registry
                  </h2>
                </div>
                <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                  {filteredTasks.length} of {totalTasks} shown
                </span>
              </div>

              {/* Search Bar Wrapper */}
              <div className="p-4 bg-slate-50/60 border-b border-slate-100 relative">
                <FiSearch className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Filter tasks by name, keywords, project context..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all bg-white placeholder:text-slate-400"
                />
              </div>

              {loading && !tasks.length ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin text-xl text-slate-400 mb-2">⟳</div>
                  <p className="text-slate-400 text-xs">Loading operational registry...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200/80">
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[35%]">Task</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[20%]">Project Context</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[20%]">Assignee</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[15%]">Timeline</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-[10%]">Status</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredTasks.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-16 text-slate-400 text-xs">
                            {search ? "No matching operations located." : "Registry empty. Add your initial workspace task."}
                          </td>
                        </tr>
                      ) : (
                        filteredTasks.map((task) => {
                          const overdue = isOverdue(task.dueDate, task.status);
                          const daysUntil = getDaysUntilDue(task.dueDate);
                          const progress = getProgress(task.status);

                          // Skip if manual filter "Overdue" is pressed and item doesn't fit
                          if (search === "Overdue" && !overdue) return null;

                          return (
                            <tr key={task.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="p-4 align-top">
                                <div className="font-semibold text-slate-900 tracking-tight">
                                  {task.title}
                                </div>
                                {task.description && (
                                  <div className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-[240px]">
                                    {task.description}
                                  </div>
                                )}
                                <div className="w-24 bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      progress === 100
                                        ? "bg-emerald-500"
                                        : progress >= 60
                                        ? "bg-amber-500"
                                        : "bg-slate-400"
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </td>

                              <td className="p-4 align-top">
                                <span className="inline-block text-xs font-medium text-slate-600 bg-slate-100/70 border border-slate-200/50 px-2 py-0.5 rounded">
                                  {task.Project?.title || "-"}
                                </span>
                              </td>

                              <td className="p-4 align-top">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-6 h-6 rounded-md text-white flex items-center justify-center text-[10px] font-bold ${getRandomColor(
                                      task.assigneeId || 0
                                    )}`}
                                  >
                                    {getInitials(task.assignee?.name)}
                                  </div>
                                  <span className="text-xs font-medium text-slate-700">
                                    {task.assignee?.name || "Unassigned"}
                                  </span>
                                </div>
                              </td>

                              <td className="p-4 align-top whitespace-nowrap">
                                <div className="flex flex-col">
                                  {task.dueDate ? (
                                    <>
                                      <span className="text-xs font-medium text-slate-700">
                                        {new Date(task.dueDate).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })}
                                      </span>
                                      {overdue ? (
                                        <span className="text-red-600 text-[11px] font-semibold flex items-center gap-1 mt-1">
                                          <FiAlertCircle size={11} /> Overdue
                                        </span>
                                      ) : daysUntil !== null && daysUntil <= 3 && daysUntil >= 0 ? (
                                        <span className="text-amber-600 text-[11px] font-semibold flex items-center gap-1 mt-1">
                                          <FiClock size={11} /> {daysUntil}d left
                                        </span>
                                      ) : daysUntil !== null && daysUntil > 0 ? (
                                        <span className="text-slate-400 text-[11px] mt-0.5">
                                          {daysUntil}d rem.
                                        </span>
                                      ) : null}
                                    </>
                                  ) : (
                                    <span className="text-slate-300 text-xs italic">-</span>
                                  )}
                                </div>
                              </td>

                              <td className="p-4 align-top">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border tracking-wide ${getStatusBadge(
                                    task.status
                                  )}`}
                                >
                                  {task.status}
                                </span>
                              </td>

                              <td className="p-4 align-top text-right">
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => handleEdit(task)}
                                    className="text-slate-400 hover:text-slate-900 transition-colors p-1 hover:bg-slate-100 rounded"
                                    title="Edit configuration"
                                  >
                                    <FiEdit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(task.id)}
                                    className="text-slate-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                                    title="Remove index"
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}