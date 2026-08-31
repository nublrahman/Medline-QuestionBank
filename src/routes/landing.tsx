import { motion } from "framer-motion";
import { GraduationCap, ShieldCheck } from "@phosphor-icons/react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Landing() {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={`/${role || "student"}`} replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
      <div className="absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-tile-violet/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-border/50 bg-background/50 p-8 shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-primary/10 p-4 text-primary">
            <GraduationCap className="size-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Welcome to Medline
          </h1>
          <p className="mt-2 text-muted-foreground">
            Please select your portal to continue
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Student Portal Option */}
          <Link to="/student" className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative">
              <div className="mb-4 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="size-6" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Student Portal</h2>
              <p className="text-sm text-muted-foreground">
                Access your personalized test generator, performance analytics, and study history.
              </p>
              <div className="mt-6 flex items-center font-medium text-primary">
                Log in as Student <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </Link>

          {/* Admin Portal Option */}
          <Link to="/admin" className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-tile-violet/50 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-tile-violet/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative">
              <div className="mb-4 grid size-12 place-items-center rounded-xl bg-tile-violet/10 text-tile-violet">
                <ShieldCheck className="size-6" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Admin Console</h2>
              <p className="text-sm text-muted-foreground">
                Manage the question bank, monitor student performance, and generate invites.
              </p>
              <div className="mt-6 flex items-center font-medium text-tile-violet">
                Log in as Admin <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
