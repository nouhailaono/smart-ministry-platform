// src/pages/dashboard/director/DirectorDashboard.jsx
import { useState, useEffect } from "react";
import {
  FiBarChart2,
  FiTrendingUp,
  FiTrendingDown,
  FiUsers,
  FiFolder,
  FiCheckSquare,
  FiActivity,
} from "react-icons/fi";
import axios from "axios";
import DashboardLayout from "../../../components/layout/DashboardLayout";

export default function DirectorDashboard() {
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
      
      const response = await axios.get(`${API_URL}/director/stats`, {
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
      title: "Total Projects",
      value: stats?.projectsCount || 0,
      icon: FiFolder,
      color: "blue",
      change: "+8%",
      trend: "up",
    },
    {
      title: "Active Projects",
      value: stats?.activeProjects || 0,
      icon: FiActivity,
      color: "green",
      change: "+5%",
      trend: "up",
    },
    {
      title: "Departments",
      value: stats?.departmentsCount || 0,
      icon: FiUsers,
      color: "purple",
      change: "+3%",
      trend: "up",
    },
    {
      title: "Completion Rate",
      value: `${stats?.completionRate || 0}%`,
      icon: FiCheckSquare,
      color: "orange",
      change: "+12%",
      trend: "up",
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Director Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Overview of all projects and department performance.
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Department Performance
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Engineering</span>
                  <span className="font-medium text-slate-800">85%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: "85%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Marketing</span>
                  <span className="font-medium text-slate-800">72%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "72%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Sales</span>
                  <span className="font-medium text-slate-800">90%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: "90%" }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {stats?.recentActivities?.length > 0 ? (
                stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-slate-700">{activity.name}</p>
                      <p className="text-xs text-slate-400">
                        Status: {activity.status?.toLowerCase().replace("_", " ")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}