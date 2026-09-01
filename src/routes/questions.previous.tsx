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
                  {types.map(t => <option key={t as string} value={t as string}>{t === "All" ? "All Types" : t}</option>)}
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
                    <div className="font-medium line-clamp-1">{r.stem?.replace(/<[^>]*>?/gm, '').substring(0, 50)}...</div>
                    <div className="text-xs text-muted-foreground">Updated {new Date(r.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{r.type}</span>
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
              {previewQuestion?.category} • {previewQuestion?.subcategory} ({previewQuestion?.type})
            </DialogDescription>
          </DialogHeader>
          {previewQuestion && (
            <div className="mt-4">
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: previewQuestion.stem || "" }} />
              <div className="space-y-2 mb-6">
                {previewQuestion.type?.startsWith("mcq") ? previewQuestion.options?.map((o: any) => (
                  <div key={o.letter} className={cn("flex items-center gap-3 rounded-xl border p-3 text-sm", o.correct ? "border-success/40 bg-success/5" : "border-border")}>
                    <div className="grid size-7 place-items-center rounded-lg bg-secondary text-xs font-semibold shrink-0">{o.letter}</div>
                    <span className="flex-1 break-words min-w-0">{o.text}</span>
                    {o.correct && <Check className="ml-auto size-4 text-success-foreground" />}
                  </div>
                )) : previewQuestion.type === "bowtie" ? (
                  <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
                    <div className="font-semibold text-primary mb-2">Advanced Bow-Tie Configured</div>
                    <p className="text-muted-foreground">Causes/Assessments: {previewQuestion.options?.actions?.length || 0} | Core Condition: {previewQuestion.options?.conditions?.length || 0} | Treatments/Effects: {previewQuestion.options?.parameters?.length || 0}</p>
                  </div>
                ) : previewQuestion.type === "next-gen-cloze" && (
                  <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
                    <div className="font-semibold text-primary mb-2">Fill in the Blank Dropdown Configured</div>
                    <p className="text-muted-foreground">Configured Blanks: {previewQuestion.options?.blanks ? Object.keys(previewQuestion.options.blanks).length : 0}</p>
                  </div>
                )}
              </div>
              <div className="mt-5 rounded-xl bg-muted p-4 text-sm overflow-hidden">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</div>
                <div className="prose prose-sm dark:prose-invert max-w-none mt-2 break-all" dangerouslySetInnerHTML={{ __html: previewQuestion.rationale || "" }} />
              </div>
            </div>
          )}
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
