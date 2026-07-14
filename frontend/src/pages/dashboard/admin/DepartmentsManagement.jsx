import { useEffect, useState } from "react";
import {
  FiGrid,
  FiPlusCircle,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheckCircle,
  FiRefreshCw,
} from "react-icons/fi";

import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../../services/departmentService";

import DashboardLayout from "../../../components/layout/DashboardLayout";

export default function DepartmentsManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [editId, setEditId] = useState(null);

  // ======================
  // FETCH DATA
  // ======================
  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await getDepartments();

      // safe fallback
      const data = res?.data ?? [];

      setDepartments(data);
    } catch (error) {
      console.error("Fetch departments failure:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ======================
  // SUBMIT (CREATE / UPDATE)
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      if (editId) {
        await updateDepartment(editId, form);
      } else {
        await createDepartment(form);
      }

      setForm({ name: "", description: "" });
      setEditId(null);
      fetchData();
    } catch (error) {
      console.error("Department mutations error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // ======================
  // EDIT
  // ======================
  const handleEdit = (dept) => {
    setForm({
      name: dept?.name || "",
      description: dept?.description || "",
    });

    setEditId(dept?.id);
  };

  // ======================
  // DELETE
  // ======================
  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to completely de-provision this structural department node?"
      )
    )
      return;

    try {
      await deleteDepartment(id);
      fetchData();
    } catch (error) {
      console.error("Department deletion failure:", error);
    }
  };

  // ======================
  // RESET FORM
  // ======================
  const resetForm = () => {
    setEditId(null);
    setForm({ name: "", description: "" });
  };

  return (
    <DashboardLayout>
      <div className="bg-[#fafafa] min-h-screen p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto antialiased text-slate-900">

        {/* HEADER (UNCHANGED UI) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Structure Matrix Terminal
            </h1>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              Configure macro division nodes and adjust organizational framework blocks.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 px-4 py-3 rounded-xl transition-all active:scale-95 border border-slate-100"
          >
            <FiRefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Synchronize Matrix Mapping
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ================= FORM ================= */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm/40 lg:col-span-1">

            <div className="mb-5 flex items-center gap-2.5">
              <div
                className={`p-2.5 rounded-xl ${
                  editId ? "bg-amber-600" : "bg-emerald-600"
                } text-white`}
              >
                <FiGrid className="w-4 h-4" />
              </div>

              <div>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  Node Editor
                </h2>

                <h3 className="text-sm font-black text-slate-900 mt-0.5">
                  {editId ? "Modify Infrastructure Node" : "Instantiate New Division"}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* NAME */}
              <input
                type="text"
                placeholder="Department Identifier"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                className="w-full bg-slate-50/60 border border-slate-100 text-xs font-bold text-slate-800 p-3.5 rounded-xl"
                required
              />

              {/* DESCRIPTION */}
              <textarea
                placeholder="Mission Scope"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={4}
                className="w-full bg-slate-50/60 border border-slate-100 text-xs font-bold text-slate-800 p-3.5 rounded-xl resize-none"
              />

              {/* ACTIONS */}
              <div className="flex gap-2.5 pt-2">

                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 inline-flex items-center justify-center gap-2 text-xs font-bold text-white p-3.5 rounded-xl ${
                    editId
                      ? "bg-amber-600"
                      : "bg-emerald-600"
                  }`}
                >
                  {submitting ? (
                    "Processing..."
                  ) : editId ? (
                    <>
                      <FiCheckCircle className="w-3.5 h-3.5" />
                      Commit Revision
                    </>
                  ) : (
                    <>
                      <FiPlusCircle className="w-3.5 h-3.5" />
                      Initialize Component
                    </>
                  )}
                </button>

                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-slate-50 p-3.5 rounded-xl"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ================= TABLE ================= */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-6 lg:col-span-2 shadow-sm/40">

            <div className="mb-5">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Active Infrastructure Clusters
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">

                <thead>
                  <tr className="border-b text-[10px] uppercase text-slate-400">
                    <th className="pb-3">Name</th>
                    <th className="pb-3 hidden md:table-cell">Description</th>
                    <th className="pb-3 text-center">Date</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {departments.length > 0 ? (
                    departments.map((d) => (
                      <tr key={d.id} className="border-t">

                        <td className="py-4 font-bold text-xs">
                          {d.name}
                          <div className="text-[9px] text-slate-400">
                            NODE // 00{d.id}
                          </div>
                        </td>

                        <td className="py-4 hidden md:table-cell text-xs text-slate-500">
                          {d.description || "No description"}
                        </td>

                        <td className="py-4 text-center text-[10px] text-slate-500">
                          {d.createdAt
                            ? new Date(d.createdAt).toLocaleDateString()
                            : "-"}
                        </td>

                        <td className="py-4 text-right space-x-2">

                          <button
                            onClick={() => handleEdit(d)}
                            className="text-amber-600"
                          >
                            <FiEdit2 />
                          </button>

                          <button
                            onClick={() => handleDelete(d.id)}
                            className="text-rose-600"
                          >
                            <FiTrash2 />
                          </button>

                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="text-center py-10 text-slate-400 text-xs"
                      >
                        No departments found
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