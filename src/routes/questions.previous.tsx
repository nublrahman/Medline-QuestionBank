import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Eye, PencilSimple as PenSquare, Copy, Trash as Trash2, Plus, Faders as Filter, MagnifyingGlass as Search, Check } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default PreviousQuestions;

const tabs = ["All", "Published", "Drafts"] as const;

const formatQuestionType = (type: string) => {
  if (!type) return "";
  if (type === 'bowtie') return 'Next-Gen / Bow-Tie';
  if (type === 'next-gen-cloze') return 'Next-Gen / Fill in the Blank';
  if (type === 'table') return 'Next-Gen / Table';
  if (type === 'next-gen-matrix') return 'Next-Gen / Matrix';
  if (type === 'next-gen-order') return 'Next-Gen / Order';
  if (type === 'next-gen-highlight') return 'Next-Gen / Highlight';
  if (type === 'next-gen-sata') return 'Next-Gen / Multi-MCQ';
  if (type === 'mcq-single' || type === 'traditional') return 'Traditional / MCQ';
  if (type === 'mcq-multi') return 'Traditional / Multi-MCQ';
  return type;
};

const renderOptionsPreview = (q: any) => {
  const getOpts = (type: string) => {
    if (type === "bowtie") return q.bowtieConfig || q.options;
    if (type === "next-gen-cloze") return q.clozeBlanks ? { blanks: q.clozeBlanks } : q.options;
    if (type === "table") return q.tableConfig || q.options;
    if (type === "next-gen-highlight") return q.highlightConfig || q.options;
    
    // For MCQ questions, options might be an array, or an object { mcq_options: [...] }
    if (q.options && !Array.isArray(q.options) && q.options.mcq_options) {
      return q.options.mcq_options;
    }
    
    return q.options;
  };

  const opts = getOpts(q.type);

  if (q.type?.startsWith("mcq") || q.type === "traditional") {
    return opts?.map((o: any, idx: number) => (
      <div key={o.letter || o.id || idx} className={cn("flex items-center gap-3 rounded-xl border p-3 text-sm", (o.correct || o.isCorrect) ? "border-success/40 bg-success/5" : "border-border")}>
        <div className="grid size-7 place-items-center rounded-lg bg-secondary text-xs font-semibold shrink-0">{o.letter || o.id || String.fromCharCode(65 + idx)}</div>
        <span className="flex-1 break-words min-w-0">{o.text}</span>
        {(o.correct || o.isCorrect) && <Check className="ml-auto size-4 text-success-foreground" />}
      </div>
    ));
  }
  if (q.type === "bowtie") {
    return (
      <div className="rounded-xl border border-border p-5 text-sm bg-muted/10">
        <div className="font-semibold text-teal-800 mb-6 text-sm">Bow-Tie Correct Answers</div>
        <div className="flex flex-col md:flex-row items-stretch justify-center gap-4">
           <div className="flex-1 flex flex-col justify-start items-center bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 w-full text-center min-h-[120px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">{opts?.actionLabel || "Causes & Assessments"}</div>
              <div className="space-y-1.5 text-[13px] text-slate-700 font-medium w-full">
                 {opts?.actions?.map((a: any, i: number) => (
                   <div key={i} className={cn("py-1.5 px-2.5 rounded-md border text-center flex items-center justify-center gap-2", a.isCorrect ? "bg-teal-50 border-teal-200 text-teal-800 font-semibold" : "bg-slate-50 border-slate-100 text-slate-500")}>
                     {a.isCorrect && <Check className="w-3.5 h-3.5 shrink-0 text-teal-600" />}
                     <span>{a.text || "—"}</span>
                   </div>
                 ))}
              </div>
           </div>
           <div className="flex-1 flex flex-col justify-start items-center bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 w-full text-center min-h-[120px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">{opts?.conditionLabel || "Core Conditions"}</div>
              <div className="space-y-1.5 text-[13px] text-slate-700 font-medium w-full">
                 {opts?.conditions?.map((a: any, i: number) => (
                   <div key={i} className={cn("py-1.5 px-2.5 rounded-md border text-center flex items-center justify-center gap-2", a.isCorrect ? "bg-teal-50 border-teal-200 text-teal-800 font-semibold" : "bg-slate-50 border-slate-100 text-slate-500")}>
                     {a.isCorrect && <Check className="w-3.5 h-3.5 shrink-0 text-teal-600" />}
                     <span>{a.text || "—"}</span>
                   </div>
                 ))}
              </div>
           </div>
           <div className="flex-1 flex flex-col justify-start items-center bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 w-full text-center min-h-[120px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">{opts?.parameterLabel || "Treatments & Effects"}</div>
              <div className="space-y-1.5 text-[13px] text-slate-700 font-medium w-full">
                 {opts?.parameters?.map((a: any, i: number) => (
                   <div key={i} className={cn("py-1.5 px-2.5 rounded-md border text-center flex items-center justify-center gap-2", a.isCorrect ? "bg-teal-50 border-teal-200 text-teal-800 font-semibold" : "bg-slate-50 border-slate-100 text-slate-500")}>
                     {a.isCorrect && <Check className="w-3.5 h-3.5 shrink-0 text-teal-600" />}
                     <span>{a.text || "—"}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    );
  }
  if (q.type === "next-gen-cloze") {
    return (
      <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
        <div className="font-semibold text-primary mb-3">Fill in the Blank</div>
        <div className="space-y-2">
          {Object.entries(opts?.blanks || {}).map(([key, blank]: [string, any]) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-background border">
              <div className="font-semibold text-teal-700 shrink-0 bg-teal-50 px-2.5 py-1 rounded-md text-xs uppercase tracking-wider">Blank {key}</div>
              <div className="flex-1 text-slate-600 text-[13px]">
                 Correct Answer: <span className="font-semibold text-slate-900 ml-1">{blank.correct}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (q.type === "next-gen-highlight") {
    if (opts?.layout === "table") {
      return (
        <div className="space-y-6">
          {opts.tables?.map((t: any, i: number) => (
             <div key={i} className="border border-border rounded-xl overflow-hidden">
               <div className="bg-muted px-4 py-2 font-semibold text-sm border-b">{t.tabName}</div>
               <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t.headers?.col1}</th>
                      <th className="px-4 py-3 font-medium">{t.headers?.col2}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                     {t.rows?.map((r: any, ri: number) => (
                        <tr key={ri} className="bg-card">
                          <td className="px-4 py-3 font-medium align-top max-w-[200px] break-words">{r.rowLabel}</td>
                          <td className="px-4 py-3 align-top">
                             {r.sentences?.map((s: any) => (
                               <span key={s.id} className={cn("inline rounded px-1", opts.correctHighlights?.includes(s.id) ? "bg-teal-100 text-teal-800 font-bold" : "")}>
                                 {s.text}{" "}
                               </span>
                             ))}
                          </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
             </div>
          ))}
        </div>
      );
    } else {
      return (
        <div className="text-sm leading-relaxed bg-muted/10 p-5 rounded-xl border border-border prose prose-sm max-w-none">
          {opts?.sentences?.map((s: any) => (
            <span key={s.id} className={cn("inline rounded px-1", opts.correctHighlights?.includes(s.id) ? "bg-teal-100 text-teal-800 font-bold" : "")}>
              {s.text}{" "}
            </span>
          ))}
        </div>
      );
    }
  }

  if (q.type === "table") {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-4 py-3 font-medium w-1/3 border-r"></th>
              {opts?.columns?.map((c: any) => (
                <th key={c.id} className="px-4 py-3 font-medium text-center">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
             {opts?.rows?.map((r: any) => (
                <tr key={r.id} className="bg-card">
                  <td className="px-4 py-3 font-medium border-r">{r.text}</td>
                  {opts?.columns?.map((c: any) => {
                     const isCorrect = opts.multiSelect 
                        ? (opts.correctAnswers?.[r.id] || []).includes(c.id) 
                        : opts.correctAnswers?.[r.id] === c.id;
                     return (
                        <td key={c.id} className="px-4 py-3 text-center border-l first:border-l-0">
                           {isCorrect && <Check className="w-4 h-4 mx-auto text-teal-600 font-bold" />}
                        </td>
                     );
                  })}
                </tr>
             ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
};

function QuestionPreviewContent({ previewQuestion }: { previewQuestion: any }) {
  const [activeTab, setActiveTab] = useState(0);
  const scenarioTabs = previewQuestion.options?.scenario_tabs || previewQuestion.scenario_tabs;

  return (
    <div className="mt-4 flex flex-col md:flex-row gap-6 items-start">
      {scenarioTabs && scenarioTabs.length > 0 && (
        <div className="w-full md:w-1/2 flex flex-col border border-border rounded-2xl overflow-hidden bg-card sticky top-0">
          <div className="flex overflow-x-auto border-b border-border bg-muted/30">
             {scenarioTabs.map((t: any, i: number) => (
               <button
                 key={i}
                 onClick={() => setActiveTab(i)}
                 className={cn("px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors", activeTab === i ? "border-b-2 border-primary text-primary bg-background" : "text-muted-foreground hover:bg-muted/50")}
               >
                 {t.tabName}
               </button>
             ))}
          </div>
          <div className="p-5 overflow-y-auto max-h-[500px]">
             {scenarioTabs[activeTab] && (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-sm leading-[2rem]" 
                  dangerouslySetInnerHTML={{ __html: scenarioTabs[activeTab].content || "" }} 
                />
             )}
          </div>
        </div>
      )}

      <div className={cn("flex flex-col space-y-6", scenarioTabs && scenarioTabs.length > 0 ? "w-full md:w-1/2" : "w-full")}>
        {previewQuestion.group_type === "grouped" ? (
          <div className="space-y-8">
            {previewQuestion.options?.subQuestions?.map((sq: any, i: number) => (
              <div key={i} className="border border-border rounded-2xl p-5 bg-card">
                <div className="font-bold text-teal-700 mb-4 pb-2 border-b">Sub-question {i + 1} ({formatQuestionType(sq.type)})</div>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-sm leading-[2rem] mb-6" 
                  dangerouslySetInnerHTML={{ 
                    __html: sq.type === "next-gen-cloze" 
                      ? (sq.stem || "").replace(/{([0-9]+)}/g, '<span class="inline-flex items-center justify-center bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded text-[11px] font-bold mx-1 align-middle whitespace-nowrap">Blank $1</span>')
                      : (sq.stem || "") 
                  }} 
                />
                <div className="space-y-2 mb-6">
                  {renderOptionsPreview(sq)}
                </div>
                <div className="mt-5 rounded-xl bg-muted p-4 text-sm overflow-hidden">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</div>
                  <div className="prose prose-sm dark:prose-invert max-w-none mt-2 break-all" dangerouslySetInnerHTML={{ __html: sq.rationale || "" }} />
                </div>
              </div>
            ))}
            {previewQuestion.rationale && (
              <div className="mt-5 rounded-xl bg-muted p-4 text-sm overflow-hidden">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall Rationale</div>
                <div className="prose prose-sm dark:prose-invert max-w-none mt-2 break-all" dangerouslySetInnerHTML={{ __html: previewQuestion.rationale || "" }} />
              </div>
            )}
          </div>
        ) : (
          <>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none text-sm leading-[2rem] mb-6" 
              dangerouslySetInnerHTML={{ 
                __html: previewQuestion.type === "next-gen-cloze" 
                  ? (previewQuestion.stem || "").replace(/{([0-9]+)}/g, '<span class="inline-flex items-center justify-center bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded text-[11px] font-bold mx-1 align-middle whitespace-nowrap">Blank $1</span>')
                  : (previewQuestion.stem || "") 
              }} 
            />
            <div className="space-y-2 mb-6">
              {renderOptionsPreview(previewQuestion)}
            </div>
            <div className="mt-5 rounded-xl bg-muted p-4 text-sm overflow-hidden">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</div>
              <div className="prose prose-sm dark:prose-invert max-w-none mt-2 break-all" dangerouslySetInnerHTML={{ __html: previewQuestion.rationale || "" }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PreviousQuestions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initCategory = searchParams.get("category") || "All";
  const initSubcategory = searchParams.get("subcategory") || "All";

  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState(initCategory);
  const [filterSubcategory, setFilterSubcategory] = useState(initSubcategory);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewQuestion, setPreviewQuestion] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [tempItemsPerPage, setTempItemsPerPage] = useState<number | string>(10);
  const navigate = useNavigate();

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      setQuestions(questions.filter(q => q.id !== id));
      toast.success("Question deleted successfully");
    } catch (err: any) {
      toast.error("Error deleting question: " + err.message);
    }
  };

  useEffect(() => {
    async function loadQuestions() {
      setLoading(true);
      const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error(error);
      } else {
        setQuestions(data || []);
      }
      setLoading(false);
    }
    loadQuestions();
  }, []);

  const types = ["All", ...Array.from(new Set(questions.map(q => q.type).filter(Boolean)))];
  const categories = ["All", ...Array.from(new Set(questions.map(q => q.category).filter(Boolean)))];

  const filtered = questions.filter((row) => {
    const status = row.is_published ? "Published" : "Draft";
    if (tab === "Published" && status !== "Published") return false;
    if (tab === "Drafts" && status !== "Draft") return false;
    
    if (filterType !== "All" && row.type !== filterType) return false;
    if (filterCategory !== "All" && row.category !== filterCategory) return false;
    if (filterSubcategory !== "All" && row.subcategory !== filterSubcategory) return false;

    if (q) {
      const stemText = row.stem?.replace(/<[^>]*>?/gm, '').toLowerCase() || "";
      if (!(stemText.includes(q.toLowerCase()) || row.id?.toLowerCase().includes(q.toLowerCase()))) return false;
    }
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, q, filterType, filterCategory, filterSubcategory, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <AdminLayout
      title="Question Bank"
      subtitle="Manage and organize all examination items."
      actions={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/admin/questions/create" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm">
            <Plus className="size-4" weight="regular" /> New Question
          </Link>
        </div>
      }
    >
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-muted p-1">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium",
                  tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative ml-auto flex-1 min-w-64 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search questions"
              className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                <Filter className="size-4" /> More Filters
                {(filterType !== "All" || filterCategory !== "All") && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {(filterType !== "All" ? 1 : 0) + (filterCategory !== "All" ? 1 : 0)}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Type</label>
                <select 
                  value={filterType} 
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {types.map(t => <option key={t as string} value={t as string}>{t === "All" ? "All Types" : formatQuestionType(t as string)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
                <select 
                  value={filterCategory} 
                  onChange={e => {
                    const val = e.target.value;
                    setFilterCategory(val);
                    setFilterSubcategory("All");
                    setSearchParams(prev => {
                      if (val === "All") prev.delete("category");
                      else prev.set("category", val);
                      prev.delete("subcategory");
                      return prev;
                    });
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {categories.map(c => <option key={c as string} value={c as string}>{c === "All" ? "All Categories" : c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Subcategory</label>
                <select 
                  value={filterSubcategory} 
                  disabled={filterCategory === "All"}
                  onChange={e => {
                    setFilterSubcategory(e.target.value);
                    setSearchParams(prev => {
                      if (e.target.value === "All") prev.delete("subcategory");
                      else prev.set("subcategory", e.target.value);
                      return prev;
                    });
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="All">{filterCategory === "All" ? "Select a category first" : "All Subcategories"}</option>
                  {filterCategory !== "All" && Array.from(new Set(questions.filter(q => q.category === filterCategory).map(q => q.subcategory).filter(Boolean))).map(s => <option key={s as string} value={s as string}>{s}</option>)}
                </select>
              </div>
              {(filterType !== "All" || filterCategory !== "All" || filterSubcategory !== "All") && (
                <button 
                  onClick={() => { 
                    setFilterType("All"); 
                    setFilterCategory("All"); 
                    setFilterSubcategory("All");
                    setSearchParams(new URLSearchParams());
                  }}
                  className="w-full rounded-lg bg-muted py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="p-3 pl-4">ID</th>
                <th className="p-3">Content Snippet</th>
                <th className="p-3 text-center">Type</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((r, i) => (
                <tr key={r.id} className="bg-card hover:bg-muted/40">
                  <td className="p-3 pl-4 font-mono text-xs text-muted-foreground">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                  <td className="p-3">
                    <div className="font-medium line-clamp-1">{r.stem?.replace(/<[^>]*>?/gm, '').replace(/\{\d+\}/g, '______').substring(0, 50)}...</div>
                    <div className="text-xs text-muted-foreground">Updated {new Date(r.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground whitespace-nowrap">
                      {r.group_type === 'grouped' ? 'Grouped Question' : formatQuestionType(r.type)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.category}</div>
                    <div className="text-xs text-muted-foreground">{r.subcategory}</div>
                  </td>
                  <td className="p-3 text-center">
                    <StatusPill s={r.is_published ? "Published" : "Draft"} />
                  </td>
                  <td className="p-3 pr-4">
                    <div className="flex justify-end gap-1.5">
                      <IconBtn onClick={() => setPreviewQuestion(r)}><Eye className="size-4" /></IconBtn>
                      <IconBtn onClick={() => navigate(`/admin/questions/create?edit=${r.id}`)}><PenSquare className="size-4" /></IconBtn>
                      <AlertDialog>
                        <AlertDialogTrigger className="grid size-8 place-items-center rounded-lg border border-border bg-background text-destructive hover:bg-destructive/10">
                          <Trash2 className="size-4" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this question.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={6} className="bg-card p-10 text-center text-sm text-muted-foreground">Loading questions...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="bg-card p-10 text-center text-sm text-muted-foreground">No questions match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <span className="font-medium text-muted-foreground/80">
              Showing <span className="text-foreground">{filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(filtered.length, currentPage * itemsPerPage)}</span> of <span className="text-foreground">{filtered.length}</span> questions
            </span>
            
            <div className="flex items-center gap-2 rounded-[22px] border border-border bg-card p-1 shadow-sm">
              <input 
                type="number"
                min={1}
                max={1000}
                value={tempItemsPerPage} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    setTempItemsPerPage(val);
                  } else if (e.target.value === "") {
                    setTempItemsPerPage(e.target.value);
                  }
                }}
                onBlur={() => {
                  if (typeof tempItemsPerPage !== 'number' || tempItemsPerPage < 1) {
                    setTempItemsPerPage(itemsPerPage);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = typeof tempItemsPerPage === 'number' ? tempItemsPerPage : parseInt(tempItemsPerPage as string);
                    if (!isNaN(val) && val > 0) setItemsPerPage(val);
                  }
                }}
                className="h-6 w-14 rounded-[14px] border-none bg-muted/50 px-2 text-center text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => {
                  const val = typeof tempItemsPerPage === 'number' ? tempItemsPerPage : parseInt(tempItemsPerPage as string);
                  if (!isNaN(val) && val > 0) {
                    setItemsPerPage(val);
                  } else {
                    setTempItemsPerPage(itemsPerPage);
                  }
                }}
                className="h-6 rounded-[14px] bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Apply
              </button>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border px-3 py-1.5 hover:bg-muted disabled:opacity-50"
              >
                Previous
              </button>
              
              {(() => {
                const pages = [];
                if (totalPages <= 5) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 3) pages.push('...');
                  if (currentPage > 2) pages.push(currentPage - 1);
                  if (currentPage !== 1 && currentPage !== totalPages) pages.push(currentPage);
                  if (currentPage < totalPages - 1) pages.push(currentPage + 1);
                  if (currentPage < totalPages - 2) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => p !== '...' && setCurrentPage(p as number)}
                    disabled={p === '...'}
                    className={cn(
                      "rounded-lg px-3 py-1.5 font-medium transition-colors", 
                      currentPage === p 
                        ? "bg-primary text-primary-foreground" 
                        : p === '...' 
                          ? "cursor-default text-muted-foreground opacity-50" 
                          : "hover:bg-muted text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ));
              })()}
              
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border px-3 py-1.5 hover:bg-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
            <DialogDescription>
              {previewQuestion?.category} • {previewQuestion?.subcategory} ({formatQuestionType(previewQuestion?.type || "")})
            </DialogDescription>
          </DialogHeader>
          {previewQuestion && <QuestionPreviewContent previewQuestion={previewQuestion} />}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    Published: "bg-success/15 text-success-foreground",
    Draft: "bg-muted text-muted-foreground",
    "Needs Review": "bg-warning/20 text-warning-foreground",
  };
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider", map[s])}>{s}</span>;
}
function IconBtn({ children, danger, onClick }: { children: React.ReactNode; danger?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={cn("grid size-8 place-items-center rounded-lg border border-border bg-background", danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{children}</button>;
}
