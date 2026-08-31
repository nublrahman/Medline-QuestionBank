import { AdminLayout } from "@/components/layout/AdminLayout";
import { TreeStructure as FolderTree, Tag, Plus, PencilSimple as PenSquare, Trash as Trash2, CaretRight as ChevronRight, DotsSixVertical, Check } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default CategoriesPage;

function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [subQuestions, setSubQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<any>(null);
  const navigate = useNavigate();

  const toggleSub = async (subName: string, catName: string) => {
    if (expandedSub === subName) {
      setExpandedSub(null);
      return;
    }
    setExpandedSub(subName);
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase.from('questions').select('*').eq('category', catName).eq('subcategory', subName).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setSubQuestions(data || []);
    } catch (err) {
      console.warn("Failed to load questions:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // State for new items
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubName, setNewSubName] = useState("");

  // Edit State
  const [editItem, setEditItem] = useState<{ id?: string, name: string, type: 'category' | 'subcategory' } | null>(null);
  const [editName, setEditName] = useState("");

  // Delete State
  const [deleteItem, setDeleteItem] = useState<{ id?: string, name: string, type: 'category' | 'subcategory' } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: catData, error: catError } = await supabase.from('categories').select('*').order('name');
        if (catError) throw catError;
        
        const { data: qData, error: qError } = await supabase.from('questions').select('category, subcategory');
        if (qError) throw qError;

        if (catData && catData.length > 0) {
          const enrichedCategories = catData.map(cat => {
            const catQuestions = qData ? qData.filter(q => q.category === cat.name) : [];
            const subCounts: Record<string, number> = {};
            (cat.subcategories || []).forEach((s: string) => {
              subCounts[s] = catQuestions.filter(q => q.subcategory === s).length;
            });
            return { ...cat, questions_count: catQuestions.length, subcategories_counts: subCounts };
          });
          setCategories(enrichedCategories);
          setActiveId(enrichedCategories[0].id);
        }
      } catch (err) {
        console.warn("Failed to load from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const active = categories.find((c) => c.id === activeId);

  const handleAddSubcategory = async () => {
    if (!newSubName.trim() || !active) return;
    
    const newSub = newSubName.trim();
    const updatedSubcategories = [...(active.subcategories || []), newSub];
    
    // Update UI immediately
    setCategories(prev => prev.map(c => 
      c.id === active.id ? { ...c, subcategories: updatedSubcategories } : c
    ));
    setNewSubName("");
    
    // Try to update DB in background
    try {
      await supabase.from('categories').update({ subcategories: updatedSubcategories }).eq('id', active.id);
    } catch (e) {
      console.warn("Failed to save subcategory to Supabase", e);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat = {
      id: crypto.randomUUID(),
      name: newCategoryName.trim(),
      tone: ["tile-blue", "tile-green", "tile-violet", "tile-amber", "tile-pink", "tile-teal"][Math.floor(Math.random() * 6)],
      subcategories: [],
      questions_count: 0
    };
    
    // Update UI immediately
    setCategories(prev => [...prev, newCat]);
    setActiveId(newCat.id);
    setNewCategoryName("");
    setIsDialogOpen(false);
    
    // Try to update DB in background
    try {
      await supabase.from('categories').insert([newCat]);
    } catch (e) {
      console.warn("Failed to save to Supabase", e);
    }
  };

  const openEdit = (type: 'category' | 'subcategory', idOrName: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditItem(type === 'category' ? { id: idOrName, name: currentName, type } : { name: currentName, type });
    setEditName(currentName);
  };

  const confirmEdit = async () => {
    if (!editItem || !editName.trim()) return;
    const trimmed = editName.trim();
    if (trimmed === editItem.name) {
      setEditItem(null);
      return;
    }

    if (editItem.type === 'category') {
      setCategories(prev => prev.map(c => c.id === editItem.id ? { ...c, name: trimmed } : c));
      try { 
        await supabase.from('categories').update({ name: trimmed }).eq('id', editItem.id); 
        await supabase.from('questions').update({ category: trimmed }).eq('category', editItem.name);
      } catch (err) { console.warn(err); }
    } else if (active) {
      const updatedSubcategories = active.subcategories.map((s: string) => s === editItem.name ? trimmed : s);
      setCategories(prev => prev.map(c => c.id === active.id ? { ...c, subcategories: updatedSubcategories } : c));
      try { 
        await supabase.from('categories').update({ subcategories: updatedSubcategories }).eq('id', active.id); 
        await supabase.from('questions').update({ subcategory: trimmed }).eq('category', active.name).eq('subcategory', editItem.name);
      } catch (err) { console.warn(err); }
    }
    setEditItem(null);
  };

  const openDelete = (type: 'category' | 'subcategory', id: string | null, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteItem({ id: id || undefined, name, type });
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    if (deleteItem.type === 'category') {
      setCategories(prev => prev.filter(c => c.id !== deleteItem.id));
      if (activeId === deleteItem.id) setActiveId(null);
      try { 
        await supabase.from('categories').delete().eq('id', deleteItem.id); 
        await supabase.from('questions').delete().eq('category', deleteItem.name);
      } catch (err) { console.warn(err); }
    } else if (active) {
      const updatedSubcategories = active.subcategories.filter((s: string) => s !== deleteItem.name);
      setCategories(prev => prev.map(c => c.id === active.id ? { ...c, subcategories: updatedSubcategories } : c));
      try { 
        await supabase.from('categories').update({ subcategories: updatedSubcategories }).eq('id', active.id); 
        await supabase.from('questions').delete().eq('category', active.name).eq('subcategory', deleteItem.name);
      } catch (err) { console.warn(err); }
    }
    setDeleteItem(null);
  };

  if (loading && !categories.length) return <AdminLayout title="Loading..."><div className="p-8">Loading categories...</div></AdminLayout>;

  return (
    <AdminLayout
      title="Categories"
      subtitle="Organize the question bank into clinical specialties and subspecialties — manage both in one view."
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* Left — categories grid */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Main Categories</h3>
              <p className="text-sm text-muted-foreground">{categories.length} categories · {categories.length} active</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <motion.button whileTap={{ scale: 0.95 }} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  <Plus className="size-4" weight="regular" /> New category
                </motion.button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="E.g., Pediatrics, Pharmacology..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                </div>
                <DialogFooter>
                  <button onClick={handleAddCategory} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                    Add Category
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {categories.map((c) => (
                <motion.button
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileTap={{ scale: 0.98 }}
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "group rounded-2xl border p-4 text-left transition-colors",
                    c.id === activeId ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  <div className="mb-6 flex items-start justify-between">
                  <div className="grid size-10 place-items-center rounded-xl" style={{ backgroundColor: `var(--${c.tone})` }}>
                    <FolderTree className="size-5 text-foreground/70" />
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <span onClick={(e) => openEdit('category', c.id, c.name, e)} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><PenSquare className="size-3.5" /></span>
                    <span onClick={(e) => openDelete('category', c.id, c.name, e)} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="size-3.5" /></span>
                  </div>
                </div>
                <div className="font-semibold">{c.name}</div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{c.subcategories?.length || 0} subcategories</span>
                  <span>·</span>
                  <span>{c.questions_count || 0} questions</span>
                </div>
              </motion.button>
            ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right — subcategories panel */}
        {active && (
          <div className="rounded-2xl border border-border bg-card p-6 h-fit">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl" style={{ backgroundColor: `var(--${active.tone})` }}>
                <Tag className="size-5 text-foreground/70" />
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Subcategories of</div>
                <h3 className="text-lg font-semibold">{active.name}</h3>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border p-4">
              <div className="mb-3 flex gap-2">
                <input 
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubcategory()}
                  placeholder="New subcategory name..." 
                  className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" 
                />
                <motion.button onClick={handleAddSubcategory} whileTap={{ scale: 0.95 }} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
                  <Plus className="size-4" weight="regular" /> Add
                </motion.button>
              </div>
              <div className="text-xs text-muted-foreground">Subcategories tag and filter questions inside <b>{active.name}</b>.</div>
            </div>

            <div className="mt-4 space-y-2">
              <AnimatePresence mode="popLayout">
                {active.subcategories?.map((s: string, i: number) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    key={s} 
                    className="group flex flex-col rounded-xl border border-border bg-background overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="grid size-8 place-items-center rounded-lg bg-muted text-xs font-semibold">{String(i + 1).padStart(2, "0")}</div>
                      <div className="flex-1">
                        <div className="font-medium">{s}</div>
                        <div className="text-xs text-muted-foreground">{active.subcategories_counts?.[s] || 0} questions</div>
                      </div>
                      <motion.button onClick={(e) => openEdit('subcategory', s, s, e)} whileTap={{ scale: 0.90 }} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><PenSquare className="size-4" /></motion.button>
                      <motion.button onClick={(e) => openDelete('subcategory', null, s, e)} whileTap={{ scale: 0.90 }} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="size-4" /></motion.button>
                      <motion.button 
                        onClick={() => toggleSub(s, active.name)} 
                        whileTap={{ scale: 0.90 }} 
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <ChevronRight className={cn("size-4 transition-transform duration-200", expandedSub === s && "rotate-90")} />
                      </motion.button>
                    </div>

                    <AnimatePresence>
                      {expandedSub === s && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-dashed border-border bg-muted/20"
                        >
                          <div className="p-3 text-sm">
                            {loadingQuestions ? (
                              <div className="text-muted-foreground text-xs p-2 text-center">Loading questions...</div>
                            ) : subQuestions.length > 0 ? (
                              <div className="space-y-2">
                                {subQuestions.map(q => {
                                  const temp = document.createElement('div');
                                  temp.innerHTML = q.stem;
                                  const stemText = temp.textContent || temp.innerText || "";
                                  return (
                                    <div key={q.id} onClick={() => setPreviewQuestion(q)} className="cursor-pointer rounded-lg border border-border bg-background p-3 hover:border-primary/40 transition-colors">
                                      <div className="mb-1 flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{q.type.replace(/-/g, ' ')}</span>
                                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", q.is_published ? "bg-success/15 text-success-foreground" : "bg-warning/15 text-warning-foreground")}>{q.is_published ? "published" : "draft"}</span>
                                      </div>
                                      <div className="line-clamp-2 text-xs text-foreground font-medium">{stemText || "(No question text)"}</div>
                                    </div>
                                  );
                                })}
                                {subQuestions.length === 50 && <div className="text-center text-xs text-muted-foreground pt-2">Showing latest 50 questions</div>}
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-xs p-2 text-center">No questions in this subcategory yet.</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editItem?.type === 'category' ? 'Category' : 'Subcategory'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
            />
          </div>
          <DialogFooter>
            <button onClick={() => setEditItem(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button onClick={confirmEdit} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Save Changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteItem?.type === 'category' ? 'category' : 'subcategory'} 
              <strong className="text-foreground ml-1">"{deleteItem?.name}"</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: previewQuestion.stem }} />
              <div className="space-y-2 mb-6">
                {previewQuestion.options?.map((o: any) => (
                  <div key={o.letter} className={cn("flex items-center gap-3 rounded-xl border p-3 text-sm", o.correct ? "border-success/40 bg-success/5" : "border-border")}>
                    <div className="grid size-7 place-items-center rounded-lg bg-secondary text-xs font-semibold">{o.letter}</div>
                    <span>{o.text}</span>
                    {o.correct && <Check className="ml-auto size-4 text-success-foreground" />}
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-muted p-4 text-sm overflow-hidden">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</div>
                <div className="prose prose-sm dark:prose-invert max-w-none mt-2 break-all" dangerouslySetInnerHTML={{ __html: previewQuestion.rationale }} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
