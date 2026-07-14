import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AuthProvider from "./context/AuthContext";

// Guards
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

// Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProjectsManagement from "./pages/dashboard/admin/ProjectsManagement";
import TasksManagement from "./pages/dashboard/admin/TasksManagement";
import DecisionSimulator from "./pages/dashboard/admin/DecisionSimulator";

import BudgetManagement from "./pages/dashboard/admin/BudgetManagement";
import AdminDashboard from "./pages/dashboard/admin/AdminDashboard";
import UsersManagement from "./pages/dashboard/admin/UsersManagement";
import DepartmentsManagement from "./pages/dashboard/admin/DepartmentsManagement";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* PUBLIC ROUTES */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ADMIN DASHBOARD */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* USERS */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={["admin"]}>
                  <UsersManagement />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* DEPARTMENTS */}
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={["admin"]}>
                  <DepartmentsManagement />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
  path="/admin/tasks"
  element={
    <ProtectedRoute>
      <RoleRoute allowedRoles={["admin"]}>
        <TasksManagement />
      </RoleRoute>
    </ProtectedRoute>
  }
/>
          <Route
  path="/admin/projects"
  element={
    <ProtectedRoute>
      <RoleRoute allowedRoles={["admin"]}>
        <ProjectsManagement />
      </RoleRoute>
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/budget"
  element={
    <ProtectedRoute>
      <RoleRoute allowedRoles={["admin"]}>
        <BudgetManagement />
      </RoleRoute>
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/decision-simulator"
  element={<DecisionSimulator />}
/>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}