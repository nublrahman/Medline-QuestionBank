import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState, useEffect } from "react";
import {
  Check,
  CaretRight as ChevronRight,
  CaretLeft as ChevronLeft,
  FloppyDisk as Save,
  PaperPlaneRight as Send,
  TextB as Bold,
  TextItalic as Italic,
  ListBullets as List,
  Link as LinkIcon,
  Image as ImageIcon,
  Plus,
  X,
  Stack as Layers,
  SquaresFour as Layers2,
  Trash as Trash2,
  Sparkle as Sparkles,
} from "@phosphor-icons/react";
import { questionTypes } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";

export default CreateQuestion;

const steps = [
  { n: 1, label: "Setup", desc: "Type & classification" },
  { n: 2, label: "Content", desc: "Question, options & rationale" },
  { n: 3, label: "Review", desc: "Preview & publish" },
];

function Stepper({ active }: { active: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        {steps.map((s, i) => {
          const done = active > s.n;
          const current = active === s.n;
          return (
            <div key={s.n} className="flex flex-1 items-center">
              <div className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    "grid size-11 place-items-center rounded-full text-sm font-semibold transition",
                    done && "bg-primary text-primary-foreground",
                    current && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                    !done && !current && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-5" /> : s.n}
                </div>
                <div className="mt-2">
                  <div className={cn("text-sm font-semibold", current ? "text-foreground" : "text-muted-foreground")}>{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("mx-4 h-0.5 flex-1 rounded-full", active > s.n ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};
const hasImage = (html: string) => html.includes("<img");
const isEmpty = (html: string) => {
  if (!html) return true;
  if (hasImage(html)) return false;
  return stripHtml(html).trim() === "";
};

function CreateQuestion() {
  const [step, setStep] = useState(1);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [group, setGroup] = useState<"ungrouped" | "grouped">("ungrouped");
  const [marking, setMarking] = useState<"zero-one" | "plus-minus">("zero-one");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [type, setType] = useState("mcq-single");
  const [difficulty, setDifficulty] = useState("Application");
  const [timeEst, setTimeEst] = useState<number | string>(90);
  const [isPublishing, setIsPublishing] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const duplicateId = searchParams.get("duplicate");
  const targetId = editId || duplicateId;

  const [stem, setStem] = useState("");
  const [options, setOptions] = useState([
    { letter: "A", text: "", correct: false },
    { letter: "B", text: "", correct: false },
    { letter: "C", text: "", correct: false },
    { letter: "D", text: "", correct: false },
  ]);
  const [bowtieConfig, setBowtieConfig] = useState<any>({
    actions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
    conditions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
    parameters: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]
  });
  const [clozeBlanks, setClozeBlanks] = useState<Record<string, { options: string[], correct: string }>>({
    "1": { options: ["", "", ""], correct: "" }
  });
  const [rationale, setRationale] = useState("");
  const [tabs, setTabs] = useState(["Patient Information", "Vitals", "Current Medications"]);

  useEffect(() => {
    async function loadData() {
      const { data: catData } = await supabase.from('categories').select('*');
      if (catData && catData.length > 0) {
        setDbCategories(catData);
      }

      if (targetId) {
        const { data: qData } = await supabase.from('questions').select('*').eq('id', targetId).single();
        if (qData) {
          setCategory(qData.category);
          setSubcategory(qData.subcategory);
          setType(qData.type || "mcq-single");
          setDifficulty(qData.difficulty || "Application");
          setStem(qData.stem || "");
          setOptions(qData.options || []);
          setBowtieConfig(qData.options || {
            actions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
            conditions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
            parameters: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]
          });
          setClozeBlanks(qData.options?.blanks || { "1": { options: ["", "", ""], correct: "" } });
          setRationale(qData.rationale || "");
          setGroup(qData.group_type || "ungrouped");
          setMarking(qData.marking_scheme || "zero-one");
          setTimeEst(qData.time_est || 90);
        }
      } else {
        setCategory("");
        setSubcategory("");
        setType("mcq-single");
        setDifficulty("Application");
        setStem("");
        setOptions([
          { letter: "A", text: "", correct: false },
          { letter: "B", text: "", correct: false },
          { letter: "C", text: "", correct: false },
          { letter: "D", text: "", correct: false },
        ]);
        setBowtieConfig({
          actions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
          conditions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
          parameters: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]
        });
        setClozeBlanks({ "1": { options: ["", "", ""], correct: "" } });
        setRationale("");
        setGroup("ungrouped");
        setMarking("zero-one");
        setTimeEst(90);
        setStep(1);
      }
      setLoading(false);
    }
    loadData();
  }, [targetId]);

  const handlePublish = async (status: "published" | "draft") => {
    const stripHtml = (html: string) => {
      const tmp = document.createElement("DIV");
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || "";
    };

    const hasImage = (html: string) => html.includes("<img");

    const isEmpty = (html: string) => {
      if (!html) return true;
      if (hasImage(html)) return false;
      return stripHtml(html).trim() === "";
    };

    if (isEmpty(stem)) {
      toast.error("Question stem cannot be blank.");
      return;
    }
    
    if (type.startsWith("mcq")) {
      if (options.some((opt) => isEmpty(opt.text))) {
        toast.error("All answer options must be filled.");
        return;
      }
    } else if (type === "bowtie") {
      const actions = bowtieConfig.actions?.filter((a: any) => !isEmpty(a.text)) || [];
      const conditions = bowtieConfig.conditions?.filter((c: any) => !isEmpty(c.text)) || [];
      const parameters = bowtieConfig.parameters?.filter((p: any) => !isEmpty(p.text)) || [];
      
      if (actions.length < 2 || conditions.length < 1 || parameters.length < 2) {
        toast.error("Please fill in at least 2 Causes/Treatments and 1 Core Condition.");
        return;
      }
      const correctConditions = bowtieConfig.conditions.filter((c: any) => c.isCorrect);
      if (correctConditions.length !== 1) {
        toast.error("There must be exactly 1 correct Potential Condition.");
        return;
      }
      if (!bowtieConfig.actions.some((a: any) => a.isCorrect) || !bowtieConfig.parameters.some((p: any) => p.isCorrect)) {
        toast.error("Please mark at least one correct Action and one correct Parameter.");
        return;
      }
    } else if (type === "next-gen-cloze") {
      const match = stem.match(/{([0-9]+)}/g);
      if (!match) {
        toast.error("You must have at least one blank placeholder (e.g. {1}) in the stem.");
        return;
      }
      
      const blankIds = match.map(m => m.replace(/[{}]/g, ''));
      for (const id of blankIds) {
        const blank = clozeBlanks[id];
        if (!blank || blank.options.some(o => !o.trim())) {
          toast.error(`Blank {${id}} has empty options.`);
          return;
        }
        if (!blank.correct) {
          toast.error(`Please select a correct answer for blank {${id}}.`);
          return;
        }
      }
    }

    if (isEmpty(rationale)) {
      toast.error("Rationale cannot be blank.");
      return;
    }

    setIsPublishing(true);
    try {
      const payload = {
        type,
        category,
        subcategory,
        difficulty,
        stem,
        options: type === "bowtie" ? bowtieConfig : (type === "next-gen-cloze" ? { blanks: clozeBlanks } : (type.startsWith("mcq") ? options : null)),
        rationale,
        group_type: group,
        marking_scheme: marking,
        is_published: status === "published"
      };

      if (editId) {
        const { error } = await supabase.from('questions').update(payload).eq('id', editId);
        if (error) throw error;
        toast.success(status === "published" ? "Question updated successfully!" : "Draft updated!");
      } else {
        const { error } = await supabase.from('questions').insert(payload);
        if (error) throw error;
        toast.success(status === "published" ? "Question published successfully!" : "Draft saved!");
      }
      
      navigate('/admin/questions/previous');
    } catch (err: any) {
      toast.error("Error saving question: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const cat = dbCategories.find((c) => c.name === category);

  if (loading) return <AdminLayout title="Loading..."><div className="p-8">Loading...</div></AdminLayout>;

  return (
    <AdminLayout
      title={editId ? "Edit Question" : duplicateId ? "Duplicate Question" : "Question Management"}
      subtitle="Author traditional and Next Generation NCLEX questions with rich media."
      actions={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/admin/questions/previous" className="rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground hover:bg-muted">View Question Bank</Link>
          <Link to="/admin/questions/performance" className="rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground hover:bg-muted">Performance</Link>
        </div>
      }
    >
      <Stepper active={step} />

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5 min-w-0">
          {step === 1 && (
            <>
              <Section title="Question Setup" desc="Configure type and classification">
                <Grid2>
                  <Field 
                    label={
                      <>
                        Question Group Type
                        <span className="ml-2 inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">COMING SOON</span>
                      </>
                    }
                  >
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1 opacity-50 pointer-events-none">
                      <SegBtn active={group === "ungrouped"} onClick={() => setGroup("ungrouped")}>Ungrouped</SegBtn>
                      <SegBtn active={group === "grouped"} onClick={() => setGroup("grouped")}>Grouped</SegBtn>
                    </div>
                  </Field>
                  <Field 
                    label={
                      <>
                        Marking Scheme
                        <span className="ml-2 inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">COMING SOON</span>
                      </>
                    }
                  >
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1 opacity-50 pointer-events-none">
                      <SegBtn active={marking === "zero-one"} onClick={() => setMarking("zero-one")}>Zero-One</SegBtn>
                      <SegBtn active={marking === "plus-minus"} onClick={() => setMarking("plus-minus")}>Plus / Minus</SegBtn>
                    </div>
                  </Field>
                </Grid2>
                <Grid2>
                  <Field label="Category">
                    <Select
                      value={category}
                      placeholder="Select category"
                      onChange={(v) => {
                        setCategory(v);
                        const c = dbCategories.find((x) => x.name === v);
                        if (c) setSubcategory(c.subcategories[0]);
                      }}
                      options={dbCategories.map((c) => c.name)}
                    />
                  </Field>
                  <Field label="Subcategory">
                    <Select value={subcategory} placeholder="Select subcategory" onChange={setSubcategory} options={cat?.subcategories || []} />
                  </Field>
                </Grid2>
                <Grid2>

                  <Field label="Time Est. (Sec)">
                    <input
                      type="number"
                      min={1}
                      value={timeEst}
                      onChange={(e) => setTimeEst(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </Field>
                </Grid2>
              </Section>

              <Section title="Question Type" desc="Pick a Traditional or Next Generation format">
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground">Traditional</div>
                    <div className="flex flex-wrap gap-2">
                      {questionTypes.traditional.map((t) => (
                        <Pill key={t.id} active={type === t.id} onClick={() => setType(t.id)}>{t.name}</Pill>
                      ))}
                    </div>
                  </div>
                  <div className="relative rounded-xl p-2 -m-2">
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-info/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-info-foreground">Next Generation</div>
                    <div className="flex flex-wrap gap-2">
                      {questionTypes.ngn.map((t) => {
                        const isEnabled = t.id === "bowtie" || t.id === "next-gen-cloze";
                        return (
                          <Pill 
                            key={t.id} 
                            active={type === t.id} 
                            onClick={() => { if (isEnabled) setType(t.id); }}
                          >
                            <span className={cn(!isEnabled && "opacity-50 pointer-events-none")}>{t.name}</span>
                          </Pill>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Section>

              {group === "grouped" && (
                <Section
                  title="Grouped Scenario Tabs"
                  desc="Up to 4 contextual tabs displayed alongside every question in this group"
                >
                  <div className="space-y-2">
                    {tabs.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 pl-4">
                        <Layers2 className="size-4 text-muted-foreground" />
                        <input
                          value={t}
                          onChange={(e) => setTabs(tabs.map((x, idx) => (idx === i ? e.target.value : x)))}
                          className="flex-1 bg-transparent text-sm outline-none"
                        />
                        <select className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs">
                          <option>Rich text</option>
                          <option>Table</option>
                        </select>
                        <button onClick={() => setTabs(tabs.filter((_, idx) => idx !== i))} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                    {tabs.length < 4 && (
                      <button onClick={() => setTabs([...tabs, "New Tab"])} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-3 text-sm font-medium text-primary hover:bg-muted">
                        <Plus className="size-4" weight="regular" /> Add Tab
                      </button>
                    )}
                  </div>
                </Section>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Section title="Question Stem">
                <RichTextEditor
                  value={stem}
                  onChange={setStem}
                  allowClozeBlanks={type === "next-gen-cloze"}
                  onInsertBlank={(id) => {
                    if (!clozeBlanks[id]) {
                      setClozeBlanks({ ...clozeBlanks, [id]: { options: ["", "", ""], correct: "" } });
                    }
                  }}
                />
              </Section>

              {type.startsWith("mcq") ? (
                <Section title="Answer Options" desc="Mark correct answers based on the chosen type">
                  <div className="space-y-2">
                    {options.map((o, i) => (
                      <div key={o.letter} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                        <div className="grid size-8 place-items-center rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground">{o.letter}</div>
                        <input
                          value={o.text}
                          onChange={(e) => setOptions(options.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))}
                          className="flex-1 bg-transparent text-sm outline-none"
                        />
                        <label className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition", o.correct ? "bg-success/15 text-success-foreground" : "bg-muted text-muted-foreground")}>
                          <input
                            type="checkbox"
                            checked={o.correct}
                            onChange={() => {
                              if (type === "mcq-single") {
                                setOptions(options.map((x, idx) => ({ ...x, correct: idx === i })));
                              } else {
                                setOptions(options.map((x, idx) => (idx === i ? { ...x, correct: !x.correct } : x)));
                              }
                            }}
                            className="size-3.5 accent-primary"
                          />
                          Correct
                        </label>
                        <button
                          onClick={() => {
                            const newOpts = options.filter((_, idx) => idx !== i);
                            const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
                            setOptions(newOpts.map((opt, idx) => ({ ...opt, letter: letters[idx] || "?" })));
                          }}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <X className="size-4" weight="regular" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
                        const newOpts = [...options, { letter: "?", text: "", correct: false }];
                        setOptions(newOpts.map((opt, idx) => ({ ...opt, letter: letters[idx] || "?" })));
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-3 text-sm font-medium text-primary hover:bg-muted"
                    >
                      <Plus className="size-4" weight="regular" /> Add option
                    </button>
                  </div>
                </Section>
              ) : type === "bowtie" ? (
                <Section title="Bow-Tie Configuration" desc="Define the Core Condition, Causes/Assessments, and Treatments/Effects. Mark the correct options with checkboxes.">
                  <div className="space-y-8">
                    <div>
                      <h4 className="mb-4 text-sm font-bold text-muted-foreground uppercase tracking-wider">Components & Options</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Causes / Assessments */}
                        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                          <h5 className="text-center text-xs font-bold uppercase text-muted-foreground">Causes / Assessments</h5>
                          {bowtieConfig.actions.map((item: any, i: number) => (
                            <div key={i} className={cn("flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm transition-colors", item.isCorrect ? "border-success/50 ring-1 ring-success/20" : "border-border")}>
                              <textarea value={item.text} onChange={(e) => { 
                                const n = [...bowtieConfig.actions]; n[i] = { ...n[i], text: e.target.value }; setBowtieConfig({ ...bowtieConfig, actions: n }); 
                                e.target.style.height = '0px'; e.target.style.height = `${e.target.scrollHeight}px`;
                              }} rows={1} className="flex-1 bg-transparent text-sm outline-none px-1 min-w-0 resize-none overflow-hidden py-1 min-h-[28px]" placeholder={`Cause/Assessment ${i + 1}`} />
                              <label className="flex shrink-0 items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={item.isCorrect} onChange={(e) => { const n = [...bowtieConfig.actions]; n[i] = { ...n[i], isCorrect: e.target.checked }; setBowtieConfig({ ...bowtieConfig, actions: n }); }} className="size-3.5 accent-success" /></label>
                              <button onClick={() => { const n = bowtieConfig.actions.filter((_: any, idx: number) => idx !== i); setBowtieConfig({ ...bowtieConfig, actions: n }); }} className="grid size-6 place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><X className="size-3" /></button>
                            </div>
                          ))}
                          <button onClick={() => setBowtieConfig({ ...bowtieConfig, actions: [...bowtieConfig.actions, { text: "", isCorrect: false }] })} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-primary bg-primary/5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">
                            <Plus className="size-3" /> Add
                          </button>
                        </div>

                        {/* Core Condition */}
                        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                          <h5 className="text-center text-xs font-bold uppercase text-muted-foreground">Core Condition</h5>
                          <div className="flex items-center gap-2 rounded-lg border border-success/50 bg-card p-2 shadow-sm ring-1 ring-success/20">
                            <textarea
                              value={bowtieConfig.conditions[0]?.text || ""}
                              onChange={(e) => {
                                setBowtieConfig({
                                  ...bowtieConfig,
                                  conditions: [{ text: e.target.value, isCorrect: true }]
                                });
                                e.target.style.height = '0px'; e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              rows={1}
                              className="flex-1 bg-transparent text-sm outline-none px-1 min-w-0 resize-none overflow-hidden py-1 min-h-[28px]"
                              placeholder="Core Condition"
                            />
                          </div>
                        </div>

                        {/* Treatments / Effects */}
                        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                          <h5 className="text-center text-xs font-bold uppercase text-muted-foreground">Treatments / Effects</h5>
                          {bowtieConfig.parameters.map((item: any, i: number) => (
                            <div key={i} className={cn("flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm transition-colors", item.isCorrect ? "border-success/50 ring-1 ring-success/20" : "border-border")}>
                              <textarea value={item.text} onChange={(e) => { 
                                const n = [...bowtieConfig.parameters]; n[i] = { ...n[i], text: e.target.value }; setBowtieConfig({ ...bowtieConfig, parameters: n }); 
                                e.target.style.height = '0px'; e.target.style.height = `${e.target.scrollHeight}px`;
                              }} rows={1} className="flex-1 bg-transparent text-sm outline-none px-1 min-w-0 resize-none overflow-hidden py-1 min-h-[28px]" placeholder={`Treatment/Effect ${i + 1}`} />
                              <label className="flex shrink-0 items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={item.isCorrect} onChange={(e) => { const n = [...bowtieConfig.parameters]; n[i] = { ...n[i], isCorrect: e.target.checked }; setBowtieConfig({ ...bowtieConfig, parameters: n }); }} className="size-3.5 accent-success" /></label>
                              <button onClick={() => { const n = bowtieConfig.parameters.filter((_: any, idx: number) => idx !== i); setBowtieConfig({ ...bowtieConfig, parameters: n }); }} className="grid size-6 place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><X className="size-3" /></button>
                            </div>
                          ))}
                          <button onClick={() => setBowtieConfig({ ...bowtieConfig, parameters: [...bowtieConfig.parameters, { text: "", isCorrect: false }] })} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-primary bg-primary/5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">
                            <Plus className="size-3" /> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Section>
              ) : type === "next-gen-cloze" && (
                <Section title="Cloze Configuration" desc="Define the options and correct answer for each blank (e.g., {1}, {2}) in the stem.">
                  <div className="space-y-6">
                    {Object.entries(clozeBlanks).map(([id, blank]) => (
                      <div key={id} className="rounded-xl border border-border bg-muted/20 p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="font-bold text-foreground">Blank {'{'}{id}{'}'}</h4>
                          <button
                            onClick={() => {
                              const newBlanks = { ...clozeBlanks };
                              delete newBlanks[id];
                              setClozeBlanks(newBlanks);
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          {blank.options.map((opt, i) => (
                            <div key={i} className={cn("flex items-center gap-3 rounded-xl border p-2 transition-colors", blank.correct === opt && opt !== "" ? "border-success/50 bg-success/5" : "border-border bg-card")}>
                              <input
                                value={opt}
                                onChange={(e) => {
                                  const newOptions = [...blank.options];
                                  newOptions[i] = e.target.value;
                                  setClozeBlanks({ ...clozeBlanks, [id]: { ...blank, options: newOptions, correct: blank.correct === opt ? e.target.value : blank.correct } });
                                }}
                                className="flex-1 bg-transparent text-sm outline-none px-2"
                                placeholder={`Option ${i + 1}`}
                              />
                              <label className="flex items-center gap-2 text-xs font-semibold">
                                <input
                                  type="radio"
                                  name={`correct-${id}-${i}`}
                                  checked={blank.correct === opt && opt !== ""}
                                  onChange={() => setClozeBlanks({ ...clozeBlanks, [id]: { ...blank, correct: opt } })}
                                  className="size-3.5 accent-success"
                                />
                                Correct
                              </label>
                              <button
                                onClick={() => {
                                  const newOptions = blank.options.filter((_, idx) => idx !== i);
                                  setClozeBlanks({ ...clozeBlanks, [id]: { ...blank, options: newOptions, correct: blank.correct === opt ? "" : blank.correct } });
                                }}
                                className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              setClozeBlanks({ ...clozeBlanks, [id]: { ...blank, options: [...blank.options, ""] } });
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-2 text-sm font-medium text-primary hover:bg-muted"
                          >
                            <Plus className="size-4" /> Add option
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newId = String(Math.max(0, ...Object.keys(clozeBlanks).map(Number)) + 1);
                        setClozeBlanks({ ...clozeBlanks, [newId]: { options: ["", "", ""], correct: "" } });
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary bg-primary/5 p-3 text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      <Plus className="size-4" /> Add New Blank
                    </button>
                  </div>
                </Section>
              )}

              <Section title="Explanation & Rationale" desc="Provide evidence-based reasoning with images">
                <RichTextEditor
                  value={rationale}
                  onChange={setRationale}
                />
              </Section>
            </>
          )}

          {step === 3 && (
            <>
              <Section title="Preview" desc="Exactly what students will see">
                <div className="rounded-2xl border border-border bg-background p-6">
                  <div className="mb-3 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">{group === "grouped" ? "Grouped" : "Ungrouped"}</span>
                    <span className="rounded-full bg-info/15 px-2.5 py-1 font-semibold text-info-foreground">{type.replace(/-/g, " ").toUpperCase()}</span>
                    <span className="text-muted-foreground">{category} • {subcategory}</span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: type === "next-gen-cloze" ? stem.replace(/{[0-9]+}/g, "_________") : stem }} />
                  <div className="mt-4 space-y-2">
                    {type.startsWith("mcq") ? options.map((o) => (
                      <div key={o.letter} className={cn("flex items-center gap-3 rounded-xl border p-3 text-sm", o.correct ? "border-success/40 bg-success/5" : "border-border")}>
                        <div className="grid size-7 place-items-center rounded-lg bg-secondary text-xs font-semibold shrink-0">{o.letter}</div>
                        <span className="flex-1 break-words min-w-0">{o.text}</span>
                        {o.correct && <Check className="ml-auto size-4 text-success-foreground" />}
                      </div>
                    )) : type === "bowtie" ? (
                      <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
                        <div className="font-semibold text-primary mb-2">Advanced Bow-Tie Configured</div>
                        <p className="text-muted-foreground">Causes/Assessments: {bowtieConfig.actions?.filter((w: any)=>!isEmpty(w.text)).length || 0} | Core Condition: {bowtieConfig.conditions?.filter((w: any)=>!isEmpty(w.text)).length || 0} | Treatments/Effects: {bowtieConfig.parameters?.filter((w: any)=>!isEmpty(w.text)).length || 0}</p>
                      </div>
                    ) : type === "next-gen-cloze" && (
                      <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
                        <div className="font-semibold text-primary mb-2">Fill in the Blank Dropdown Configured</div>
                        <p className="text-muted-foreground">Configured Blanks: {Object.keys(clozeBlanks).length}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 rounded-xl bg-muted p-4 text-sm overflow-hidden">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</div>
                    <div className="prose prose-sm dark:prose-invert max-w-none mt-2 break-all" dangerouslySetInnerHTML={{ __html: rationale }} />
                  </div>
                </div>
              </Section>

              <Section title="Validation" desc="Make sure everything is ready">
                <ul className="space-y-2 text-sm">
                  {[
                    ["Category & subcategory selected", true],
                    ["Question stem provided", !isEmpty(stem)],
                    type.startsWith("mcq") 
                      ? ["At least one correct answer marked", options.some((o) => o.correct)]
                      : type === "bowtie"
                      ? ["Bow-Tie configured", bowtieConfig.conditions?.filter((c: any) => c.isCorrect).length === 1 && bowtieConfig.actions?.some((a: any) => a.isCorrect) && bowtieConfig.parameters?.some((p: any) => p.isCorrect)]
                      : type === "next-gen-cloze"
                      ? ["Cloze dropdowns configured", Object.values(clozeBlanks).every(b => b.correct !== "" && b.options.every(o => o.trim() !== "")) && !!stem.match(/{([0-9]+)}/g)]
                      : ["Configuration complete", true],
                    ["Rationale provided", !isEmpty(rationale)],
                  ].map(([label, ok]) => (
                    <li key={String(label)} className="flex items-center gap-2">
                      <span className={cn("grid size-5 place-items-center rounded-full", ok ? "bg-success text-white" : "bg-destructive/20 text-destructive")}>
                        {ok ? <Check className="size-3" /> : <X className="size-3" weight="regular" />}
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>
              </Section>
            </>
          )}

          {/* Step nav */}
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              <ChevronLeft className="size-4" /> Back
            </button>
            <div className="text-xs text-muted-foreground">Step {step} of {steps.length}</div>
            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1) {
                    if (!category) {
                      toast.error("Please select a category.");
                      return;
                    }
                    if (!subcategory) {
                      toast.error("Please select a subcategory.");
                      return;
                    }
                    if (!timeEst || Number(timeEst) <= 0) {
                      toast.error("Please provide a valid time estimate.");
                      return;
                    }
                  }
                  if (step === 2) {
                    if (isEmpty(stem)) {
                      toast.error("Question stem cannot be blank.");
                      return;
                    }
                    if (type.startsWith("mcq")) {
                      if (options.some((opt) => isEmpty(opt.text))) {
                        toast.error("All answer options must be filled.");
                        return;
                      }
                      if (!options.some((opt) => opt.correct)) {
                        toast.error("Please mark at least one correct answer.");
                        return;
                      }
                    } else if (type === "bowtie") {
                      const actions = bowtieConfig.actions?.filter((a: any) => !isEmpty(a.text)) || [];
                      const conditions = bowtieConfig.conditions?.filter((c: any) => !isEmpty(c.text)) || [];
                      const parameters = bowtieConfig.parameters?.filter((p: any) => !isEmpty(p.text)) || [];
                      
                      if (actions.length < 2 || conditions.length < 1 || parameters.length < 2) {
                        toast.error("Please fill in at least 2 Causes/Treatments and 1 Core Condition.");
                        return;
                      }
                      const correctConditions = bowtieConfig.conditions.filter((c: any) => c.isCorrect);
                      if (correctConditions.length !== 1) {
                        toast.error("There must be exactly 1 correct Potential Condition.");
                        return;
                      }
                      if (!bowtieConfig.actions.some((a: any) => a.isCorrect) || !bowtieConfig.parameters.some((p: any) => p.isCorrect)) {
                        toast.error("Please mark at least one correct Action and one correct Parameter.");
                        return;
                      }
                    }
                    
                    if (isEmpty(rationale)) {
                      toast.error("Rationale cannot be blank.");
                      return;
                    }
                  }
                  setStep(step + 1);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                Continue <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                onClick={() => handlePublish("published")}
                disabled={isPublishing}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Send className="size-4" /> {isPublishing ? "Saving..." : "Publish Question"}
              </button>
            )}
          </div>
        </div>

        {/* Right rail */}
        <aside className="space-y-5">
          <Section title="Preview Summary" desc={undefined}>
            <dl className="space-y-3 text-sm">
              {[
                ["Group", group === "grouped" ? "Grouped" : "Ungrouped"],
                ["Type", type.replace(/-/g, " ")],
                ["Marking", marking === "zero-one" ? "Zero-One" : "Plus / Minus"],
                ["Category", category],
                ["Subcategory", subcategory],
                ["Difficulty", difficulty],
                ["Time est.", `${timeEst} sec`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-dashed border-border pb-2 last:border-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-semibold capitalize">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Publish" desc="Save as draft to refine later, or publish to make it available in active mock exams.">
            <button
              onClick={() => handlePublish("published")}
              disabled={isPublishing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Send className="size-4" /> {isPublishing ? "Saving..." : "Publish Question"}
            </button>
            <button
              onClick={() => handlePublish("draft")}
              disabled={isPublishing}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              <Save className="size-4" /> Save as draft
            </button>
          </Section>
        </aside>
      </div>
    </AdminLayout>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
function SegBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition", active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{children}</button>
  );
}
function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary">
      {placeholder && <option value="" disabled hidden>{placeholder}</option>}
      {options.map((o) => (<option key={o} value={o}>{o}</option>))}
    </select>
  );
}

