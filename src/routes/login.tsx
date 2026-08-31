import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Spinner, GraduationCap, ArrowRight, Ticket } from "@phosphor-icons/react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Login() {
  const { user, role, isLoading: authLoading } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [codeValid, setCodeValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!authLoading && user) {
    return <Navigate to={`/${role || "student"}`} replace />;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        const userRole = data.user.user_metadata?.role;
        
        // Prevent deleted students from logging in
        if (userRole !== 'admin') {
          const { data: studentRecord } = await supabase.from('students').select('id').eq('email', email.trim()).single();
          if (!studentRecord) {
            await supabase.auth.signOut();
            throw new Error("Your account has been disabled by an administrator.");
          }
        }

        toast.success("Successfully logged in");
        navigate(`/${userRole || "student"}`);
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('invitation_codes').select('*').eq('code', code).single();
      if (error || !data) {
        toast.error("Invalid invitation code");
        return;
      }
      if (data.status !== 'Active') {
        toast.error("This code is no longer active");
        return;
      }
      
      const today = new Date();
      // Reset time portion for accurate date comparison
      today.setHours(0, 0, 0, 0);
      
      const created = new Date(data.created_date);
      
      if (today < created) {
        toast.error("This code is not yet valid");
        return;
      }

      if (data.student_name && data.student_name !== '—') {
        const parts = data.student_name.split(' | ');
        setStudentName(parts[0] || "");
        if (parts[1]) setStudentEmail(parts[1]);
        if (parts[2]) setStudentPhone(parts[2]);
      }
      
      setCodeValid(true);
      toast.success("Code is valid! Please confirm your name.");
    } catch (err) {
      toast.error("An error occurred verifying the code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentEmail.trim() || !studentPassword.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsLoading(true);
    try {
      const dbStudentName = `${studentName.trim()} | ${studentEmail.trim()} | ${studentPhone.trim()}`;
      await supabase.from('invitation_codes').update({ student_name: dbStudentName, status: 'Used' }).eq('code', code);
      
      const { data, error } = await supabase.auth.signUp({
        email: studentEmail.trim(),
        password: studentPassword.trim(),
        options: { data: { role: 'student', full_name: studentName, code: code, phone: studentPhone } }
      });
      
      let authUser = data?.user;
      const isAlreadyRegistered = error && error.message.includes('already registered');
      
      if (isAlreadyRegistered) {
        // Check if this user was deleted by admin
        const { data: studentRecord } = await supabase.from('students').select('id').eq('email', studentEmail.trim()).single();
        if (!studentRecord) {
          throw new Error("Your account has been disabled by an administrator.");
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: studentEmail.trim(),
          password: studentPassword.trim(),
        });
        if (signInError) throw signInError;
        authUser = signInData?.user || null;
      }
      
      if (authUser) {
        // Ensure student exists in students table with the matching Auth user ID
        const parts = studentName.trim().split(" ");
        const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].substring(0, 2);
        
        await supabase.from('students').upsert({
          id: authUser.id,
          name: studentName.trim(),
          email: studentEmail.trim(),
          initials: initials.toUpperCase(),
          tests_taken: 0,
          avg_score: 0,
          last_status: "-",
          trend: "up",
          invitation_code: code
        }, { onConflict: 'email' });

        // Notify admin
        addNotification({
          type: "user",
          title: "New student joined",
          desc: `${studentName.trim()} used invite code ${code}`,
          unread: true,
          role: "admin"
        });
      } else if (isAlreadyRegistered) {
        addNotification({
          type: "user",
          title: "Student logged in",
          desc: `${studentName.trim()} logged in`,
          unread: true,
          role: "admin"
        });
      }

      toast.success(isAlreadyRegistered ? "Logged in successfully!" : "Account created successfully!");
      navigate("/student");
    } catch (err) {
      toast.error("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side: Login Form */}
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 xl:px-24">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto w-full max-w-sm"
        >
          <div className="mb-10">
            <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-6" weight="duotone" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-muted-foreground">
              Please sign in to Medline using your preferred method.
            </p>
          </div>

          <div className="mb-8 flex rounded-xl bg-muted p-1">
            <button
              onClick={() => setMode("email")}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                mode === "email" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Email Login
            </button>
            <button
              onClick={() => { setMode("code"); setCodeValid(false); }}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                mode === "code" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Invitation Code
            </button>
          </div>

          {mode === "email" ? (
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-background/50 text-base shadow-sm focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a href="#" className="text-sm font-medium text-primary hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-background/50 text-base shadow-sm focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="h-12 w-full text-base font-medium shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 size-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={codeValid ? handleCodeLogin : handleVerifyCode} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Invitation Code</Label>
                  <div className="relative">
                    <Input
                      id="code"
                      type="text"
                      placeholder="MED-2026-XXXXX"
                      value={code}
                      onChange={(e) => { setCode(e.target.value); setCodeValid(false); }}
                      required
                      className="h-12 bg-background/50 pl-10 text-base uppercase shadow-sm focus-visible:ring-primary/20"
                    />
                    <Ticket className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                
                {codeValid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4 overflow-hidden pt-2"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="studentName">Your Full Name</Label>
                      <Input
                        id="studentName"
                        type="text"
                        placeholder="John Doe"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        required
                        className="h-12 bg-background/50 text-base shadow-sm focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentEmail">Email</Label>
                      <Input
                        id="studentEmail"
                        type="email"
                        placeholder="name@example.com"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        required
                        className="h-12 bg-background/50 text-base shadow-sm focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentPhone">Phone Number (Optional)</Label>
                      <Input
                        id="studentPhone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={studentPhone}
                        onChange={(e) => setStudentPhone(e.target.value)}
                        className="h-12 bg-background/50 text-base shadow-sm focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentPassword">Password</Label>
                      <Input
                        id="studentPassword"
                        type="password"
                        placeholder="Create a password"
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        required
                        className="h-12 bg-background/50 text-base shadow-sm focus-visible:ring-primary/20"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              <Button 
                type="submit" 
                className="h-12 w-full text-base font-medium shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 size-5 animate-spin" />
                    {codeValid ? "Logging in..." : "Verifying code..."}
                  </>
                ) : (
                  <>
                    {codeValid ? "Continue to Medline" : "Verify Code"}
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </form>
          )}


        </motion.div>
      </div>

      {/* Right side: Hero Section (Hidden on mobile) */}
      <div className="relative hidden w-1/2 overflow-hidden bg-muted lg:block">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/80 to-tile-violet/80 mix-blend-multiply" />
        
        {/* Generated Hero Image */}
        <img 
          src="/login-hero.png" 
          alt="Medline Abstract Design" 
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />

        {/* Decorative Blur Orbs */}
        <div className="absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-primary/30 blur-[100px]" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-tile-violet/30 blur-[100px]" />

        {/* Floating Content */}
        <div className="absolute bottom-12 left-12 right-12 z-10 rounded-3xl border border-white/10 bg-black/20 p-8 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-white/10 p-3 text-white backdrop-blur-md">
              <GraduationCap className="size-6" weight="duotone" />
            </div>
            <blockquote className="text-xl font-medium leading-relaxed text-white">
              "Medline has revolutionized our nursing preparation, providing a highly intuitive and powerful platform for both students and educators."
            </blockquote>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
