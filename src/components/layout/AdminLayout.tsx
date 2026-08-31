import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLayoutEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { LayoutContext, useLayout, LayoutState } from "@/lib/LayoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  SquaresFour as LayoutDashboard,
  BookOpen,
  Tag,
  Users,
  Ticket,
  ChartBar as BarChart3,
  Gear as Settings,
  SignOut as LogOut,
  Heartbeat as Stethoscope,
  MagnifyingGlass as Search,
  Bell,
  CalendarDots as CalendarDays,
  CaretDown as ChevronDown,
  Plus,
  ListChecks,
  Pulse as Activity,
} from "@phosphor-icons/react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: any;
  iconWeight?: any;
  children?: { to: string; label: string; icon: any; iconWeight?: any }[];
  isLogout?: boolean;
};

const items: Item[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/admin/questions",
    label: "Questions",
    icon: BookOpen,
    children: [
      { to: "/admin/questions/create", label: "Create Question", icon: Plus, iconWeight: "regular" },
      { to: "/admin/questions/previous", label: "Previous Questions", icon: ListChecks },
      { to: "/admin/questions/performance", label: "Performance", icon: Activity },
    ],
  },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/invitation-codes", label: "Invitation Codes", icon: Ticket },
  { to: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 },
];

function SidebarLink({ item, currentPath }: { item: Item; currentPath: string }) {
  const isActiveSelf = currentPath === item.to;
  const isActiveBranch =
    item.to === "/admin"
      ? currentPath === "/admin" || currentPath === "/admin/"
      : currentPath === item.to || currentPath.startsWith(item.to + "/");
  const [open, setOpen] = useState(isActiveBranch);

  if (!item.children) {
    return (
      <Link
        to={item.to}
        className={cn(
          "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          isActiveSelf
            ? "text-sidebar-active-foreground"
            : "text-sidebar-foreground hover:bg-muted",
        )}
      >
        {isActiveSelf && (
          <motion.div
            layoutId="active-sidebar-pill"
            className="absolute inset-0 rounded-xl bg-sidebar-active"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <item.icon className="relative z-10 size-4.5" weight={item.iconWeight} />
        <span className="relative z-10">{item.label}</span>
        {isActiveSelf && <span className="relative z-10 ml-auto size-1.5 rounded-full bg-primary" />}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          isActiveBranch
            ? "text-sidebar-active-foreground"
            : "text-sidebar-foreground hover:bg-muted",
        )}
      >
        {isActiveBranch && (
          <motion.div
            layoutId="active-sidebar-pill"
            className="absolute inset-0 rounded-xl bg-sidebar-active"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <item.icon className="relative z-10 size-4.5" />
        <span className="relative z-10">{item.label}</span>
        <ChevronDown
          className={cn("relative z-10 ml-auto size-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
          {item.children.map((c) => {
            const active = currentPath === c.to;
            const Icon = c.icon;
            return (
              <Link
                key={c.to}
                to={c.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" weight={c.iconWeight} />
                {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { setLayout } = useLayout();
  
  useLayoutEffect(() => {
    setLayout({ title, subtitle, actions });
  }, [title, subtitle, actions, setLayout]);

  return <>{children}</>;
}

export function RootLayout({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<LayoutState>({ title: "" });
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const { signOut, user } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const roleNotifications = notifications.filter(n => n.role === "all" || n.role === "admin");
  const unreadRoleCount = roleNotifications.filter(n => n.unread).length;

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <LayoutContext.Provider value={{ ...layout, setLayout }}>
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar p-5 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-1">
          <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="size-5" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">Medline</div>
            <div className="text-xs text-muted-foreground">Admin Console</div>
          </div>
        </div>

        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Main Menu
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {items.map((it) => (
            <SidebarLink key={it.to} item={it} currentPath={path} />
          ))}
        </nav>

        <div className="mt-4 space-y-1 border-t border-sidebar-border pt-4">
          <Link
            to="/admin/settings"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              path === "/admin/settings"
                ? "bg-sidebar-active text-sidebar-active-foreground"
                : "text-sidebar-foreground hover:bg-muted",
            )}
          >
            <Settings className="size-4.5" /> Settings
          </Link>
          <Link
            to="/admin/profile"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
              path === "/admin/profile" ? "bg-sidebar-active text-sidebar-active-foreground" : "text-sidebar-foreground hover:bg-muted",
            )}
          >
            <Users className="size-4.5" /> Profile
          </Link>
          <motion.button onClick={handleLogout} whileTap={{ scale: 0.95 }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-muted">
            <LogOut className="size-4.5" weight="regular" /> Logout
          </motion.button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border bg-background/80 px-6 py-5 backdrop-blur xl:flex-row xl:items-center">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{layout.title}</h1>
            {layout.subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{layout.subtitle}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">

            <div className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-foreground select-none">
              <CalendarDays className="size-4 text-muted-foreground" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <motion.button whileTap={{ scale: 0.90 }} className="relative grid size-10 place-items-center rounded-full border border-border bg-card text-foreground hover:bg-muted">
                  <Bell className="size-4" />
                  {unreadRoleCount > 0 && (
                    <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
                  )}
                </motion.button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="font-semibold">Notifications</span>
                  <PopoverClose asChild>
                    <button onClick={markAllAsRead} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Mark all as read</button>
                  </PopoverClose>
                </div>
                <div className="flex flex-col py-2 max-h-[300px] overflow-y-auto">
                  {roleNotifications.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">No new notifications</div>
                  )}
                  {roleNotifications.slice(0, 5).map(n => {
                    let formattedTime = n.time;
                    if (!n.time.includes("ago") && n.time !== "Just now") {
                      try { formattedTime = formatDistanceToNow(new Date(n.time), { addSuffix: true }); } catch {}
                    }
                    return (
                      <PopoverClose asChild key={n.id}>
                        <div onClick={() => markAsRead(n.id)} className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer ${n.unread ? "bg-muted/20" : ""}`}>
                          {n.unread ? <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /> : <div className="mt-1.5 size-2 shrink-0 rounded-full bg-transparent" />}
                          <div>
                            <p className={`text-sm leading-tight ${n.unread ? "font-semibold" : "font-medium text-muted-foreground"}`}>{n.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{n.desc}</p>
                            <p className="mt-1.5 text-[10px] font-medium uppercase text-muted-foreground">{formattedTime}</p>
                          </div>
                        </div>
                      </PopoverClose>
                    );
                  })}
                </div>
                <div className="border-t border-border p-2 text-center">
                  <PopoverClose asChild>
                    <Link to="/admin/notifications" className="text-xs font-medium text-primary hover:underline block w-full">View all notifications</Link>
                  </PopoverClose>
                </div>
              </PopoverContent>
            </Popover>
            <Link to="/admin/profile" className="flex items-center gap-3 rounded-full border border-border bg-card py-1.5 pl-2 pr-4">
              <div className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "AD").substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden text-right leading-tight md:block">
                <div className="text-sm font-semibold">{user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "Administrator"}</div>
                <div className="text-[11px] text-muted-foreground">Administrator</div>
              </div>
            </Link>
          </div>
        </header>

        {layout.actions && <div className="px-6 pt-5">{layout.actions}</div>}

        {children}
      </div>
    </div>
    </LayoutContext.Provider>
  );
}
