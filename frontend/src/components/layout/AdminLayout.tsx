import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Intern Management",
    path: "/admin/interns",
    icon: Users,
  },
  {
    label: "Attendance Report",
    path: "/admin/attendance",
    icon: ClipboardList,
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle =
    navItems.find((item) => item.path === location.pathname)?.label ??
    "Admin Panel";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b px-6 py-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">DetikHadir</h1>
          <p className="text-sm text-slate-500">Admin Panel</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X size={18} />
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3">
          <p className="text-sm font-medium text-slate-900">{user?.name}</p>
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
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-white md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-white shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="min-h-screen flex-1 md:ml-64">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </Button>
            <h1 className="text-lg font-semibold text-slate-900">
              {pageTitle}
            </h1>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
