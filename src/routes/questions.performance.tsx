;
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default Performance;

function Performance() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data: questions } = await supabase.from('questions').select('id, type, difficulty, stem');
      const { data: answers } = await supabase.from('test_answers').select('question_id, is_correct, questions(type)');

      let totalAnswers = answers?.length || 0;
      let totalCorrect = 0;
      let qStats: Record<string, { correct: number; incorrect: number; total: number, stem: string }> = {};
      let typeStats: Record<string, { correct: number; incorrect: number }> = {};
      
      let diffCounts: Record<string, number> = {};

      questions?.forEach((q: any) => {
        qStats[q.id] = { correct: 0, incorrect: 0, total: 0, stem: q.stem };
        const diff = q.difficulty || 'Unknown';
        diffCounts[diff] = (diffCounts[diff] || 0) + 1;
      });

      answers?.forEach((a: any) => {
        if (a.is_correct) totalCorrect++;
        if (qStats[a.question_id]) {
          qStats[a.question_id].total++;
          if (a.is_correct) qStats[a.question_id].correct++;
          else qStats[a.question_id].incorrect++;
        }
        const type = a.questions?.type || 'traditional';
        if (!typeStats[type]) typeStats[type] = { correct: 0, incorrect: 0 };
        if (a.is_correct) typeStats[type].correct++;
        else typeStats[type].incorrect++;
      });

      const avgAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
      
      let below50 = 0;
      const flagged: any[] = [];
      Object.entries(qStats).forEach(([id, stat]) => {
        if (stat.total > 0) {
          const acc = Math.round((stat.correct / stat.total) * 100);
          if (acc < 50) {
            below50++;
            const stripHtml = (html: string) => {
              const tmp = document.createElement("DIV");
              tmp.innerHTML = html;
              return tmp.textContent || tmp.innerText || "";
            };
            flagged.push({
              id: id.substring(0, 8),
              snippet: stripHtml(stat.stem || "").substring(0, 50) + "...",
              attempts: stat.total,
              accuracy: acc,
              flag: "Low accuracy"
            });
          }
        }
      });
      
      const typeData = Object.entries(typeStats).map(([name, stat]) => {
         const tot = stat.correct + stat.incorrect;
         return {
           name: name.replace('next-gen-', '').replace('mcq-', 'MCQ '),
           correct: tot > 0 ? Math.round((stat.correct/tot)*100) : 0,
           incorrect: tot > 0 ? Math.round((stat.incorrect/tot)*100) : 0
         };
      }).filter(d => d.correct > 0 || d.incorrect > 0);

      const colors = ["oklch(0.72 0.16 155)", "oklch(0.7 0.13 240)", "oklch(0.62 0.22 25)", "oklch(0.8 0.1 80)"];
      const distribution = Object.entries(diffCounts).map(([name, val], i) => ({
        name,
        value: Math.round((val / (questions?.length || 1)) * 100),
        color: colors[i % colors.length]
      }));

      setData({
        avgAccuracy: `${avgAccuracy}%`,
        below50,
        flagged: flagged.slice(0, 10),
        typeData: typeData.length > 0 ? typeData : [{ name: 'None', correct: 0, incorrect: 0}],
        distribution
      });
    }
    load();
  }, []);

  if (!data) return <AdminLayout title="Question Performance" subtitle="Loading..."><div className="p-8">Loading data...</div></AdminLayout>;

  return (
    <AdminLayout title="Question Performance" subtitle="Spot weak items and refine your bank.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { l: "Avg accuracy", v: data.avgAccuracy },
          { l: "Items below 50% accuracy", v: data.below50 },
          { l: "Median time / item", v: "—" },
          { l: "Flagged for review", v: data.flagged.length },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.l}</div>
            <div className="mt-1 text-2xl font-bold">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 xl:col-span-2">
          <h3 className="text-lg font-semibold">Accuracy by Question Type</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 200)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.52 0.03 220)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.52 0.03 220)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="correct" stackId="a" fill="oklch(0.55 0.18 260)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="incorrect" stackId="a" fill="oklch(0.85 0.05 260)" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">Difficulty Distribution</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.distribution} dataKey="value" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {data.distribution.map((d: any) => (<Cell key={d.name} fill={d.color} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {data.distribution.map((d: any) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span>
                <span className="font-semibold">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">Items needing review</h3>
        <p className="text-sm text-muted-foreground">Questions with low accuracy or unusual skip patterns.</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <tr><th className="p-3 pl-4">ID</th><th className="p-3">Snippet</th><th className="p-3">Attempts</th><th className="p-3">Accuracy</th><th className="p-3">Flag</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.flagged.map((f: any, i: number) => (
                <tr key={f.id} className="bg-card">
                  <td className="p-3 pl-4 font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium">{f.snippet}</td>
                  <td className="p-3">{f.attempts}</td>
                  <td className="p-3"><span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">{f.accuracy}%</span></td>
                  <td className="p-3"><span className="rounded-full bg-warning/20 px-2.5 py-1 text-xs font-semibold text-warning-foreground">{f.flag}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
