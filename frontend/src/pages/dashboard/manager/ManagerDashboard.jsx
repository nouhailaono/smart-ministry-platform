// src/pages/dashboard/manager/ManagerDashboard.jsx
import { useState, useEffect } from "react";
import {
  FiBriefcase,
  FiCheckSquare,
  FiUsers,
  FiClock,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";
import axios from "axios";
import DashboardLayout from "../../../components/layout/DashboardLayout";

export default function ManagerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      
      const response = await axios.get(`${API_URL}/manager/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setStats(response.data.stats);
      setError(null);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError(err.response?.data?.error || "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Loading dashboard data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
          <button
            onClick={fetchStats}
            className="mt-2 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      title: "My Projects",
      value: stats?.myProjects || 0,
      icon: FiBriefcase,
      color: "blue",
      change: "+4%",
      trend: "up",
    },
    {
      title: "Team Tasks",
      value: stats?.teamTasks || 0,
      icon: FiCheckSquare,
      color: "green",
      change: "+10%",
      trend: "up",
    },
    {
      title: "Team Members",
      value: stats?.teamMembers || 0,
      icon: FiUsers,
      color: "purple",
      change: "+2%",
      trend: "up",
    },
    {
      title: "Pending Tasks",
      value: stats?.pendingTasks || 0,
      icon: FiClock,
      color: "orange",
      change: "-5%",
      trend: "down",
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-green-100 text-green-600",
      purple: "bg-purple-100 text-purple-600",
      orange: "bg-orange-100 text-orange-600",
    };
    return colors[color] || colors.blue;
  };

  const getStatusColor = (status) => {
    const colors = {
      "TODO": "bg-gray-100 text-gray-700",
      "IN_PROGRESS": "bg-blue-100 text-blue-700",
      "DONE": "bg-green-100 text-green-700",
      "HIGH": "bg-red-100 text-red-700",
      "MEDIUM": "bg-yellow-100 text-yellow-700",
      "LOW": "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Manager Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Manage your projects and team tasks efficiently.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{card.title}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                      {card.value}
                    </p>
                    <div
                      className={`flex items-center gap-1 mt-2 text-sm ${
                        card.trend === "up" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {card.trend === "up" ? (
                        <FiTrendingUp className="w-4 h-4" />
                      ) : (
                        <FiTrendingDown className="w-4 h-4" />
                      )}
                      <span>{card.change}</span>
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-lg ${getColorClasses(card.color)}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Recent Tasks
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-sm font-medium text-slate-500 pb-3">Task</th>
                  <th className="text-left text-sm font-medium text-slate-500 pb-3">Project</th>
                  <th className="text-left text-sm font-medium text-slate-500 pb-3">Status</th>
                  <th className="text-left text-sm font-medium text-slate-500 pb-3">Priority</th>
                  <th className="text-left text-sm font-medium text-slate-500 pb-3">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentTasks?.length > 0 ? (
                  stats.recentTasks.map((task) => (
                    <tr key={task.id} className="border-b border-slate-100">
                      <td className="py-3 text-sm text-slate-700">{task.title}</td>
                      <td className="py-3 text-sm text-slate-600">{task.project?.name || "N/A"}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status?.toLowerCase().replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.priority)}`}>
                          {task.priority?.toLowerCase() || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-slate-600">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-3 text-center text-sm text-slate-500">
                      No recent tasks
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}