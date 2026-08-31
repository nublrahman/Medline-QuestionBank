import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Role = "admin" | "student" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: Role;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      setIsLoading(true);
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error getting session:", error);
      }

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session) {
        let userRole = session.user.user_metadata?.role as string;
        if (userRole && userRole !== "admin" && userRole !== "student") {
          userRole = "admin";
          // Auto-fix broken role in the background
          supabase.auth.updateUser({ data: { role: 'admin' } });
        }
        setRole((userRole as Role) || "student"); // Default to student if no role is set
      } else {
        setRole(null);
      }
      
      setIsLoading(false);
    };

    getSession();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        let userRole = session.user.user_metadata?.role as string;
        if (userRole && userRole !== "admin" && userRole !== "student") {
          userRole = "admin";
          supabase.auth.updateUser({ data: { role: 'admin' } });
        }
        setRole((userRole as Role) || "student");
      } else {
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    role,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
