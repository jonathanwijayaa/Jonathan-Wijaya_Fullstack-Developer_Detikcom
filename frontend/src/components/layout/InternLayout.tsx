import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function InternLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pageTitle ="Dashboard";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r bg-white">
        <div className="border-b px-6 py-5">
          <h1 className="text-xl font-bold text-slate-900">
            DetikHadir
          </h1>
          <p className="text-sm text-slate-500">Intern Portal</p>
        </div>

        <nav className="flex-1 p-4">
          <NavLink
            to="/intern/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>
        </nav>

        <div className="border-t p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-slate-900">
              {user?.name}
            </p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>

          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen flex-1">
        <header className="flex h-16 items-center border-b bg-white px-8">
          <h1 className="text-lg font-semibold text-slate-900">
                {pageTitle}
            </h1>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}