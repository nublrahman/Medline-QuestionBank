import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLayoutEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { LayoutContext, useLayout, LayoutState } from "@/lib/LayoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import type { ReactNode } from "react";
import {
  List as Menu,
  GraduationCap,
  ClockCounterClockwise as History,
  Target,
  SignOut as LogOut,
  Bell,
  MagnifyingGlass as Search,
  CalendarDots as CalendarDays,
  CaretDown as ChevronDown,
  PlayCircle,
  SquaresFour as LayoutDashboard,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: any;
  iconWeight?: any;
  children?: { to: string; label: string; icon: any }[];
};

const items: Item[] = [
  { to: "/student", label: "Performance Dashboard", icon: LayoutDashboard },
  { to: "/student/create-test", label: "Create Custom Test", icon: PlayCircle },
  { to: "/student/test-history", label: "Test History", icon: History },
];

function SidebarLink({ item, currentPath }: { item: Item; currentPath: string }) {
  const isActiveSelf = currentPath === item.to;
  const isActiveBranch =
    item.to === "/student"
      ? currentPath === "/student" || currentPath === "/student/"
      : currentPath === item.to || currentPath.startsWith(item.to + "/");
  const [open, setOpen] = useState(isActiveBranch);

  if (!item.children) {
    return (
      <Link
        to={item.to}
        className={cn(
          "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          isActiveSelf
            ? "text-white"
            : "text-sidebar-foreground hover:bg-muted/50",
        )}
      >
        {isActiveSelf && (
          <motion.div
            layoutId="active-student-sidebar-pill"
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500 to-teal-700 shadow-lg shadow-teal-900/20"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <item.icon className={cn("relative z-10 size-4.5", !isActiveSelf && "text-teal-600")} />
        <span className="relative z-10">{item.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          isActiveBranch
            ? "text-white"
            : "text-sidebar-foreground hover:bg-muted/50",
        )}
      >
        {isActiveBranch && (
          <motion.div
            layoutId="active-student-sidebar-pill"
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500 to-teal-700 shadow-lg shadow-teal-900/20"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <item.icon className={cn("relative z-10 size-4.5", !isActiveBranch && "text-teal-600")} />
        <span className="relative z-10">{item.label}</span>
        <ChevronDown
          className={cn("relative z-10 ml-auto size-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
          {item.children.map((c) => {
            const active = currentPath === c.to;
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
                <c.icon className={cn("size-3.5", !active && "text-teal-600")} />
                {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function StudentLayout({
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

export function StudentRootLayout({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<LayoutState>({ title: "" });
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const { signOut, user } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const roleNotifications = notifications.filter(n => n.role === "all" || n.role === "student");
  const unreadRoleCount = roleNotifications.filter(n => n.unread).length;

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  // Don't show sidebar and header in the test session view to keep it distraction-free
  const isTestSession = path.includes("/test-session");

  return (
    <LayoutContext.Provider value={{ ...layout, setLayout }}>
      <div className={cn("flex flex-col", !isTestSession ? "min-h-screen bg-gradient-to-br from-[#c1e3e4] via-[#e2e8f0] to-[#e4e0f0] p-2 lg:p-3" : "h-screen h-[100dvh] bg-slate-50 overflow-hidden")}>
        <div className={cn("relative flex w-full overflow-hidden min-h-0 flex-1", !isTestSession ? "min-h-[calc(100vh-1rem)] lg:min-h-[calc(100vh-1.5rem)] rounded-[1.5rem] border border-white/60 bg-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)]" : "h-full")}>
        
        {/* Only render sidebar and header if not in a test session */}
        {!isTestSession && (
          <>
            <aside className="hidden w-72 shrink-0 flex-col border-r border-white/30 p-5 lg:flex">
              <div className="mb-8 flex items-center gap-3 px-1">
                <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <GraduationCap className="size-5" />
                </div>
                <div>
                  <div className="text-lg font-bold tracking-tight">Medline</div>
                  <div className="text-xs text-muted-foreground">Student Portal</div>
                </div>
              </div>

              <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Study Menu
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                {items.map((it) => (
                  <SidebarLink key={it.to} item={it} currentPath={path} />
                ))}
              </nav>

              <div className="mt-4 space-y-1 border-t border-white/30 pt-4">
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-muted/50">
                  <LogOut className="size-4.5 text-teal-600" weight="regular" /> Logout
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Main Content Area */}
        <div className={cn("flex flex-1 flex-col overflow-y-auto scroll-smooth min-h-0", !isTestSession ? "h-[calc(100vh-1rem)] lg:h-[calc(100vh-1.5rem)]" : "h-full overflow-hidden")}>
          {!isTestSession && (
            <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-white/30 bg-white/30 px-6 py-5 backdrop-blur-md xl:flex-row xl:items-center transform-gpu">
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
                        <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
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
                        <Link to="/student/notifications" className="text-xs font-medium text-primary hover:underline block w-full">View all notifications</Link>
                      </PopoverClose>
                    </div>
                  </PopoverContent>
                </Popover>
                <Link to="/student/profile" className="flex items-center gap-3 rounded-full border border-border bg-card py-1.5 pl-2 pr-4 hover:bg-muted transition-colors">
                  <div className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "ST").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden text-right leading-tight md:block">
                    <div className="text-sm font-semibold">{user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "Student"}</div>
                    <div className="text-[11px] text-muted-foreground">Nursing Student</div>
                  </div>
                </Link>
              </div>
            </header>
          )}

          <div className={cn("flex-1 flex flex-col min-h-0", !isTestSession && "pb-10")}>
            {layout.actions && !isTestSession && <div className="px-6 pt-5 shrink-0">{layout.actions}</div>}
            
            {children}
          </div>
        </div>
      </div>
      </div>
    </LayoutContext.Provider>
  );
}
