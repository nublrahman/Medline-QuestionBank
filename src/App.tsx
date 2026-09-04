import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { RootLayout } from "./components/layout/AdminLayout";
import { StudentRootLayout } from "./components/layout/StudentLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import Login from "./routes/login";

// Import all routes manually
import Dashboard from "./routes/index";
import Categories from "./routes/categories";
import InvitationCodes from "./routes/invitation-codes";
import Profile from "./routes/profile";
import QuestionsCreate from "./routes/questions.create";
import QuestionsPerformance from "./routes/questions.performance";
import QuestionsPrevious from "./routes/questions.previous";
import Questions from "./routes/questions";
import Reports from "./routes/reports";
import Settings from "./routes/settings";
import Students from "./routes/students";
import Notifications from "./routes/notifications";

import Landing from "./routes/landing";
import StudentDashboard from "./routes/student/dashboard";
import StudentCreateTest from "./routes/student/create-test";
import StudentTestSession from "./routes/student/test-session";

function AdminApp() {
  const location = useLocation();
  return (
    <RootLayout>
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="px-6 py-6"
        >
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/invitation-codes" element={<InvitationCodes />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/questions/create" element={<QuestionsCreate />} />
            <Route path="/questions/performance" element={<QuestionsPerformance />} />
            <Route path="/questions/previous" element={<QuestionsPrevious />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/students" element={<Students />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
    </RootLayout>
  );
}

// Stub out Student Pages for routing
import StudentTestHistory from "./routes/student/test-history";

function StudentApp() {
  const location = useLocation();
  return (
    <StudentRootLayout>
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn("h-full", !location.pathname.includes("/test-session") && "px-6 py-6")}
        >
          <Routes location={location}>
            <Route path="/" element={<StudentDashboard />} />
            <Route path="/create-test" element={<StudentCreateTest />} />
            <Route path="/test-history" element={<StudentTestHistory />} />
            <Route path="/test-session" element={<StudentTestSession />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/student" replace />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
    </StudentRootLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute allowedRole="admin" />}>
              <Route path="/admin/*" element={<AdminApp />} />
            </Route>
            <Route element={<ProtectedRoute allowedRole="student" />}>
              <Route path="/student/*" element={<StudentApp />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </NotificationProvider>
    </AuthProvider>
  );
}
