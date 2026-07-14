// src/components/layout/Sidebar.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiHome,
  FiUsers,
  FiGrid,
  FiFolder,
  FiBarChart2,
  FiUser,
  FiLogOut,
  FiCheckSquare,
  FiBriefcase,
  FiActivity,
  FiDollarSign,
} from "react-icons/fi";

export default function Sidebar({ isOpen = true }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ROLE-BASED NAVIGATION
  const navigation = {
    admin: [
      { name: "Dashboard", path: "/admin", icon: FiHome },
      { name: "Users Management", path: "/admin/users", icon: FiUsers },
      { name: "Departments Management", path: "/admin/departments", icon: FiGrid },
      { name: "Projects Registry", path: "/admin/projects", icon: FiFolder },
      { name: "Tasks Management", path: "/admin/tasks", icon: FiCheckSquare },
      { name: "Budget Control", path: "/admin/budget", icon: FiDollarSign },
      { name: "Decision Simulator", path: "/admin/decision-simulator", icon: FiActivity },
    ],

    director: [
      { name: "Overview Dashboard", path: "/director", icon: FiHome },
      { name: "Analytical View", path: "/director/overview", icon: FiBarChart2 },
      { name: "Metrics Hub", path: "/director/analytics", icon: FiActivity },
    ],

    manager: [
      { name: "Manager Dashboard", path: "/manager", icon: FiHome },
      { name: "Assigned Systems", path: "/manager/projects", icon: FiBriefcase },
      { name: "Operational Tasks", path: "/manager/tasks", icon: FiCheckSquare },
    ],

    viewer: [
      { name: "Viewer Dashboard", path: "/viewer", icon: FiHome },
      { name: "Assigned Checklist", path: "/viewer/tasks", icon: FiCheckSquare },
      { name: "Profile Settings", path: "/viewer/profile", icon: FiUser },
    ],
  };

  const menuItems = navigation[user?.role] || navigation.viewer;

  return (
    <aside
      className={`${
        isOpen ? "w-64" : "w-[88px]"
      } bg-[#111214] text-slate-400 p-5 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-900 min-h-screen sticky top-0 antialiased shadow-2xl`}
    >
      {/* LOGO */}
      <div
        className={`flex items-center gap-4 mb-12 ${
          !isOpen ? "justify-center" : "px-1.5"
        }`}
      >
        <div className={`flex items-center justify-center shrink-0 ${
          isOpen ? "w-16 h-16" : "w-14 h-14"
        }`}>
          <img 
            src="/images-removebg-preview.png" 
            alt="Moroccan Ministry Logo"
            className="w-full h-full object-contain"
          />
        </div>

        {isOpen && (
          <div className="animate-fadeIn">
            <h1 className="text-sm font-black text-white tracking-tight leading-none">
              Smart Ministry
            </h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              Platform Core
            </p>
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 transition-all duration-200 group relative ${
                isOpen
                  ? "rounded-lg"
                  : "rounded-full justify-center w-12 h-12 mx-auto"
              } ${
                isActive
                  ? "bg-white text-black font-semibold shadow-lg shadow-black/20"
                  : "hover:text-white hover:bg-slate-900/60 font-medium"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive
                    ? "text-black"
                    : "text-slate-500 group-hover:text-slate-200"
                }`}
              />

              {/* TEXT + BADGE */}
              {isOpen && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm tracking-tight">
                    {item.name}
                  </span>

                  {item.badge && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* ACTIVE DOT (collapsed mode) */}
              {!isOpen && isActive && (
                <div className="absolute right-1 w-1 h-3 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <div className="pt-4 border-t border-slate-900/60">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-all duration-200 ${
            isOpen
              ? "rounded-lg"
              : "rounded-full justify-center w-12 h-12 mx-auto"
          }`}
        >
          <FiLogOut className="w-4 h-4 shrink-0" />
          {isOpen && (
            <span className="tracking-tight">Exit Workspace</span>
          )}
        </button>
      </div>
    </aside>
  );
}