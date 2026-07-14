import { useEffect, useState, useCallback } from "react";
import {
  FiDollarSign,
  FiPlusCircle,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiX,
  FiAlertTriangle,
  FiBell,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

import DashboardLayout from "../../../components/layout/DashboardLayout";
import BudgetChart from "../../../components/charts/BudgetChart";
import ProgressBar from "../../../components/charts/ProgressBar";
import NotificationCenter from "../../../components/charts/NotificationCenter";
import BudgetAlert from "../../../components/charts/BudgetAlert";
import CronMonitor from "../../../components/charts/CronMonitor";

import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetAnalytics,
} from "../../../services/budgetService";

import { getProjects } from "../../../services/projectService";

export default function BudgetManagement() {
  const [budgets, setBudgets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedProject, setSelectedProject] = useState("all");

  const [form, setForm] = useState({
    totalBudget: "",
    spent: "",
    projectId: "",
    category: "",
    startDate: "",
    endDate: "",
  });

  // 📊 Auto-create budget when project is created
  const autoCreateBudget = useCallback(async (projectId) => {
    try {
      // Check if budget already exists for this project
      const existingBudget = budgets.find(b => b.projectId === projectId);
      if (existingBudget) return;

      const estimatedBudget = await calculateEstimatedBudget(projectId);
      const payload = {
        totalBudget: estimatedBudget,
        spent: 0,
        projectId: projectId,
        category: "auto-created",
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
      
      await createBudget(payload);
      await fetchData();
      addNotification("💰 Auto-budget created for new project", "success");
    } catch (err) {
      console.error("Auto-budget creation failed:", err);
    }
  }, [budgets]);

  const calculateEstimatedBudget = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return 10000;
    // Dynamic estimation based on project complexity
    const baseAmount = 10000;
    const complexityMultiplier = project.complexity || 1;
    const hoursMultiplier = project.estimatedHours || 100;
    return Math.round(baseAmount * complexityMultiplier + hoursMultiplier * 50);
  };

  // 🔔 Notification system
  const addNotification = (message, type = "info") => {
    const newNotification = {
      id: Date.now(),
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
    
    // Also send to backend
    saveNotificationToBackend(newNotification);
  };

  const saveNotificationToBackend = async (notification) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });
    } catch (err) {
      console.error('Failed to save notification:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [budgetsRes, projectsRes, analyticsRes] = await Promise.all([
        getBudgets(),
        getProjects(),
        getBudgetAnalytics().catch(() => ({ data: null })),
      ]);

      setBudgets(budgetsRes.data || []);
      setProjects(projectsRes.data || []);
      setAnalytics(analyticsRes.data || null);
      
      // 🔥 Check for overspending
      checkOverspending(budgetsRes.data || []);
      
      // Fetch notifications from backend
      fetchNotifications();
    } catch (err) {
      console.error(err);
      addNotification("Error loading budget data", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // 🚨 Alert system with multiple severity levels
  const checkOverspending = (budgetsList) => {
    const newAlerts = [];
    
    budgetsList.forEach(budget => {
      if (!budget.totalBudget || budget.totalBudget === 0) return;
      
      const percent = (budget.spent / budget.totalBudget) * 100;
      const projectName = budget.Project?.title || "Unknown Project";
      
      if (percent >= 100) {
        newAlerts.push({
          id: budget.id,
          projectName,
          message: `🚨 CRITICAL: Budget overspent by ${(percent - 100).toFixed(1)}%`,
          severity: "critical",
          timestamp: new Date().toISOString(),
          budget: budget,
        });
        addNotification(`🚨 Budget exceeded for ${projectName}`, "error");
      } else if (percent >= 80) {
        newAlerts.push({
          id: budget.id,
          projectName,
          message: `⚠️ WARNING: Budget at ${percent.toFixed(1)}% usage`,
          severity: "warning",
          timestamp: new Date().toISOString(),
          budget: budget,
        });
        addNotification(`⚠️ Budget nearing limit for ${projectName}`, "warning");
      } else if (percent >= 60) {
        newAlerts.push({
          id: budget.id,
          projectName,
          message: `ℹ️ INFO: Budget at ${percent.toFixed(1)}% usage`,
          severity: "info",
          timestamp: new Date().toISOString(),
          budget: budget,
        });
      }
    });
    
    setAlerts(newAlerts);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setForm({
      totalBudget: "",
      spent: "",
      projectId: "",
      category: "",
      startDate: "",
      endDate: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const total = Number(form.totalBudget);
      const spent = Number(form.spent);

      const payload = {
        totalBudget: total,
        spent: spent,
        projectId: Number(form.projectId),
        category: form.category || "uncategorized",
        startDate: form.startDate || new Date().toISOString().split('T')[0],
        endDate: form.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

      if (editId) {
        await updateBudget(editId, payload);
        addNotification("✅ Budget updated successfully", "success");
      } else {
        await createBudget(payload);
        addNotification("✅ Budget created successfully", "success");
      }

      resetForm();
      await fetchData();

      // 🔔 Check for overspending after creation
      if (spent > total) {
        addNotification("⚠️ Warning: This budget is OVERSPENT!", "error");
      }
    } catch (err) {
      console.error(err);
      addNotification("❌ Error saving budget", "error");
    }
  };

  const handleEdit = (budget) => {
    setEditId(budget.id);
    setForm({
      totalBudget: budget.totalBudget,
      spent: budget.spent,
      projectId: budget.projectId,
      category: budget.category || "",
      startDate: budget.startDate || "",
      endDate: budget.endDate || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this budget?")) return;

    try {
      await deleteBudget(id);
      await fetchData();
      addNotification("🗑️ Budget deleted successfully", "info");
    } catch (err) {
      console.error(err);
      addNotification("❌ Error deleting budget", "error");
    }
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    
    // Update backend
    fetch(`/api/notifications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    }).catch(err => console.error('Failed to mark notification as read:', err));
  };

  const clearNotifications = () => {
    setNotifications([]);
    // Clear backend notifications
    fetch('/api/notifications/clear', {
      method: 'DELETE',
    }).catch(err => console.error('Failed to clear notifications:', err));
  };

  // Filter budgets by selected project
  const filteredBudgets = selectedProject === "all" 
    ? budgets 
    : budgets.filter(b => b.projectId === parseInt(selectedProject));

  // 📊 Advanced Analytics
  const totalBudgetValue = filteredBudgets.reduce(
    (acc, b) => acc + Number(b.totalBudget || 0), 0
  );
  const totalSpentValue = filteredBudgets.reduce(
    (acc, b) => acc + Number(b.spent || 0), 0
  );
  const totalRemainingValue = totalBudgetValue - totalSpentValue;
  const averageUsage = totalBudgetValue > 0 
    ? (totalSpentValue / totalBudgetValue) * 100 
    : 0;
  const budgetCount = filteredBudgets.length;
  const overspentCount = filteredBudgets.filter(b => b.spent > b.totalBudget).length;

  // 🎯 Progress tracking data
  const progressData = {
    completed: filteredBudgets.filter(b => b.spent >= b.totalBudget).length,
    inProgress: filteredBudgets.filter(b => b.spent > 0 && b.spent < b.totalBudget).length,
    notStarted: filteredBudgets.filter(b => b.spent === 0).length,
    overspent: overspentCount,
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#fafafa] p-6 space-y-6">

        {/* HEADER with Notification Center */}
        <div className="bg-white rounded-3xl p-6 flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <FiDollarSign className="text-emerald-600" />
              Budget Control Center
            </h1>
            <p className="text-sm text-slate-500">
              Full budget tracking system v2 | {budgetCount} budgets tracked
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <NotificationCenter 
              notifications={notifications}
              onMarkRead={markNotificationRead}
              onClearAll={clearNotifications}
              show={showNotifications}
              setShow={setShowNotifications}
            />
            
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* 🔔 ALERT SYSTEM - Critical alerts banner */}
        {alerts.filter(a => a.severity === 'critical').length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-red-700 flex items-center gap-2">
              <FiAlertTriangle className="animate-pulse" /> 
              Critical Budget Alerts
            </h3>
            <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
              {alerts
                .filter(a => a.severity === 'critical')
                .map(alert => (
                  <BudgetAlert key={alert.id} alert={alert} />
                ))}
            </div>
          </div>
        )}

        {/* 📊 ANALYTICS CARDS with improved design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-emerald-500">
            <p className="text-sm text-slate-500">Total Budget</p>
            <h2 className="text-2xl font-black">{totalBudgetValue.toLocaleString()} MAD</h2>
            <p className="text-xs text-slate-400 mt-1">{budgetCount} budgets</p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-red-500">
            <p className="text-sm text-slate-500">Total Spent</p>
            <h2 className="text-2xl font-black text-red-600">{totalSpentValue.toLocaleString()} MAD</h2>
            <p className="text-xs text-red-400 mt-1">{overspentCount} overspent</p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-slate-500">Remaining</p>
            <h2 className="text-2xl font-black text-blue-600">{totalRemainingValue.toLocaleString()} MAD</h2>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((totalSpentValue / totalBudgetValue) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-purple-500">
            <p className="text-sm text-slate-500">Usage Rate</p>
            <h2 className="text-2xl font-black text-purple-600">{averageUsage.toFixed(1)}%</h2>
            <p className="text-xs text-purple-400 mt-1">Average across projects</p>
          </div>
        </div>

        {/* 📈 BUDGET CHART - Live visualization */}
        <BudgetChart budgets={filteredBudgets} />

        {/* 🔔 WARNING ALERTS - Non-critical */}
        {alerts.filter(a => a.severity === 'warning').length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <h3 className="font-bold text-yellow-700 flex items-center gap-2">
              <FiAlertCircle /> Budget Warnings
            </h3>
            <div className="space-y-2 mt-2">
              {alerts
                .filter(a => a.severity === 'warning')
                .slice(0, 3)
                .map(alert => (
                  <BudgetAlert key={alert.id} alert={alert} />
                ))}
              {alerts.filter(a => a.severity === 'warning').length > 3 && (
                <p className="text-sm text-yellow-600">
                  +{alerts.filter(a => a.severity === 'warning').length - 3} more warnings
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">

          {/* FORM - Enhanced with category and dates */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="font-black mb-4 flex items-center gap-2">
              {editId ? <FiEdit2 className="text-blue-600" /> : <FiPlusCircle className="text-emerald-600" />}
              {editId ? "Edit Budget" : "Create Budget"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <select
                value={form.projectId}
                onChange={(e) => {
                  setForm({ ...form, projectId: e.target.value });
                  // Auto-populate budget if project selected
                  const project = projects.find(p => p.id === parseInt(e.target.value));
                  if (project && !editId) {
                    const estimatedBudget = Math.round((project.complexity || 1) * 10000 + (project.estimatedHours || 100) * 50);
                    setForm(prev => ({ ...prev, totalBudget: estimatedBudget.toString() }));
                  }
                }}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Category (e.g., Development, Marketing)"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <input
                type="number"
                placeholder="Total Budget (MAD)"
                value={form.totalBudget}
                onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />

              <input
                type="number"
                placeholder="Spent (MAD)"
                value={form.spent}
                onChange={(e) => setForm({ ...form, spent: e.target.value })}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />

              {/* 🔴 LIVE OVERSPENDING DETECTION */}
              {form.totalBudget && form.spent && Number(form.spent) > Number(form.totalBudget) && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl animate-pulse">
                  <FiAlertTriangle />
                  Overspending detected! Spent exceeds budget by {((Number(form.spent) - Number(form.totalBudget))).toFixed(0)} MAD
                </div>
              )}

              {/* 📊 Live Progress Preview */}
              {form.totalBudget && form.spent && Number(form.totalBudget) > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress Preview</span>
                    <span className={Number(form.spent) > Number(form.totalBudget) ? 'text-red-600' : 'text-emerald-600'}>
                      {((Number(form.spent) / Number(form.totalBudget)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar 
                    value={Number(form.spent)} 
                    max={Number(form.totalBudget)} 
                  />
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                {editId ? <FiEdit2 /> : <FiPlusCircle />}
                {editId ? "Update Budget" : "Create Budget"}
              </button>

              {editId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full mt-2 bg-slate-200 p-3 rounded-xl hover:bg-slate-300 transition flex items-center justify-center gap-2"
                >
                  <FiX /> Cancel Edit
                </button>
              )}
            </form>
          </div>

          {/* TABLE with progress bars */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black">Budget Registry</h2>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="p-2 border rounded-xl text-sm"
              >
                <option value="all">All Projects ({budgets.length})</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th className="pb-2">Project</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Budget</th>
                    <th className="pb-2">Spent</th>
                    <th className="pb-2">Progress</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBudgets.map((b) => {
                    const percent = b.totalBudget > 0 
                      ? (b.spent / b.totalBudget) * 100 
                      : 0;
                    const isOverspent = percent > 100;
                    
                    return (
                      <tr key={b.id} className="border-b hover:bg-slate-50 transition">
                        <td className="py-3 font-medium">{b.Project?.title || "N/A"}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            b.category === 'auto-created' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {b.category || "Uncategorized"}
                          </span>
                        </td>
                        <td className="py-3">{b.totalBudget.toLocaleString()} MAD</td>
                        <td className={`py-3 ${isOverspent ? 'text-red-600 font-bold' : ''}`}>
                          {b.spent.toLocaleString()} MAD
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <ProgressBar 
                              value={b.spent} 
                              max={b.totalBudget} 
                              showLabel={false}
                            />
                            <span className={`text-sm font-medium ${isOverspent ? 'text-red-600' : 'text-emerald-600'}`}>
                              {percent.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEdit(b)}
                              className="text-blue-600 hover:text-blue-800 transition p-1"
                            >
                              <FiEdit2 />
                            </button>
                            <button 
                              onClick={() => handleDelete(b.id)}
                              className="text-red-600 hover:text-red-800 transition p-1"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBudgets.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-500">
                        No budgets found. Create one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 🎯 PROGRESS TRACKING */}
        <div className="grid md:grid-cols-4 gap-5">
          <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <FiCheckCircle className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-xl font-black">{progressData.completed}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FiClock className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="text-xl font-black">{progressData.inProgress}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <FiClock className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Not Started</p>
              <p className="text-xl font-black">{progressData.notStarted}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <FiAlertTriangle className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Overspent</p>
              <p className="text-xl font-black text-red-600">{progressData.overspent}</p>
            </div>
          </div>
        </div>

        {/* ⏰ CRON MONITORING */}
        <CronMonitor 
          budgets={budgets} 
          onAlert={addNotification}
          autoCreateBudget={autoCreateBudget}
        />

        {/* 🤖 AUTO-BUDGET CREATION STATUS */}
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <FiClock className="text-emerald-600" />
              </div>
              <div>
                <span className="font-medium">Auto-Budget Creation</span>
                <p className="text-sm text-slate-500">
                  Automatic budgets created when new projects are added
                </p>
              </div>
            </div>
            <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
              {projects.length} projects monitored
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}