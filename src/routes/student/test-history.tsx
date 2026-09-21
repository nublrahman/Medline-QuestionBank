import { StudentLayout } from "@/components/layout/StudentLayout";
import { MagnifyingGlass as Search, Faders as Filter, CalendarBlank as Calendar, Clock, Target, CheckCircle as CheckCircle2, XCircle, Eye } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/contexts/AuthContext";

export default function StudentTestHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("All Time");

  useEffect(() => {
    async function loadHistory() {
      if (!user) return;
      const { data: sessions } = await supabase
        .from('test_sessions')
        .select(`
          id,
          created_at,
          completed_at,
          test_answers ( id, is_correct, questions ( category, type ) )
        `)
        .eq('student_id', user.id)
        .not('completed_at', 'is', null)
        .order('created_at', { ascending: false });

      if (sessions) {
        const history = sessions
          .filter((session: any) => (session.test_answers?.length || 0) > 0)
          .map((session: any) => {
            const answers = session.test_answers || [];
            const totalQuestions = answers.length;
            const correct = answers.filter((a: any) => a.is_correct).length;
            const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
            
            let category = "Mixed Categories";
            let type = "Custom Test";
            if (totalQuestions > 0 && answers[0].questions) {
              const uniqueCategories = Array.from(new Set(answers.map((a: any) => a.questions?.category).filter(Boolean))) as string[];
              if (uniqueCategories.length > 0) {
                category = uniqueCategories.join(', ');
              }
              const hasTraditional = answers.some((a: any) => a.questions?.type?.startsWith('mcq') || a.questions?.type === 'traditional');
              const hasNextGen = answers.some((a: any) => a.questions?.type && !a.questions?.type?.startsWith('mcq') && a.questions?.type !== 'traditional');
              
              if (hasTraditional && hasNextGen) type = "Mixed Mode";
              else if (hasTraditional) type = "Traditional";
              else if (hasNextGen) type = "Next-Gen";
            }

            let duration = "Unknown";
            if (session.created_at && session.completed_at) {
              const start = new Date(session.created_at).getTime();
              const end = new Date(session.completed_at).getTime();
              duration = Math.max(1, Math.round((end - start) / 60000)) + " min";
            }
            
            const date = new Date(session.created_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric'
            });

            return {
              id: session.id,
              status: score >= 75 ? "Passed" : "Needs Review",
              type,
              category,
              date,
              created_at: session.created_at,
              duration,
              totalQuestions,
              correct,
              score
            };
          });
        setTestHistory(history);
      }
      setLoading(false);
    }
    loadHistory();
  }, [user]);

  const filteredHistory = testHistory.filter(test => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!test.category.toLowerCase().includes(q) && !test.type.toLowerCase().includes(q)) return false;
    }
    if (modeFilter !== "All" && test.type !== modeFilter) return false;
    
    if (dateFilter !== "All Time") {
      const testDate = new Date(test.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - testDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (dateFilter === "Last 7 Days" && diffDays > 7) return false;
      if (dateFilter === "Last 30 Days" && diffDays > 30) return false;
    }
    return true;
  });

  return (
    <StudentLayout
      title="Test History"
      subtitle="Review all your past exam sessions, analyze your performance, and review rationales."
    >
      <div className="space-y-6">
        
        {/* Filters & Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by category or mode..." 
              className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:bg-muted/50", modeFilter !== "All" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground")}>
                  <Filter className="size-4" />
                  {modeFilter !== "All" ? modeFilter : "Filter by Mode"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mode</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked={modeFilter === "All"} onCheckedChange={() => setModeFilter("All")}>All Modes</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={modeFilter === "Traditional"} onCheckedChange={() => setModeFilter("Traditional")}>Traditional</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={modeFilter === "Next-Gen"} onCheckedChange={() => setModeFilter("Next-Gen")}>Next-Gen</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:bg-muted/50", dateFilter !== "All Time" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground")}>
                  <Calendar className="size-4" />
                  {dateFilter !== "All Time" ? dateFilter : "Date Range"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Date Range</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked={dateFilter === "All Time"} onCheckedChange={() => setDateFilter("All Time")}>All Time</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={dateFilter === "Last 7 Days"} onCheckedChange={() => setDateFilter("Last 7 Days")}>Last 7 Days</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={dateFilter === "Last 30 Days"} onCheckedChange={() => setDateFilter("Last 30 Days")}>Last 30 Days</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* History List */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-border bg-transparent">
              <tr>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Date & Info</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Type</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Category</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Score</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredHistory.map((test) => (
                <tr key={test.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{test.date}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{test.duration}</span>
                      <span>•</span>
                      <span>{test.totalQuestions} Qs</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {test.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-normal">
                    <div className="font-medium text-foreground line-clamp-2 max-w-[250px]">{test.category}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-foreground">{test.score}%</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => navigate('/student/test-session', { state: { mode: 'review', sessionId: test.id } })}
                      className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                      title="Review Questions"
                    >
                      <Eye className="size-5" />
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    No test history found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
      </div>
    </StudentLayout>
  );
}
