import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import AdminDashboard from "../pages/dashboard/admin/AdminDashboard";
import DirectorDashboard from "../pages/dashboard/director/DirectorDashboard";
import ManagerDashboard from "../pages/dashboard/manager/ManagerDashboard";
import ViewerDashboard from "../pages/dashboard/viewer/ViewerDashboard";

import ProtectedRoute from "../routes/ProtectedRoute";
import RoleRoute from "../routes/RoleRoute";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/admin" element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/director" element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["director"]}>
              <DirectorDashboard />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/manager" element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["manager"]}>
              <ManagerDashboard />
            </RoleRoute>
          </ProtectedRoute>
        } />

        <Route path="/viewer" element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["viewer"]}>
              <ViewerDashboard />
            </RoleRoute>
          </ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}