import { useEffect, useState } from "react";
import { 
  FiUsers, 
  FiUserPlus, 
  FiEdit2, 
  FiTrash2, 
  FiX, 
  FiCheckCircle, 
  FiRefreshCw 
} from "react-icons/fi";
import api from "../../../services/api";
import DashboardLayout from "../../../components/layout/DashboardLayout";

const getStatusBadgeClass = (status = "") => {
  const normalized = status.toLowerCase().replace(/[^a-z]/g, "");
  if (["active", "done", "admin", "success", "completed"].includes(normalized)) 
    return "bg-emerald-50 text-emerald-700 border-emerald-100/60";
  if (["inprogress", "manager", "process", "in_progress"].includes(normalized)) 
    return "bg-blue-50 text-blue-700 border-blue-100/60";
  if (["planned", "todo", "user", "director", "onhold"].includes(normalized)) 
    return "bg-purple-50 text-purple-700 border-purple-100/60";
  return "bg-amber-50 text-amber-700 border-amber-100/60"; // Viewer, etc.
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "viewer",
  });
  const [editingId, setEditingId] = useState(null);

  // ======================
  // FETCH USERS
  // ======================
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch (error) {
      console.error("Fetch users error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ======================
  // HANDLE INPUT CHANGE
  // ======================
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ======================
  // CREATE / UPDATE USER
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, formData);
      } else {
        await api.post("/users", formData);
      }
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  // ======================
  // EDIT USER
  // ======================
  const handleEdit = (user) => {
    setEditingId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
  };

  // ======================
  // DELETE USER
  // ======================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this infrastructure profile?")) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // ======================
  // RESET FORM
  // ======================
  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "viewer",
    });
  };

  return (
    <DashboardLayout>
      <div className="bg-[#fafafa] min-h-screen p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto antialiased text-slate-900">
        
        {/* Header Ribbon Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Identity Access Manager</h1>
            <p className="text-slate-400 text-xs mt-1 font-medium">Provision systemic clearances and manage security access scopes.</p>
          </div>
          <button 
            onClick={fetchUsers} 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-xl transition-all active:scale-95 border border-slate-100"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Synchronize User Directory
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ================= COMPACT PRO INPUT MANAGEMENT FORM ================= */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm/40 lg:col-span-1">
            <div className="mb-5 flex items-center gap-2.5">
              <div className={`p-2.5 rounded-xl ${editingId ? 'bg-amber-600 text-white' : 'bg-slate-900 text-white'} shadow-xs`}>
                <FiUserPlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">Profile Workspace</h2>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">
                  {editingId ? "Modify Security Token" : "Provision New Identity"}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Identity Label</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-slate-50/60 border border-slate-100 text-xs font-bold text-slate-800 p-3.5 rounded-xl placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Communication Route</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-50/60 border border-slate-100 text-xs font-bold text-slate-800 p-3.5 rounded-xl placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Verification Passkey</label>
                <input
                  type="password"
                  name="password"
                  placeholder={editingId ? "•••••••• (Leave blank to keep current)" : "Password Key"}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-50/60 border border-slate-100 text-xs font-bold text-slate-800 p-3.5 rounded-xl placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                  required={!editingId}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Security Clearance Tier</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full bg-slate-50/60 border border-slate-100 text-xs font-bold text-slate-800 p-3.5 rounded-xl focus:outline-none focus:bg-white focus:border-slate-200 transition-all"
                >
                  <option value="admin">Admin</option>
                  <option value="director">Director</option>
                  <option value="manager">Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className={`flex-1 inline-flex items-center justify-center gap-2 text-xs font-bold text-white p-3.5 rounded-xl transition-all active:scale-[0.98] shadow-sm ${
                    editingId ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  <FiCheckCircle className="w-3.5 h-3.5" />
                  {editingId ? "Commit Changes" : "Deploy Identity"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100 p-3.5 rounded-xl transition-all active:scale-[0.98]"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ================= DATA LEDGER LEDGER GRID TABLE ================= */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-6 lg:col-span-2 shadow-sm/40">
            <div className="mb-5">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Infrastructure Access Registry</h2>
              <p className="text-[11px] text-slate-400 font-medium">Currently active access signatures deployed across operational matrix blocks</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-wider">
                    <th className="pb-3 font-semibold">User Identification Matrix</th>
                    <th className="pb-3 font-semibold hidden md:table-cell">Token ID</th>
                    <th className="pb-3 font-semibold text-center">Clearance Status</th>
                    <th className="pb-3 font-semibold text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                        
                        {/* Meta Identity Block */}
                        <td className="py-3.5 pr-2">
                          <p className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {user.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{user.email}</p>
                        </td>

                        {/* Technical Token Identification Code */}
                        <td className="py-3.5 text-[11px] text-slate-400 font-mono hidden md:table-cell">
                          #{user.id}
                        </td>

                        {/* Core Role Badge Architecture mapping */}
                        <td className="py-3.5 text-center">
                          <span className={`text-[10px] font-black tracking-tight uppercase px-2.5 py-0.5 rounded-md border ${getStatusBadgeClass(user.role)}`}>
                            {user.role}
                          </span>
                        </td>

                        {/* Advanced Action Control Pipeline */}
                        <td className="py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all border border-transparent hover:border-amber-100"
                              title="Edit Registry Entry"
                            >
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100"
                              title="Revoke Clearances"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-xs text-slate-400 py-12 text-center font-medium">
                        No operational identity segments discovered inside this stack context layer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}