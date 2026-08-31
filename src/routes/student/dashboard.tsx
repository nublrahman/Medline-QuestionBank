import { StudentLayout } from "@/components/layout/StudentLayout";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Target, TrendUp as TrendingUp, Warning as AlertTriangle, CheckCircle as CheckCircle2 } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [avgScore, setAvgScore] = useState(0);
  const [testsTaken, setTestsTaken] = useState(0);
  const [needsReview, setNeedsReview] = useState(0);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [strongestTopics, setStrongestTopics] = useState<any[]>([]);
  const [needsImprovement, setNeedsImprovement] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      if (!user) return;
      const { data: sessions } = await supabase
        .from('test_sessions')
        .select(`
          id,
          created_at,
          completed_at,
          test_answers ( id, is_correct, questions ( category ) )
        `)
        .eq('student_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });
        
      if (sessions && sessions.length > 0) {
        setTestsTaken(sessions.length);
        
        // Calculate average score and needs review
        let totalQuestions = 0;
        let totalCorrect = 0;
        let incorrectCount = 0;
        
        const categoryStats: Record<string, { total: number, correct: number }> = {};
        
        // Only use up to last 6 for the chart, but they are ordered descending, so reverse them for the chart
        const chartData = sessions.slice(0, 6).reverse().map((session: any, idx) => {
          const answers = session.test_answers || [];
          const sqTotal = answers.length;
          const sqCorrect = answers.filter((a: any) => a.is_correct).length;
          const score = sqTotal > 0 ? Math.round((sqCorrect / sqTotal) * 100) : 0;
          return { test: "T" + (idx + 1), score };
        });
        setPerformanceData(chartData);

        sessions.forEach((session: any) => {
          const answers = session.test_answers || [];
          totalQuestions += answers.length;
          
          answers.forEach((ans: any) => {
            if (ans.is_correct) totalCorrect++;
            else incorrectCount++;
            
            const cat = ans.questions?.category || "Unknown";
            if (!categoryStats[cat]) categoryStats[cat] = { total: 0, correct: 0 };
            categoryStats[cat].total++;
            if (ans.is_correct) categoryStats[cat].correct++;
          });
        });
        
        setAvgScore(totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0);
        setNeedsReview(incorrectCount);
        
        const catArray = Object.entries(categoryStats).map(([name, stats]) => ({
          name,
          score: Math.round((stats.correct / stats.total) * 100)
        })).sort((a, b) => b.score - a.score);
        
        setStrongestTopics(catArray.slice(0, 3));
        setNeedsImprovement(catArray.slice(-3).reverse().filter(c => !setStrongestTopics.includes(c))); // filter out overlap if few categories
      }
      setLoading(false);
    }
    loadDashboard();
  }, [user]);
  return (
    <StudentLayout
      title="Performance Dashboard"
      subtitle="Track your progress, identify weaknesses, and prepare for the NCLEX."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_350px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Target className="size-5" />
                </div>
                <div className="text-sm font-semibold text-muted-foreground">Average Score</div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">{avgScore}%</div>
            </motion.div>
            
            <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-tile-violet/10 text-tile-violet">
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="text-sm font-semibold text-muted-foreground">Tests Taken</div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">{testsTaken}</div>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-tile-amber/10 text-tile-amber">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="text-sm font-semibold text-muted-foreground">Needs Review</div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">{needsReview}</div>
            </motion.div>
          </div>

          {/* Performance Chart */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Historical Performance</h3>
                <p className="text-sm text-muted-foreground">Your scores over the last 6 tests</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="test" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    itemStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#scoreGradient)"
                    isAnimationActive={true}
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Strongest Topics</h3>
            {strongestTopics.length > 0 ? (
              <div className="space-y-4">
                {strongestTopics.map((topic, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="text-sm font-medium">{topic.name}</div>
                    <div className="text-sm font-bold text-success">{topic.score}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Not enough data
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Needs Improvement</h3>
            {needsImprovement.length > 0 ? (
              <div className="space-y-4">
                {needsImprovement.map((topic, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="text-sm font-medium">{topic.name}</div>
                    <div className="text-sm font-bold text-destructive">{topic.score}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Not enough data
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
