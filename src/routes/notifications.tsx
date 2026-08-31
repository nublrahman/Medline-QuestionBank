import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { AdminLayout } from "../components/layout/AdminLayout";
import { StudentLayout } from "../components/layout/StudentLayout";
import { CheckCircle, Bell, UserPlus, Sparkle } from "@phosphor-icons/react";
import { useNotifications } from "../contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";

export default function Notifications() {
  const { role } = useAuth();
  const { notifications, markAllAsRead, markAsRead } = useNotifications();
  
  const roleNotifications = notifications.filter(n => n.role === "all" || n.role === role);

  const formatTime = (time: string) => {
    if (time.includes("ago") || time === "Just now") return time;
    try {
      return formatDistanceToNow(new Date(time), { addSuffix: true });
    } catch {
      return time;
    }
  };

  const content = (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Your Notifications</h2>
        <button onClick={markAllAsRead} className="text-sm font-medium text-primary hover:underline">Mark all as read</button>
      </div>

      <div className="space-y-4">
        {roleNotifications.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">No notifications.</div>
        )}
        {roleNotifications.map((n, i) => (
          <motion.div 
            key={n.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => markAsRead(n.id)}
            className={`flex items-start gap-4 p-5 rounded-2xl border cursor-pointer ${n.unread ? "bg-card border-primary/20 shadow-sm" : "bg-background border-border"}`}
          >
            <div className={`mt-1 grid size-10 shrink-0 place-items-center rounded-full ${n.unread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {n.type === "system" ? <Sparkle className="size-5" /> : 
               n.type === "user" ? <UserPlus className="size-5" /> : 
               n.type === "result" ? <CheckCircle className="size-5" /> : 
               <Bell className="size-5" />}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold ${n.unread ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</h3>
                <span className="text-xs font-medium uppercase text-muted-foreground">{formatTime(n.time)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{n.desc}</p>
            </div>
            
            {n.unread && (
              <div className="size-2.5 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );

  if (role === "admin") {
    return <AdminLayout title="Notifications">{content}</AdminLayout>;
  }

  return <StudentLayout title="Notifications">{content}</StudentLayout>;
}
