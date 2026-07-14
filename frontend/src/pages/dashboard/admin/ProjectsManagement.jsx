import { useEffect, useState } from "react";
import {
  FiFolder,
  FiPlusCircle,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheckCircle,
  FiRefreshCw,
  FiTrendingUp,
  FiPieChart,
  FiLayers,
} from "react-icons/fi";

import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../../../services/projectService";

import { getDepartments } from "../../../services/departmentService";
import DashboardLayout from "../../../components/layout/DashboardLayout";

export default function ProjectsManagement() {
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "PLANNED",
    budget: "",
    departmentId: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectsRes, departmentsRes] = await Promise.all([
        getProjects(),
        getDepartments(),
      ]);

      setProjects(projectsRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      console.error(error);
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
      status: "PLANNED",
      budget: "",
      departmentId: "",
    });
  };

  const handleEdit = (project) => {
    setEditId(project.id);
    setForm({
      title: project.title || "",
      description: project.description || "",
      status: project.status || "PLANNED",
      budget: project.Budget?.totalBudget || 0,
      departmentId: project.departmentId || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await deleteProject(id);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        budget: Number(form.budget),
        departmentId: Number(form.departmentId),
      };

      if (editId) {
        await updateProject(editId, payload);
      } else {
        await createProject(payload);
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/50";
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-700 border-blue-200/50";
      case "ON_HOLD":
        return "bg-amber-50 text-amber-700 border-amber-200/50";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Dynamic Metrics and Analytics Aggregations
  const totalProjects = projects.length;
  
  const totalCapitalAllocated = projects.reduce(
    (sum, p) => sum + (Number(p.Budget?.totalBudget) || 0), 
    0
  );

  const inProgressCount = projects.filter((p) => p.status === "IN_PROGRESS").length;
  const completedCount = projects.filter((p) => p.status === "COMPLETED").length;

  return (
    <DashboardLayout>
      <div className="bg-[#fafafa] min-h-screen p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto text-slate-600 antialiased">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Projects Registry
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage ministry projects, capital budgets, and department milestone metrics.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-xl border border-slate-100 shadow-sm transition-colors"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Registry
          </button>
        </div>

        {/* VISUAL ANALYTICS KANBAN SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { 
              title: "Total Capital Frame", 
              value: `${totalCapitalAllocated.toLocaleString("fr-MA")} MAD`, 
              sub: "Aggregated active portfolio", 
              icon: <FiTrendingUp className="text-emerald-600" size={16} />,
              bg: "bg-emerald-50/50"
            },
            { 
              title: "Active Portfolios", 
              value: totalProjects, 
              sub: "Registered core projects", 
              icon: <FiLayers className="text-slate-700" size={16} />,
              bg: "bg-slate-50"
            },
            { 
              title: "In Progress", 
              value: inProgressCount, 
              sub: "Active implementation pipelines", 
              icon: <FiPieChart className="text-blue-600" size={16} />,
              bg: "bg-blue-50/40"
            },
            { 
              title: "Completed Sign-offs", 
              value: completedCount, 
              sub: "Archived delivery frameworks", 
              icon: <FiCheckCircle className="text-purple-600" size={16} />,
              bg: "bg-purple-50/40"
            }
          ].map((card, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</p>
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 mt-1.5">{card.value}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.bg}`}>
                {card.icon}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* CONFIGURATION EDITOR FORM */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm h-fit">
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-3 rounded-xl text-white ${editId ? "bg-amber-600" : "bg-slate-900"}`}>
                <FiFolder />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Project Registry Editor
                </p>
                <h3 className="font-bold text-slate-900 tracking-tight">
                  {editId ? "Update Parameters" : "Provision Framework"}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Project Title</label>
                <input
                  type="text"
                  placeholder="Enter project title..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-slate-400 outline-none bg-white placeholder:text-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Scope Description</label>
                <textarea
                  rows={4}
                  placeholder="Define targeted parameters & scope metrics..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-slate-400 outline-none bg-white placeholder:text-slate-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Vector</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white focus:ring-1 focus:ring-slate-400 outline-none font-medium text-slate-700"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ON_HOLD">On Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Capital Budget Allocations (MAD)</label>
                <input
                  type="number"
                  placeholder="Total Financial Capital allocation"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-slate-400 outline-none bg-white placeholder:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Governing Authority</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white focus:ring-1 focus:ring-slate-400 outline-none font-medium text-slate-700"
                  required
                >
                  <option value="">Select Department Context</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 text-white p-3 rounded-xl text-sm font-semibold tracking-wide transition-all shadow-sm ${
                    editId ? "bg-amber-600 hover:bg-amber-700" : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {submitting ? "Processing..." : editId ? "Update Project" : "Create Project"}
                </button>

                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 rounded-xl transition-colors"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* OPERATIONS PIPELINE REGISTRY */}
          <div className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="mb-5 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 tracking-tight">
                Active Governance Frameworks
              </h2>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                {totalProjects} Entries Total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 pr-2 w-[40%]">Project</th>
                    <th className="py-3 px-2 w-[20%]">Status</th>
                    <th className="py-3 px-2 w-[20%]">Allocations</th>
                    <th className="py-3 px-2 w-[15%]">Department</th>
                    <th className="py-3 pl-2 text-right w-[5%]">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="py-4 pr-2">
                        <div className="font-bold text-slate-900 tracking-tight">
                          {project.title}
                        </div>
                        {project.description && (
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-[280px]">
                            {project.description}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-2">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold border tracking-wide uppercase ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </td>

                      <td className="py-4 px-2 font-medium text-slate-700 text-xs">
                        {(project.Budget?.totalBudget ?? 0).toLocaleString("fr-MA")} MAD
                      </td>

                      <td className="py-4 px-2 text-xs font-medium text-slate-500">
                        {project.Department?.name || project.department?.name || "-"}
                      </td>

                      <td className="py-4 pl-2 text-right">
                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(project)}
                            className="text-slate-400 hover:text-amber-600 transition-colors p-1 rounded"
                          >
                            <FiEdit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {projects.length === 0 && (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Registry pipeline completely empty. Add your first context project.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}