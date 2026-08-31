import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Users,
  Question as HelpCircle,
  Tag,
  Stack as Layers,
  ClipboardText as ClipboardCheck,
  Trophy,
  CheckCircle as CheckCircle2,
  Ticket,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  FilePlus,
  Tag as TagIcon,
  Bookmarks as TagsIcon,
  ChartBar as BarChart3,
} from "@phosphor-icons/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } 
  }
};

export default Dashboard;



function Tile({ t }: { t: any }) {
  return (
    <motion.div 
      variants={itemVariants}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg cursor-pointer"
    >
      <div className="mb-8 flex items-start justify-between">
        <div
          className="grid size-11 place-items-center rounded-xl"
          style={{ backgroundColor: `var(--${t.tone})` }}
        >
          <t.icon className="size-5 text-foreground/70" />
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            t.up ? "bg-success/15 text-success-foreground" : "bg-destructive/10 text-destructive"
          }`}
        >
          {t.up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          {t.delta}
        </span>
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t.label}
      </div>
      <div className="mt-1 text-3xl font-bold tracking-tight">
        {t.stringValue ? (
          t.stringValue
        ) : (
          <AnimatedCounter value={t.value as number} suffix={t.suffix as string} decimals={t.decimals} />
        )}
      </div>
    </motion.div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<{
    stats: any;
    trendData: any[];
    bankMix: any[];
    categoryActivity: any[];
    recentTests: any[];
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [
          { count: totalStudents },
          { count: totalQuestions },
          { count: totalCategories },
          { count: totalTests },
          { count: activeCodes },
          { data: questions },
          { data: sessions },
          { data: categories },
          { data: students }
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('questions').select('*', { count: 'exact', head: true }),
          supabase.from('categories').select('*', { count: 'exact', head: true }),
          supabase.from('test_sessions').select('*', { count: 'exact', head: true }),
          supabase.from('invitation_codes').select('*', { count: 'exact', head: true }),
          supabase.from('questions').select('id, type, category'),
          supabase.from('test_sessions').select('id, created_at, student_id, test_answers(question_id, is_correct)'),
          supabase.from('categories').select('subcategories'),
          supabase.from('students').select('id, name, initials')
        ]);

        let totalCorrect = 0;
        let totalAnswers = 0;
        let passed = 0;
        let failed = 0;

        (sessions || []).forEach((s: any) => {
          const ans = s.test_answers || [];
          if (ans.length > 0) {
            const correct = ans.filter((a: any) => a.is_correct).length;
            const score = Math.round((correct / ans.length) * 100);
            totalCorrect += correct;
            totalAnswers += ans.length;
            if (score >= 75) passed++; else failed++;
          }
        });

        const avgScore = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
        const passFail = `${passed} / ${failed}`;

        let traditionalCount = 0;
        let nextGenCount = 0;
        (questions || []).forEach(q => {
           if (q.type?.startsWith('mcq') || q.type === 'traditional') traditionalCount++;
           else nextGenCount++;
        });

        const totalTypes = traditionalCount + nextGenCount;
        const bankMix = [
          { name: "Traditional", value: traditionalCount, percentage: totalTypes > 0 ? Math.round((traditionalCount/totalTypes)*100) : 0, color: "var(--primary)" },
          { name: "Next Generation", value: nextGenCount, percentage: totalTypes > 0 ? Math.round((nextGenCount/totalTypes)*100) : 0, color: "var(--teal)" }
        ];
        
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const trendMap: Record<string, { totalCorrect: number, totalAns: number, passed: number, failed: number }> = {};
        
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${months[d.getMonth()]}`;
          trendMap[key] = { totalCorrect: 0, totalAns: 0, passed: 0, failed: 0 };
        }

        const qMap = new Map((questions || []).map(q => [q.id, q]));
        const categoryCounts: Record<string, number> = {};

        (sessions || []).forEach(s => {
           if (!s.created_at) return;
           const d = new Date(s.created_at);
           const key = `${months[d.getMonth()]}`;
           
           const ans = s.test_answers || [];
           if (ans.length > 0) {
             const correct = ans.filter((a: any) => a.is_correct).length;
             const score = (correct / ans.length) * 100;
             if (trendMap[key]) {
               trendMap[key].totalCorrect += correct;
               trendMap[key].totalAns += ans.length;
               if (score >= 75) trendMap[key].passed++; else trendMap[key].failed++;
             }

             ans.forEach((a: any) => {
               const q = qMap.get(a.question_id);
               if (q && q.category) {
                 categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
               }
             });
           }
        });

        const trendData = Object.entries(trendMap).map(([month, data]) => {
          const avgScore = data.totalAns > 0 ? Math.round((data.totalCorrect / data.totalAns) * 100) : 0;
          const totTests = data.passed + data.failed;
          const passRate = totTests > 0 ? Math.round((data.passed / totTests) * 100) : 0;
          return { month, avg: avgScore, pass: passRate };
        });

        const categoryActivity = Object.entries(categoryCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        const studentMap = new Map((students || []).map(st => [st.id, st]));
        const recentTests = (sessions || [])
          .filter(s => s.test_answers && s.test_answers.length > 0)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(s => {
            const st = studentMap.get(s.student_id);
            const isCurrentUser = s.student_id === user?.id;
            
            const ans = s.test_answers || [];
            const correct = ans.filter((a: any) => a.is_correct).length;
            const score = Math.round((correct / ans.length) * 100);
            
            let cat = "Mixed";
            const uniqueCats = Array.from(new Set(ans.map((a: any) => qMap.get(a.question_id)?.category).filter(Boolean))) as string[];
            if (uniqueCats.length > 0) cat = uniqueCats.join(', ');
            
            return {
              name: st?.name || (isCurrentUser ? "Admin Preview" : "Unknown Student"),
              initials: st?.initials || (isCurrentUser ? "AD" : "?"),
              test: `${ans.length} Questions`,
              cat,
              score,
              status: score >= 75 ? "Pass" : "Fail",
              date: new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            };
          });

        const totalSubcategories = (categories || []).reduce((acc: number, cat: any) => acc + (cat.subcategories?.length || 0), 0);

        setData({
          stats: { 
            totalStudents: totalStudents || 0, 
            totalQuestions: totalQuestions || 0, 
            totalCategories: totalCategories || 0, 
            totalSubcategories, 
            totalTests: totalTests || 0, 
            avgScore, 
            passFail, 
            activeCodes: activeCodes || 0 
          },
          trendData, 
          bankMix, 
          categoryActivity, 
          recentTests
        });
      } catch (err) {
        console.warn("Failed to load dashboard data:", err);
        setData({
          stats: { totalStudents: 0, totalQuestions: 0, totalCategories: 0, totalSubcategories: 0, totalTests: 0, avgScore: 0, passFail: "0 / 0", activeCodes: 0 },
          trendData: [], bankMix: [], categoryActivity: [], recentTests: []
        });
      }
    }
    loadData();
  }, []);

  if (!data) return <AdminLayout title="Loading..."><div className="p-8">Loading dashboard...</div></AdminLayout>;

  const { stats, trendData, bankMix, categoryActivity, recentTests } = data;

  const tiles = [
    { label: "Total Students", value: stats.totalStudents, delta: "+12.4%", up: true, icon: Users, tone: "tile-blue" },
    { label: "Total Questions", value: stats.totalQuestions, delta: "+86", up: true, icon: HelpCircle, tone: "tile-teal" },
    { label: "Total Categories", value: stats.totalCategories, delta: "+2", up: true, icon: Tag, tone: "tile-green" },
    { label: "Total Subcategories", value: stats.totalSubcategories, delta: "+11", up: true, icon: Layers, tone: "tile-violet" },
    { label: "Total Tests Taken", value: stats.totalTests, delta: "+8.1%", up: true, icon: ClipboardCheck, tone: "tile-blue" },
    { label: "Average Student Score", value: stats.avgScore, suffix: "%", decimals: 1, delta: "+3.2%", up: true, icon: Trophy, tone: "tile-amber" },
    { label: "Pass / Fail Ratio", stringValue: stats.passFail, delta: "+1.6%", up: true, icon: CheckCircle2, tone: "tile-green" },
    { label: "Active Invitation Codes", value: stats.activeCodes, delta: "-6", up: false, icon: Ticket, tone: "tile-pink" },
  ];

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.first_name || user?.email?.split('@')[0] || "Admin";

  return (
    <AdminLayout
      title={`Welcome back, ${displayName}`}
      subtitle="Here's what's happening across your NCLEX prep platform today."
    >
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {tiles.map((t) => (
          <Tile key={t.label} t={t} />
        ))}
      </motion.div>

      {/* Charts row */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3"
      >
        <div className="rounded-2xl border border-border bg-card p-6 xl:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">Student Performance Trend</h3>
              <p className="text-sm text-muted-foreground">Average score and pass rate across the last 7 months</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[oklch(0.55_0.18_260)]" />Avg Score</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[oklch(0.7_0.13_240)]" />Pass Rate</span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.55 0.18 260)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="oklch(0.55 0.18 260)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.7 0.13 240)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.7 0.13 240)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 200)" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.52 0.03 220)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.52 0.03 220)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
                <Area 
                  type="monotone" 
                  dataKey="avg" 
                  stroke="oklch(0.55 0.18 260)" 
                  fill="url(#g1)" 
                  strokeWidth={2.5}
                  isAnimationActive={true}
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="pass" 
                  stroke="oklch(0.7 0.13 240)" 
                  fill="url(#g2)" 
                  strokeWidth={2.5}
                  isAnimationActive={true}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">Question Bank Mix</h3>
          <p className="text-sm text-muted-foreground">Traditional vs Next Generation</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={bankMix} 
                  dataKey="value" 
                  innerRadius={55} 
                  outerRadius={85} 
                  paddingAngle={4}
                  isAnimationActive={true}
                  animationDuration={1500}
                >
                  {bankMix.map((b) => (
                    <Cell key={b.name} fill={b.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {bankMix.map((b) => (
              <div key={b.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: b.color }} />{b.name}</span>
                <span className="font-semibold">{b.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Recent activity + category bars */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3"
      >
        <div className="rounded-2xl border border-border bg-card p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Recent Test Activity</h3>
              <p className="text-sm text-muted-foreground">Latest student attempts</p>
            </div>
            <Link to="/admin/students" className="text-sm font-semibold text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {recentTests.map((r) => (
              <div key={r.name + r.date} className="grid grid-cols-12 items-center gap-3 py-3 text-sm">
                <div className="col-span-4 flex items-center gap-3 truncate">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{r.initials}</div>
                  <span className="font-medium truncate" title={r.name}>{r.name}</span>
                </div>
                <div className="col-span-2 text-muted-foreground whitespace-nowrap">{r.test}</div>
                <div className="col-span-2 truncate text-muted-foreground" title={r.cat}>{r.cat}</div>
                <div className="col-span-1 font-semibold">{r.score}%</div>
                <div className="col-span-2 text-center">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.status === "Pass" ? "bg-success/15 text-success-foreground" : "bg-destructive/10 text-destructive"}`}>{r.status}</span>
                </div>
                <div className="col-span-1 text-right text-xs text-muted-foreground whitespace-nowrap">{r.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">Activity by Category</h3>
          <p className="text-sm text-muted-foreground">Tests taken in the last 30 days</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryActivity} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 200)" horizontal={false} />
                <XAxis type="number" stroke="oklch(0.52 0.03 220)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="oklch(0.52 0.03 220)" fontSize={11} width={90} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  fill="oklch(0.55 0.18 260)" 
                  radius={[0, 8, 8, 0]} 
                  isAnimationActive={true}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 rounded-2xl border border-border bg-card p-6"
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <p className="text-sm text-muted-foreground">Jump back into common admin workflows</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Add New Question", to: "/admin/questions/create", icon: FilePlus, tone: "tile-blue" },
            { label: "Create Grouped Question", to: "/admin/questions/create", icon: Layers, tone: "tile-violet" },
            { label: "Generate Invitation Code", to: "/admin/invitation-codes", icon: Ticket, tone: "tile-amber" },
            { label: "Add Category", to: "/admin/categories", icon: TagsIcon, tone: "tile-green" },
            { label: "Add Subcategory", to: "/admin/categories", icon: TagIcon, tone: "tile-teal" },
            { label: "View Student Reports", to: "/admin/reports", icon: BarChart3, tone: "tile-pink" },
          ].map((q) => (
            <motion.div key={q.label} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
              <Link
                to={q.to}
                className="group flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition hover:border-primary/40 hover:shadow-sm h-full"
              >
                <div className="grid size-11 place-items-center rounded-xl" style={{ backgroundColor: `var(--${q.tone})` }}>
                  <q.icon className="size-5 text-foreground/70" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{q.label}</div>
                </div>
                <Plus className="size-4 text-muted-foreground transition group-hover:text-primary" weight="regular" />
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AdminLayout>
  );
}
