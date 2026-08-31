import React, { createContext, useContext, useState, useEffect } from "react";

export type Notification = {
  id: number;
  type: "system" | "user" | "result" | "alert";
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  role: "admin" | "student" | "all";
};

const defaultNotifications: Notification[] = [
  { id: 1, type: "user", title: "New student joined", desc: "Alex Johnson used invite code NURSE24", time: new Date(Date.now() - 2 * 60000).toISOString(), unread: true, role: "admin" },
  { id: 2, type: "system", title: "System Update", desc: "New NGN question types are now available in the authoring tool.", time: new Date(Date.now() - 3600000).toISOString(), unread: true, role: "all" },
  { id: 3, type: "result", title: "Test Graded", desc: "Your recent Pediatrics test has been graded.", time: new Date(Date.now() - 3 * 3600000).toISOString(), unread: true, role: "student" },
];

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  addNotification: (n: Omit<Notification, "id" | "time">) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("medline_notifications");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old string times to ISO timestamps
        const migrated = parsed.map((n: Notification) => {
          const t = String(n.time).toLowerCase();
          if (t.includes("min") || t.includes("hour") || t.includes("just now") || t.includes("ago")) {
            if (n.id === 1) return { ...n, time: new Date(Date.now() - 2 * 60000).toISOString() };
            if (n.id === 2) return { ...n, time: new Date(Date.now() - 3600000).toISOString() };
            if (n.id === 3) return { ...n, time: new Date(Date.now() - 3 * 3600000).toISOString() };
            return { ...n, time: new Date().toISOString() };
          }
          return n;
        });
        setNotifications(migrated);
      } catch (e) {
        setNotifications(defaultNotifications);
      }
    } else {
      setNotifications(defaultNotifications);
    }
  }, []);

  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem("medline_notifications", JSON.stringify(notifications));
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAsRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const addNotification = (n: Omit<Notification, "id" | "time">) => {
    setNotifications((prev) => [{ ...n, id: Date.now(), time: new Date().toISOString() }, ...prev]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) throw new Error("useNotifications must be used within a NotificationProvider");
  return context;
}
