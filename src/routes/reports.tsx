;
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { DownloadSimple as Download, FileText } from "@phosphor-icons/react";

export default Reports;

function Reports() {
  const [data, setData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState("All time");

  useEffect(() => {
    async function loadData() {
      try {
        let studentsQuery = supabase.from('students').select('*', { count: 'exact', head: true });
        let testsQuery = supabase.from('test_sessions').select('*', { count: 'exact', head: true });
        let sessionsQuery = supabase.from('test_sessions').select('id, created_at, test_answers(is_correct, questions(category))');

        if (timeRange !== "All time") {
          const days = timeRange === "Last 7 days" ? 7 : timeRange === "Last 30 days" ? 30 : 90;
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          const cutoffStr = cutoff.toISOString();
          
          // Removed studentsQuery filter as it crashes if column doesn't exist
          testsQuery = testsQuery.gte('created_at', cutoffStr);
          sessionsQuery = sessionsQuery.gte('created_at', cutoffStr);
        }

        let studentsCount = 0;
        let testsCount = 0;
        let sessions: any[] = [];

        try {
          const { count, error } = await studentsQuery;
          if (error) throw error;
          studentsCount = count || 0;
        } catch (err) {
          console.warn("Failed to load students count:", err);
        }

        try {
          const { count, error } = await testsQuery;
          if (error) throw error;
          testsCount = count || 0;
        } catch (err) {
          console.warn("Failed to load tests count:", err);
        }

        try {
          const { data, error } = await sessionsQuery;
          if (error) throw error;
          sessions = data || [];
        } catch (err) {
          console.warn("Failed to load sessions:", err);
        }

        let totalAnswers = 0;
        let totalCorrect = 0;
        let passed = 0;
        let failed = 0;
        let monthlyScores: Record<string, { total: number, correct: number }> = {};
        let catActivity: Record<string, number> = {};

        (sessions || []).forEach((s: any) => {
          const ans = s.test_answers || [];
          if (ans.length > 0) {
            const correct = ans.filter((a: any) => a.is_correct).length;
            const score = Math.round((correct / ans.length) * 100);
            totalCorrect += correct;
            totalAnswers += ans.length;
            if (score >= 75) passed++; else failed++;
            
            // Trend data
            const date = new Date(s.created_at);
            const month = date.toLocaleString('default', { month: 'short' });
            if (!monthlyScores[month]) monthlyScores[month] = { total: 0, correct: 0 };
            monthlyScores[month].correct += correct;
            monthlyScores[month].total += ans.length;

            // Category data
            ans.forEach((a: any) => {
               const cat = a.questions?.category || 'Uncategorized';
               catActivity[cat] = (catActivity[cat] || 0) + 1;
            });
          }
        });

        const avgScore = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
        const passRate = (passed + failed) > 0 ? Math.round((passed / (passed + failed)) * 100) : 0;

        const trendData = Object.entries(monthlyScores).map(([month, stats]) => ({
           month,
           avg: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
        }));

        const categoryActivity = Object.entries(catActivity).map(([name, value]) => ({
           name, value
        })).sort((a, b) => b.value - a.value).slice(0, 8); // Top 8 categories

        setData({
          testsCompleted: testsCount || 0,
          avgScore: `${avgScore}%`,
          passRate: `${passRate}%`,
          activeStudents: studentsCount || 0,
          trendData: trendData.length > 0 ? trendData : [{ month: 'Now', avg: 0 }],
          categoryActivity: categoryActivity.length > 0 ? categoryActivity : [{ name: 'None', value: 0 }]
        });
      } catch (err) {
        console.warn("Failed to load reports data:", err);
      }
    }
    loadData();
  }, [timeRange]);

  if (!data) return <AdminLayout title="Reports & Analytics" subtitle="Loading..."><div className="p-8">Loading reports...</div></AdminLayout>;

  return (
    <AdminLayout title="Reports & Analytics" subtitle="Cohort performance and content health at a glance.">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {["Last 7 days", "Last 30 days", "Last 90 days", "All time"].map((r) => (
          <button 
            key={r} 
            onClick={() => setTimeRange(r)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${timeRange === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted"}`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ["Tests completed", data.testsCompleted],
          ["Average score", data.avgScore],
          ["Pass rate", data.passRate],
          ["Active students", data.activeStudents],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{l as string}</div>
            <div className="mt-1 text-2xl font-bold">{v as string | number}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">Score over time</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendData}>
                <defs>
                  <linearGradient id="rep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.55 0.18 260)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.55 0.18 260)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 200)" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.52 0.03 220)" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="oklch(0.52 0.03 220)" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="avg" stroke="oklch(0.55 0.18 260)" fill="url(#rep)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">Activity by category</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 200)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.52 0.03 220)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="oklch(0.52 0.03 220)" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="oklch(0.55 0.18 260)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">Saved reports</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {["Weekly cohort summary", "Question-bank health", "NGN performance breakdown"].map((r) => (
            <div key={r} className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
              <div className="grid size-10 place-items-center rounded-xl bg-tile-blue"><FileText className="size-5" weight="regular" /></div>
              <div className="flex-1">
                <div className="font-semibold">{r}</div>
                <div className="text-xs text-muted-foreground">Updated daily · PDF / CSV</div>
              </div>
              <button className="grid size-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"><Download className="size-4" weight="regular" /></button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
