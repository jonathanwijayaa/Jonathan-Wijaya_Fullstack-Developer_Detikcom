
import { Navigate, BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Login from "@/pages/Login";

// Admin pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import InternManagement from "@/pages/admin/InternManagement";
import AttendanceReport from "@/pages/admin/AttendanceReport";

// Intern pages
import InternDashboard from "@/pages/intern/InternDashboard";

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={user.role === "ADMIN" ? "/admin/dashboard" : "/intern/dashboard"}
      replace
    />
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/interns" element={<InternManagement />} />
        <Route path="/admin/attendance" element={<AttendanceReport />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["INTERN"]} />}>
        <Route path="/intern/dashboard" element={<InternDashboard />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
