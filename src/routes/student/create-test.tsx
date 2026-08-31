import { StudentLayout } from "@/components/layout/StudentLayout";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flask as FlaskConical, List as LayoutList, BookOpen, Stack as Layers, ArrowsClockwise as RefreshCw, Star, PlayCircle, SlidersHorizontal as Settings2, Hash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function StudentCreateTest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [type, setType] = useState<"traditional" | "next-gen" | "mixed">("traditional");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [refinements, setRefinements] = useState<string[]>(["all"]);
  const [status, setStatus] = useState<"new" | "review" | "all">("new");
  const [count, setCount] = useState<number>(10);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableQuestionsCount, setAvailableQuestionsCount] = useState(0);

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from('categories').select('*').order('name');
      if (data && data.length > 0) {
        setCategories(data);
        setSubjects([data[0].id]);
      }
      setLoading(false);
    }
    loadCategories();
  }, []);

  const activeCategories = categories.filter(c => subjects.includes(c.id));
  const activeCategoryNames = activeCategories.map(c => c.name);
  const allSubcategories = activeCategories.flatMap(c => c.subcategories || []);

  useEffect(() => {
    if (activeCategories.length === 0) {
      setAvailableQuestionsCount(0);
      return;
    }
    async function fetchQuestionCount() {
      const { data: sessions } = await supabase.from('test_sessions').select('id').eq('student_id', user?.id);
      const sessionIds = sessions?.map((s: any) => s.id) || [];
      
      let seenIds: string[] = [];
      let incorrectIds: string[] = [];
      if (sessionIds.length > 0) {
        const { data: answers } = await supabase.from('test_answers').select('question_id, is_correct').in('session_id', sessionIds);
        if (answers) {
          seenIds = Array.from(new Set(answers.map((a: any) => a.question_id)));
          incorrectIds = Array.from(new Set(answers.filter((a: any) => !a.is_correct).map((a: any) => a.question_id)));
        }
      }

      let query = supabase.from('questions').select('id, type')
        .in('category', activeCategoryNames)
        .eq('is_published', true);
      
      if (!refinements.includes("all") && refinements.length > 0) {
        query = query.in('subcategory', refinements);
      }
      
      const { data } = await query;
      let filtered = data || [];
      
      if (type === "traditional") filtered = filtered.filter(q => q.type.startsWith('mcq'));
      if (type === "next-gen") filtered = filtered.filter(q => !q.type.startsWith('mcq'));
      if (status === "new") filtered = filtered.filter(q => !seenIds.includes(q.id));
      if (status === "review") filtered = filtered.filter(q => incorrectIds.includes(q.id));

      setAvailableQuestionsCount(filtered.length);
    }
    fetchQuestionCount();
  }, [subjects, refinements, status, type, user]);

  const handleStartTest = () => {
    navigate("/student/test-session", { state: { type, subjects, categoryNames: activeCategoryNames, refinements, status, count } });
  };

  return (
    <StudentLayout
      title="Create Custom Test"
      subtitle="Configure a dynamic exam tailored exactly to what you need to study."
    >
      {loading ? (
        <div className="p-8">Loading categories...</div>
      ) : activeCategories.length === 0 && categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <LayoutList className="size-6" />
          </div>
          <h3 className="text-lg font-semibold">No Categories Available</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            There are currently no question categories set up. An administrator needs to create categories and add questions before you can start a test.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_350px]">
        {/* Left Side: Configuration Options */}
        <div className="space-y-8">
          
          {/* Step 1: Type */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">1</div>
              <h2 className="text-lg font-semibold">Question Type</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <OptionCard 
                selected={type === "traditional"} 
                onClick={() => setType("traditional")}
                icon={LayoutList}
                title="Traditional"
                description="Standard Multiple Choice and Multiple Response"
              />
              <OptionCard 
                selected={type === "next-gen"} 
                onClick={() => setType("next-gen")}
                icon={FlaskConical}
                title="Next Generation"
                description="Interactive case studies, bow-tie, and matrices"
              />
              <OptionCard 
                selected={type === "mixed"} 
                onClick={() => setType("mixed")}
                icon={Layers}
                title="Mixed Mode"
                description="A random distribution of all question types"
                disabled
                comingSoon
              />
            </div>
          </div>

          {/* Step 2: Subject */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">2</div>
              <h2 className="text-lg font-semibold">Main Category</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {categories.map((c) => {
                const isSelected = subjects.includes(c.id);
                return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSubjects(prev => {
                      if (prev.includes(c.id)) {
                        const next = prev.filter(id => id !== c.id);
                        if (next.length === 0 && refinements.length > 0) {
                           setRefinements(["all"]);
                        }
                        return next;
                      }
                      return [...prev, c.id];
                    });
                  }}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" 
                      : "border-border bg-background hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <div className="flex-1 font-medium">{c.name}</div>
                  {isSelected && (
                    <motion.div layoutId={`check-subject-${c.id}`} className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" weight="bold" />
                    </motion.div>
                  )}
                </button>
              )})}
            </div>
          </div>

          {/* Step 3: Refinement */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">3</div>
              <h2 className="text-lg font-semibold">Specific Subcategory</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRefinements(["all"])}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                  refinements.includes("all")
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40"
                )}
              >
                All Subcategories
              </button>
              {allSubcategories.map((s: string) => {
                const isSelected = refinements.includes(s);
                return (
                <button
                  key={s}
                  onClick={() => {
                    setRefinements(prev => {
                      let next = prev.filter(r => r !== "all");
                      if (next.includes(s)) {
                        next = next.filter(r => r !== s);
                      } else {
                        next = [...next, s];
                      }
                      if (next.length === 0) return ["all"];
                      return next;
                    });
                  }}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-background hover:border-primary/40"
                  )}
                >
                  {s}
                </button>
              )})}
            </div>
          </div>

          {/* Step 4: Status */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">4</div>
              <h2 className="text-lg font-semibold">Question Pool Status</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <OptionCard 
                selected={status === "new"} 
                onClick={() => setStatus("new")}
                icon={Star}
                title="Unused Only"
                description="Questions you have never seen before"
              />
              <OptionCard 
                selected={status === "review"} 
                onClick={() => setStatus("review")}
                icon={RefreshCw}
                title="Review Mode"
                description="Previously attempted or incorrect questions"
              />
              <OptionCard 
                selected={status === "all"} 
                onClick={() => setStatus("all")}
                icon={BookOpen}
                title="Entire Pool"
                description="Pull from both new and previously seen questions"
              />
            </div>
          </div>

          {/* Step 5: Number of Questions */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">5</div>
              <h2 className="text-lg font-semibold">Number of Questions</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {[10, 20, 40, "All"].map((num) => (
                <button
                  key={num}
                  onClick={() => setCount(num === "All" ? 999 : (num as number))}
                  className={cn(
                    "rounded-full border px-6 py-2 text-sm font-medium transition-all",
                    count === (num === "All" ? 999 : num)
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-background hover:border-primary/40"
                  )}
                >
                  {num}
                </button>
              ))}
              
              <div className="relative flex items-center">
                <Hash className="absolute left-3 size-4 text-muted-foreground" />
                <input
                  type="number"
                  min="1"
                  max="999"
                  placeholder="Custom"
                  value={count === 999 || [10, 20, 40].includes(count) ? "" : count}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val > 0) setCount(val);
                    else if (e.target.value === "") setCount(10); // fallback if cleared
                  }}
                  className={cn(
                    "h-9 w-28 rounded-full border bg-background pl-9 pr-4 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary",
                    (![10, 20, 40, 999].includes(count)) ? "border-primary ring-1 ring-primary" : "border-border"
                  )}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Generation Summary Box */}
        <div>
          <div className="sticky top-28 rounded-2xl border border-border bg-card shadow-lg">
            <div className="border-b border-border bg-muted/50 p-6">
              <div className="flex items-center gap-3">
                <Settings2 className="size-5 text-muted-foreground" />
                <h3 className="font-semibold">Test Configuration</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm font-medium capitalize">{type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subject</span>
                <span className="text-sm font-medium">{activeCategoryNames.length > 1 ? "Multiple Selected" : activeCategoryNames[0] || "None"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Topic</span>
                <span className="text-sm font-medium capitalize truncate pl-4">{refinements.length > 1 ? "Multiple Selected" : refinements[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pool</span>
                <span className="text-sm font-medium capitalize">{status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Count</span>
                <span className="text-sm font-medium">{count === 999 ? "All" : count} Questions</span>
              </div>
              
              <div className="my-6 h-px w-full bg-border" />
              
              <div className="rounded-xl bg-primary/10 p-4 text-center">
                <div className="text-sm font-semibold text-primary">Available Questions</div>
                <div className="text-3xl font-bold text-primary">
                  {availableQuestionsCount}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: availableQuestionsCount === 0 ? 1 : 0.95 }}
                onClick={handleStartTest}
                disabled={availableQuestionsCount === 0}
                className={cn(
                  "mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold shadow-lg transition-all",
                  availableQuestionsCount === 0
                    ? "cursor-not-allowed bg-muted text-muted-foreground shadow-none"
                    : "bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90"
                )}
              >
                <PlayCircle className="size-5" />
                Start Test Session
              </motion.button>
            </div>
          </div>
        </div>
      </div>
      )}
    </StudentLayout>
  );
}

function OptionCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  disabled,
  comingSoon
}: {
  selected: boolean;
  onClick: () => void;
  icon: any;
  title: string;
  description: string;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start rounded-xl border p-4 text-left transition-all",
        disabled ? "cursor-not-allowed opacity-60 border-border bg-muted/30 hover:border-border hover:bg-muted/30" :
        selected 
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" 
          : "border-border bg-background hover:border-primary/40 hover:bg-muted/50"
      )}
    >
      <div className="mb-3 flex w-full items-start justify-between">
        <Icon className={cn("size-5", selected && !disabled ? "text-primary" : "text-muted-foreground")} />
        {selected && !disabled && (
          <motion.div layoutId={`check-${title}`} className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" />
          </motion.div>
        )}
        {comingSoon && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            Coming Soon
          </span>
        )}
      </div>
      <div className={cn("mb-1 font-semibold", selected && !disabled ? "text-primary" : "text-foreground")}>{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </button>
  );
}
