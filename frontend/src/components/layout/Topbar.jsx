// src/components/layout/Topbar.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiBell,
  FiSearch,
  FiMenu,
  FiUser,
  FiChevronDown,
  FiLogOut,
  FiSettings,
  FiHelpCircle,
} from "react-icons/fi";

export default function Topbar({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, message: "New project assigned to you", time: "5 min ago", read: false },
    { id: 2, message: "Task 'Website Redesign' completed", time: "2 hours ago", read: false },
    { id: 3, message: "Meeting scheduled for tomorrow", time: "1 day ago", read: true },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate("/login");
    setShowDropdown(false);
  };

  return (
    <header className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-40 antialiased">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors duration-200 lg:hidden"
        >
          <FiMenu className="w-5 h-5 text-slate-700" />
        </button>

        {/* Minimal Circular Search Bar from image_db540a.png */}
        <div className="hidden md:flex items-center gap-2 bg-[#f4f5f7] p-2.5 rounded-full group focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-100 transition-all">
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-600 group-focus-within:text-black">
            <FiSearch className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            placeholder="Search dashboard..."
            className="bg-transparent border-none focus:outline-none text-xs font-medium text-slate-800 placeholder-slate-400 w-44 px-1"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        
        {/* Notifications Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 bg-[#f4f5f7] hover:bg-slate-200/70 rounded-full flex items-center justify-center relative transition-all active:scale-95"
          >
            <FiBell className="w-4 h-4 text-slate-700" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown Container */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-[20px] shadow-xl border border-slate-100 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-50">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">System Alerts</h3>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                      !notif.read ? "bg-indigo-50/20" : ""
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">{notif.time}</p>
                  </div>
                ))}
              </div>
              <div className="p-2 bg-slate-50/50 text-center border-t border-slate-50">
                <button className="text-xs text-slate-900 hover:underline font-bold">
                  View All History
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill Capsule Option */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 pr-3 bg-[#f4f5f7] hover:bg-slate-200/70 rounded-full transition-all active:scale-95"
          >
            {/* Minimal Initial Avatar Pill Component */}
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="hidden md:block text-left max-w-[100px]">
              <p className="text-xs font-black text-slate-900 truncate leading-tight">{user?.name || "Zoia M."}</p>
            </div>
            <FiChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </button>

          {/* Account Settings Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-52 bg-white rounded-[20px] shadow-xl border border-slate-100 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-50 bg-slate-50/40">
                <p className="text-xs font-black text-slate-900 truncate">{user?.name || "Profile Module"}</p>
                <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{user?.email || "user@ministry.gov"}</p>
              </div>
              <div className="py-1.5 p-2 space-y-0.5">
                {[
                  { to: "/profile", label: "Profile Settings", icon: FiUser },
                  { to: "/settings", label: "Preferences", icon: FiSettings },
                  { to: "/help", label: "Documentation", icon: FiHelpCircle },
                ].map((item) => (
                  <Link 
                    key={item.to}
                    to={item.to} 
                    className="w-full px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 text-xs font-bold transition-all"
                    onClick={() => setShowDropdown(false)}
                  >
                    <item.icon className="w-3.5 h-3.5 text-slate-400" />
                    {item.label}
                  </Link>
                ))}
                <hr className="border-slate-100 my-1.5 mx-2" />
                <button 
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-all"
                >
                  <FiLogOut className="w-3.5 h-3.5" />
                  Sign Out Securely
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}