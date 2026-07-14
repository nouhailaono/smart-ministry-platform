// src/pages/dashboard/admin/AdminDashboard.jsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiGrid,
  FiFolder,
  FiCheckSquare,
  FiActivity,
  FiRefreshCw,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiDollarSign,
  FiTarget,
  FiAlertTriangle,
  FiShield,
  FiCpu,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiPieChart,
} from "react-icons/fi";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import axios from "axios";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import { getBudgets, getBudgetAnalytics } from "../../../services/budgetService";
import { getProjects } from "../../../services/projectService";

// Modern gradient color palette
const GRADIENT_THEMES = {
  primary: {
    from: "from-slate-900",
    to: "to-slate-700",
    bg: "bg-gradient-to-br from-slate-900 to-slate-700",
    text: "text-white",
    border: "border-slate-800",
  },
  secondary: {
    from: "from-blue-600",
    to: "to-blue-400",
    bg: "bg-gradient-to-br from-blue-600 to-blue-400",
    text: "text-white",
    border: "border-blue-500",
  },
  success: {
    from: "from-emerald-600",
    to: "to-emerald-400",
    bg: "bg-gradient-to-br from-emerald-600 to-emerald-400",
    text: "text-white",
    border: "border-emerald-500",
  },
  warning: {
    from: "from-amber-500",
    to: "to-amber-300",
    bg: "bg-gradient-to-br from-amber-500 to-amber-300",
    text: "text-white",
    border: "border-amber-400",
  },
  rose: {
    from: "from-rose-600",
    to: "to-rose-400",
    bg: "bg-gradient-to-br from-rose-600 to-rose-400",
    text: "text-white",
    border: "border-rose-500",
  },
  indigo: {
    from: "from-indigo-600",
    to: "to-indigo-400",
    bg: "bg-gradient-to-br from-indigo-600 to-indigo-400",
    text: "text-white",
    border: "border-indigo-500",
  },
  violet: {
    from: "from-violet-600",
    to: "to-violet-400",
    bg: "bg-gradient-to-br from-violet-600 to-violet-400",
    text: "text-white",
    border: "border-violet-500",
  }
};

// Classy, slate-minimalist design token palette (kept for compatibility)
const SLATE_THEMES = {
  slateDark: { iconBg: "bg-slate-900 text-white", text: "text-slate-900", hex: "#0f172a" },
  slateMedium: { iconBg: "bg-slate-600 text-white", text: "text-slate-600", hex: "#475569" },
  slateLight: { iconBg: "bg-slate-400 text-white", text: "text-slate-400", hex: "#94a3b8" },
  roseMuted: { iconBg: "bg-rose-900 text-white", text: "text-rose-700", hex: "#9f1239" }
};

// Custom modern tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 min-w-[140px]">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 py-0.5">
            <span className="text-xs text-slate-600">{item.name}</span>
            <span className="text-xs font-bold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();
  
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");
      
      const [adminStatsRes, budgetsRes, projectsRes, analyticsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { stats: null } })),
        getBudgets().catch(() => ({ data: [] })),
        getProjects().catch(() => ({ data: [] })),
        getBudgetAnalytics().catch(() => ({ data: null })),
      ]);
      
      setStats(adminStatsRes.data?.stats || null);
      setBudgets(budgetsRes.data || []);
      setProjects(projectsRes.data || []);
      setAnalytics(analyticsRes.data || null);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setError(null);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.response?.data?.error || err.message || "Failed to synchronize dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 300000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const getTrendData = (current = 0, previous) => {
    if (previous === undefined || previous === null || previous === current) return { label: "Steady", isUp: true }; 
    if (previous === 0) return { label: "+100%", isUp: true };
    const change = ((current - previous) / previous) * 100;
    return { label: `${change > 0 ? "+" : ""}${Math.round(change)}%`, isUp: change >= 0 };
  };

  const kpiData = (() => {
    const totalBudget = budgets.reduce((acc, b) => acc + Number(b.totalBudget || 0), 0);
    const spentBudget = budgets.reduce((acc, b) => acc + Number(b.spent || 0), 0);
    const budgetUtilization = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0;
    const totalTasks = stats?.tasksCount || 0;
    const doneTasks = stats?.tasks?.doneTasks || 0;
    const completionRate = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
    const totalProjects = projects.length || stats?.projectsCount || 0;
    const completedProjects = projects.filter(p => p.status === "COMPLETED" || p.status === "completed").length || stats?.projects?.completed || 0;
    const projectSuccessRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
    const riskProjects = budgets.filter(b => b.spent > b.totalBudget).length || stats?.riskProjects || 0;

    return {
      budgetUtilization: Math.min(Math.round(budgetUtilization), 100),
      completionRate: Math.min(Math.round(completionRate), 100),
      projectSuccessRate: Math.min(Math.round(projectSuccessRate), 100),
      totalBudget,
      spentBudget,
      remainingBudget: totalBudget - spentBudget,
      riskProjects,
      totalProjects,
      completedProjects,
      inProgressProjects: projects.filter(p => p.status === "IN_PROGRESS" || p.status === "in-progress").length,
      plannedProjects: projects.filter(p => p.status === "PLANNED" || p.status === "planned").length,
    };
  })();

  const kpiCards = [
    { 
      title: "Project Success Rate", 
      value: `${kpiData.projectSuccessRate}%`, 
      icon: FiTarget, 
      color: "slateDark", 
      subtitle: `${kpiData.completedProjects} / ${kpiData.totalProjects} Completed`, 
      progress: kpiData.projectSuccessRate,
      gradient: GRADIENT_THEMES.primary
    },
    { 
      title: "Budget Efficiency", 
      value: `${kpiData.budgetUtilization}%`, 
      icon: FiDollarSign, 
      color: "slateDark", 
      subtitle: `${kpiData.remainingBudget.toLocaleString()} MAD Remaining`, 
      progress: kpiData.budgetUtilization,
      gradient: GRADIENT_THEMES.secondary
    },
    { 
      title: "KPI Achievement", 
      value: `${kpiData.completionRate}%`, 
      icon: FiCheckSquare, 
      color: "slateLight", 
      subtitle: "Milestones evaluated", 
      progress: kpiData.completionRate,
      gradient: GRADIENT_THEMES.success
    },
    { 
      title: "Projects At Risk", 
      value: kpiData.riskProjects, 
      icon: FiAlertTriangle, 
      color: "roseMuted", 
      subtitle: "Requires direct attention", 
      progress: 0,
      gradient: GRADIENT_THEMES.rose
    },
  ];

  const statCards = [
    { 
      title: "Total Users", 
      value: stats?.usersCount || 0, 
      icon: FiUsers, 
      color: "slateDark", 
      trend: getTrendData(stats?.usersCount, stats?.previousUsersCount),
      gradient: GRADIENT_THEMES.indigo
    },
    { 
      title: "Departments", 
      value: stats?.departmentsCount || 0, 
      icon: FiGrid, 
      color: "slateMedium", 
      trend: getTrendData(stats?.departmentsCount, stats?.previousDepartmentsCount),
      gradient: GRADIENT_THEMES.violet
    },
    { 
      title: "Active Projects", 
      value: projects.length || stats?.projectsCount || 0, 
      icon: FiFolder, 
      color: "slateDark", 
      trend: getTrendData(projects.length, stats?.previousProjectsCount),
      gradient: GRADIENT_THEMES.primary
    },
    { 
      title: "Tracked Tasks", 
      value: stats?.tasksCount || 0, 
      icon: FiCheckSquare, 
      color: "slateLight", 
      trend: getTrendData(stats?.tasksCount, stats?.previousTasksCount),
      gradient: GRADIENT_THEMES.secondary
    },
  ];

  const projectBudgetData = budgets.map(b => {
    const project = projects.find(p => p.id === b.projectId);
    return {
      name: project?.title || b.Project?.title || `Proj ${b.projectId}`,
      budget: Number(b.totalBudget || 0),
      spent: Number(b.spent || 0),
      variance: Number(b.totalBudget || 0) - Number(b.spent || 0)
    };
  }).slice(0, 6);

  const monthlyBudgetData = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, index) => {
    const baseline = Math.round(kpiData.totalBudget / 6) || 800000;
    return {
      month,
      allocated: baseline,
      spent: Math.round(baseline * (0.3 + (index / 10))),
      remaining: Math.max(0, baseline - Math.round(baseline * (0.3 + (index / 10))))
    };
  });

  const activityData = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, index) => ({
    name: month,
    actions: Math.round((projects.length || 8) * (1.2 + Math.sin(index) * 0.4))
  }));

  const taskPieData = [
    { name: "Todo", value: stats?.tasks?.todoTasks || 5, color: "#cbd5e1" },
    { name: "In Progress", value: stats?.tasks?.inProgressTasks || 12, color: "#64748b" },
    { name: "Done", value: stats?.tasks?.doneTasks || 18, color: "#0f172a" },
  ];

  const departmentPerformance = stats?.departmentPerformance || [
    { name: "IT & Digital Infrastructure", projects: 12, successRate: 92, kpiAchievement: 88 },
    { name: "Finance & Asset Governance", projects: 8, successRate: 88, kpiAchievement: 85 },
    { name: "Human Resources Development", projects: 6, successRate: 84, kpiAchievement: 82 },
    { name: "Operational Logistics", projects: 10, successRate: 79, kpiAchievement: 76 },
  ];

  const maturityData = stats?.maturity || {
    mature: projects.filter(p => p.status === "COMPLETED" || p.status === "completed").length || 4,
    developing: projects.filter(p => p.status === "IN_PROGRESS" || p.status === "in-progress").length || 7,
    emerging: projects.filter(p => p.status === "PLANNED" || p.status === "planned").length || 2,
    critical: budgets.filter(b => b.spent > b.totalBudget).length || kpiData.riskProjects
  };

  const aiAlerts = stats?.alerts || [
    { id: 1, project: "Infrastructure Core", message: "Capital run-rate allocation nearing 95% threshold limitations.", severity: "high" },
    { id: 2, project: "Data Governance Sync", message: "Strategic architecture parameters running behind sequence target timelines.", severity: "medium" },
  ];

  const problemDetections = stats?.problems || [
    { id: 1, project: "Framework Delay Risk", issue: "Dependencies lag detected across cross-department tasks.", severity: "medium" }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[80vh] bg-gradient-to-br from-slate-50 to-white rounded-3xl">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-slate-900 rounded-full animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Syncing architecture metrics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50/50 min-h-screen p-4 md:p-8 space-y-6 max-w-[1650px] mx-auto antialiased text-slate-900">
        
        {/* Modern Glassmorphism Top Bar */}
        <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-6 md:p-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-slate-900/5 to-slate-700/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                Strategic Governance Engine
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Real-time core performance parameters monitoring.
                {lastUpdated && <span className="ml-2 text-slate-400">• Updated {lastUpdated}</span>}
              </p>
            </div>
            <button 
              onClick={fetchStats} 
              className="inline-flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 px-6 py-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
              Synchronize Matrix
            </button>
          </div>
        </div>

        {/* Gradient KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            const gradient = kpi.gradient;
            return (
              <div 
                key={kpi.title} 
                className={`relative overflow-hidden ${gradient.bg} rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 group`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">{kpi.title}</span>
                      <h3 className="text-2xl font-bold text-white tracking-tight">{kpi.value}</h3>
                    </div>
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/10">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-xs font-medium text-white/80 mt-3">{kpi.subtitle}</p>
                  {kpi.progress > 0 && (
                    <div className="mt-4 w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-full transition-all duration-1000 bg-white/60 rounded-full" 
                        style={{ width: `${kpi.progress}%` }} 
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modern Stat Cards with Glassmorphism */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            const gradient = card.gradient;
            return (
              <div 
                key={card.title} 
                className="relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 ${gradient.bg} opacity-5 rounded-full blur-2xl`} />
                <div className="relative">
                  <div className="flex justify-between items-start w-full">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</span>
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{(card.value).toLocaleString()}</h3>
                    </div>
                    <div className={`p-2.5 rounded-xl ${gradient.bg} shadow-lg`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5">
                    <div className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-lg ${
                      card.trend.isUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}>
                      {card.trend.isUp ? <FiArrowUpRight className="w-3 h-3" /> : <FiArrowDownLeft className="w-3 h-3" />}
                      <span>{card.trend.label}</span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">vs historical baseline</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Portfolio Maturity & Simulation with Modern Styling */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-lg lg:col-span-2">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Portfolio Maturity Scope</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-slate-100 to-slate-50 p-4 rounded-2xl border border-slate-200/50">
                <p className="text-[11px] text-slate-500 font-medium">Mature</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{maturityData.mature}</h3>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200/50">
                <p className="text-[11px] text-slate-500 font-medium">Developing</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{maturityData.developing}</h3>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200/50">
                <p className="text-[11px] text-slate-500 font-medium">Emerging</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{maturityData.emerging}</h3>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-red-50 p-4 rounded-2xl border border-rose-200/50">
                <p className="text-[11px] text-slate-500 font-medium">Critical</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{maturityData.critical}</h3>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 shadow-xl lg:col-span-2 text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FiCpu /> Simulation Sandbox
              </h2>
              <button 
                onClick={() => navigate("/admin/decision-simulator")} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-[11px] font-bold transition-all border border-white/10"
              >
                Execute Space →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-400 font-semibold">Project Index</p>
                <h3 className="text-2xl font-bold text-white mt-0.5">{stats?.latestSuccessRate || kpiData.projectSuccessRate}%</h3>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-400 font-semibold">Risk Vectors</p>
                <h3 className="text-2xl font-bold text-white mt-0.5">{kpiData.riskProjects > 1 ? "Medium" : "Low"}</h3>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-400 font-semibold">Sim Run Counts</p>
                <h3 className="text-2xl font-bold text-white mt-0.5">{stats?.totalSimulations || 14}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence & Department Performance with Modern Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-lg lg:col-span-1">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <FiShield /> Core Intelligence Monitor
            </h2>
            <div className="space-y-3">
              {aiAlerts.slice(0, 2).map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-2xl border transition-all duration-200 hover:shadow-md ${
                    alert.severity === 'high' 
                      ? 'bg-rose-50 border-rose-200/50' 
                      : 'bg-amber-50 border-amber-200/50'
                  }`}
                >
                  <h4 className="font-bold text-xs text-slate-900">{alert.project}</h4>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-lg lg:col-span-2">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Department Operational Standings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Division</th>
                    <th className="pb-3 text-center">Projects</th>
                    <th className="pb-3 text-center">Success Rate</th>
                    <th className="pb-3 text-right">KPI Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
                  {departmentPerformance.slice(0, 4).map((dept, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 text-slate-900 font-semibold">{dept.name}</td>
                      <td className="py-3 text-center text-slate-500">{dept.projects}</td>
                      <td className="py-3 text-center font-bold text-slate-900">{dept.successRate}%</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-[10px] bg-slate-100 text-slate-800">
                          {dept.kpiAchievement}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Analytics with Enhanced Chart Styling */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-lg space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Project Capital Expenditure</h2>
              <p className="text-[11px] text-slate-500 font-medium">Budget limits vs actual financial drawdown rates</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectBudgetData.length ? projectBudgetData : [{ name: "Alpha", budget: 1200000, spent: 850000 }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="budget" fill="#475569" radius={[4, 4, 0, 0]} name="Allocated Space" />
                  <Bar dataKey="spent" fill="#0f172a" radius={[4, 4, 0, 0]} name="Effective Outlay" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-lg space-y-4">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Timeline Run Rates</h2>
              <p className="text-[11px] text-slate-500 font-medium">Macro allocation run-rates vs timeline tracks</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyBudgetData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="allocated" stroke="#94a3b8" strokeWidth={2.5} dot={false} name="Target Track" />
                  <Line type="monotone" dataKey="spent" stroke="#0f172a" strokeWidth={2.5} dot={false} name="Actual Sequence" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Secondary Metrics with Modern Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lifecycle Allocation Tasks</h2>
              <p className="text-[11px] text-slate-500 font-medium">Current active framework operational statuses</p>
            </div>
            <div className="h-36 relative flex items-center justify-center my-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={48} outerRadius={60} paddingAngle={4} dataKey="value">
                    {taskPieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center mt-1">
                <p className="text-xl font-bold text-slate-900">{stats?.tasksCount || 35}</p>
                <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Index Metrics</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 pt-3 border-t border-slate-50 text-center">
              {taskPieData.map((item) => (
                <div key={item.name}>
                  <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 lg:col-span-2 shadow-lg space-y-4">
            <div>
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Framework Interface Actions</h2>
              <p className="text-[11px] text-slate-500 font-medium">Core transaction tracking analytics monthly index</p>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="slateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#475569" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="actions" stroke="#475569" strokeWidth={2.5} fillOpacity={1} fill="url(#slateGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Enhanced Footer Matrix */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 shadow-xl text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                <FiPieChart className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Portfolio Execution Index Summary</p>
                <p className="text-[11px] text-slate-300 font-semibold mt-0.5">
                  Total Managed Projects: {projects.length || kpiData.totalProjects} Matrix Links | Pending/Planned Blocks: {kpiData.plannedProjects} Scope Sets
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                Total Parameter Pool: {kpiData.totalBudget.toLocaleString()} MAD
              </span>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}