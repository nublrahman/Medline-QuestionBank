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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select as UISelect, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function migrateScenarioTabs(tabs: any[]): any[] {
  if (!tabs) return [];
  return tabs.map(tab => {
    if (tab.type === "table") {
      let newHeaders = tab.tableHeaders;
      let newRows = tab.tableRows;
      
      if (newHeaders && !Array.isArray(newHeaders)) {
        newHeaders = [newHeaders.col1 || "Body System", newHeaders.col2 || "Findings"];
      }
      
      if (newRows && newRows.length > 0 && newRows[0].label !== undefined) {
        newRows = newRows.map((r: any) => ({
          id: r.id,
          cells: [r.label || "", r.text || ""]
        }));
      }
      
      return { ...tab, tableHeaders: newHeaders, tableRows: newRows };
    }
    return tab;
  });
}

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

function Pill({ active, onClick, children, disabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-foreground hover:border-primary/40",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none"
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
  const [subQuestions, setSubQuestions] = useState<any[]>([]);
  const [activeSubIndex, setActiveSubIndex] = useState(-1);
  const [bowtieConfig, setBowtieConfig] = useState<any>({
    actions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
    conditions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
    parameters: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]
  });
  const [tableConfig, setTableConfig] = useState<any>({
    columns: [{ id: "col-1", label: "Improved" }, { id: "col-2", label: "Declined" }],
    rows: [{ id: "row-1", text: "" }, { id: "row-2", text: "" }],
    correctAnswers: {},
    multiSelect: false
  });
  const [clozeBlanks, setClozeBlanks] = useState<Record<string, { options: string[], correct: string }>>({
    "1": { options: ["", "", ""], correct: "" }
  });
  const [clozeDependencies, setClozeDependencies] = useState<Array<{ sourceBlankId: string, targetBlankId: string, mapping: Record<string, string[]> }>>([]);
  const [highlightConfig, setHighlightConfig] = useState<{
    layout?: "paragraph" | "table";
    tables?: {
      id: string;
      tabName: string;
      headers: { col1: string; col2: string };
      rows: { id: string; label: string; sentences: { id: string; text: string }[] }[];
    }[];
    tableTabName?: string;
    tableHeaders?: { col1: string; col2: string };
    tableRows?: { id: string; label: string; sentences: { id: string; text: string }[] }[];
    sentences: {id: string; text: string}[];
    correctHighlights: string[];
  }>({ layout: "paragraph", tables: [{ id: `t-${Math.random().toString(36).substring(7)}`, tabName: "History and Physical", headers: { col1: "Body System", col2: "Findings" }, rows: [] }], sentences: [], correctHighlights: [] });
  const [activeHighlightTab, setActiveHighlightTab] = useState(0);
  const [rationale, setRationale] = useState("");
  type ScenarioTab = {
    title: string;
    type?: "text" | "table";
    content: string;
    tableHeaders?: string[];
    tableRows?: { id: string; cells: string[] }[];
  };
  const [tabs, setTabs] = useState<ScenarioTab[]>([
    { title: "Patient Information", type: "text", content: "" },
    { title: "Vitals", type: "text", content: "" },
    { title: "Current Medications", type: "text", content: "" }
  ]);
  const [includeTabs, setIncludeTabs] = useState(false);

  const switchSubQuestion = (newIndex: number) => {
    let updatedSubs = [...subQuestions];
    
    if (activeSubIndex >= 0) {
      updatedSubs[activeSubIndex] = {
        ...updatedSubs[activeSubIndex],
        type,
        stem,
        options,
        bowtieConfig,
        tableConfig,
        clozeBlanks,
        clozeDependencies,
        highlightConfig,
        rationale,
        marking_scheme: marking,
        scenario_tabs: includeTabs ? tabs : [],
        include_tabs: includeTabs
      };
    }

    if (newIndex >= 0) {
      let targetSub = updatedSubs[newIndex];
      if (!targetSub) {
        targetSub = { id: Math.random().toString(36).substring(7) };
        updatedSubs[newIndex] = targetSub;
      }

      setSubQuestions(updatedSubs);
      setActiveSubIndex(newIndex);

      setType(targetSub.type || "mcq-single");
      setStem(targetSub.stem || "");
      setOptions(targetSub.options || [{ letter: "A", text: "", correct: false }, { letter: "B", text: "", correct: false }, { letter: "C", text: "", correct: false }, { letter: "D", text: "", correct: false }]);
      setBowtieConfig(targetSub.bowtieConfig || {
        actions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
        conditions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
        parameters: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]
      });
      setTableConfig(targetSub.tableConfig || { columns: [{ id: "col-1", label: "Improved" }, { id: "col-2", label: "Declined" }], rows: [{ id: "row-1", text: "" }, { id: "row-2", text: "" }], correctAnswers: {}, multiSelect: false });
      setClozeBlanks(targetSub.clozeBlanks || { "1": { options: ["", "", ""], correct: "" } });
      setClozeDependencies(targetSub.clozeDependencies || []);
      setHighlightConfig(targetSub.highlightConfig || { layout: "paragraph", tables: [{ id: `t-${Math.random().toString(36).substring(7)}`, tabName: "History and Physical", headers: { col1: "Body System", col2: "Findings" }, rows: [] }], sentences: [], correctHighlights: [] });
      setActiveHighlightTab(0);
      setRationale(targetSub.rationale || "");
      setMarking(targetSub.marking_scheme || "zero-one");
      setIncludeTabs(targetSub.include_tabs || false);
      setTabs(targetSub.scenario_tabs && targetSub.scenario_tabs.length > 0 ? migrateScenarioTabs(targetSub.scenario_tabs) : [
        { title: "Patient Information", type: "text", content: "" },
        { title: "Vitals", type: "text", content: "" },
        { title: "Current Medications", type: "text", content: "" }
      ]);
    } else {
      setSubQuestions(updatedSubs);
      setActiveSubIndex(newIndex);
    }
  };


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
          
          let loadedOptions = qData.options || [];
          if (qData.group_type === "grouped" && loadedOptions.subQuestions) {
             setSubQuestions(loadedOptions.subQuestions);
          } else {
             setOptions(Array.isArray(loadedOptions) ? loadedOptions : (loadedOptions.mcq_options || []));
          }

          setBowtieConfig(qData.options || {
            actions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
            conditions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
            parameters: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]
          });
          setTableConfig(qData.options || { columns: [{ id: "col-1", label: "Improved" }, { id: "col-2", label: "Declined" }], rows: [{ id: "row-1", text: "" }, { id: "row-2", text: "" }], correctAnswers: {}, multiSelect: false });
          setClozeBlanks(qData.options?.blanks || { "1": { options: ["", "", ""], correct: "" } });
          setClozeDependencies(qData.options?.clozeDependencies || []);
          let loadedHighlightConfig = qData.options || { layout: "paragraph", tables: [{ id: `t-${Math.random().toString(36).substring(7)}`, tabName: "History and Physical", headers: { col1: "Body System", col2: "Findings" }, rows: [] }], sentences: [], correctHighlights: [] };
          // Migration from old single table config to tables array
          if (loadedHighlightConfig.layout === "table" && !loadedHighlightConfig.tables && loadedHighlightConfig.tableRows) {
            loadedHighlightConfig.tables = [{
              id: `t-${Math.random().toString(36).substring(7)}`,
              tabName: loadedHighlightConfig.tableTabName || "History and Physical",
              headers: loadedHighlightConfig.tableHeaders || { col1: "Body System", col2: "Findings" },
              rows: loadedHighlightConfig.tableRows
            }];
          }
          setHighlightConfig(loadedHighlightConfig);
          setActiveHighlightTab(0);
          setRationale(qData.rationale || "");
          setGroup(qData.group_type || "ungrouped");
          if (qData.options?.scenario_tabs && qData.options.scenario_tabs.length > 0) {
            setTabs(migrateScenarioTabs(qData.options.scenario_tabs));
            setIncludeTabs(true);
          } else {
            setTabs([
              { title: "Patient Information", content: "" },
              { title: "Vitals", content: "" },
              { title: "Current Medications", content: "" }
            ]);
            setIncludeTabs(false);
          }
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
        setSubQuestions([]);
        setActiveSubIndex(-1);
        setBowtieConfig({
          actions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
          conditions: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }],
          parameters: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]
        });
        setTableConfig({ columns: [{ id: "col-1", label: "Improved" }, { id: "col-2", label: "Declined" }], rows: [{ id: "row-1", text: "" }, { id: "row-2", text: "" }], correctAnswers: {}, multiSelect: false });
        setClozeBlanks({ "1": { options: ["", "", ""], correct: "" } });
        setClozeDependencies([]);
        setRationale("");
        setGroup("ungrouped");
        setTabs([
          { title: "Patient Information", content: "" },
          { title: "Vitals", content: "" },
          { title: "Current Medications", content: "" }
        ]);
        setIncludeTabs(false);
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

    if (group !== "grouped" && isEmpty(stem)) {
      toast.error("Question stem cannot be blank.");
      return;
    }
    
    if (group !== "grouped") {
      if (type.startsWith("mcq")) {
        if (options.some((opt) => isEmpty(opt.text))) {
          toast.error("All answer options must be filled.");
          return;
        }
        const texts = options.map(o => o.text.trim().toLowerCase());
        if (new Set(texts).size !== texts.length) {
          toast.error("Duplicate answer options are not allowed.");
          return;
        }
      } else if (type === "bowtie") {
        const actions = bowtieConfig.actions?.filter((a: any) => !isEmpty(a.text)) || [];
        const conditions = bowtieConfig.conditions?.filter((c: any) => !isEmpty(c.text)) || [];
        const parameters = bowtieConfig.parameters?.filter((p: any) => !isEmpty(p.text)) || [];
        
        const allTexts = [...actions, ...conditions, ...parameters].map(x => x.text.trim().toLowerCase());
        if (new Set(allTexts).size !== allTexts.length) {
          toast.error("Duplicate options are not allowed across Bow-Tie columns.");
          return;
        }

        if (actions.length < 2 || conditions.length < 1 || parameters.length < 2) {
          toast.error("Please fill in at least 2 Causes/Treatments and 1 Core Condition.");
          return;
        }
        const correctConditions = conditions.filter((c: any) => c.isCorrect);
        if (correctConditions.length !== 1) {
          toast.error("There must be exactly 1 correct Potential Condition (cannot be empty).");
          return;
        }
        if (!actions.some((a: any) => a.isCorrect) || !parameters.some((p: any) => p.isCorrect)) {
          toast.error("Please mark at least one correct Action and one correct Parameter (cannot be empty).");
          return;
        }
      } else if (type === "table") {
        const rows = tableConfig.rows?.filter((r: any) => !isEmpty(r.text)) || [];
        const columns = tableConfig.columns?.filter((c: any) => !isEmpty(c.label)) || [];
        if (rows.length === 0 || columns.length === 0) {
          toast.error("Table requires at least one row and one column.");
          return;
        }
        if (Object.keys(tableConfig.correctAnswers).length !== rows.length) {
          toast.error("Please provide a correct answer for every row in the table.");
          return;
        }
      } else if (type === "next-gen-cloze") {
        const match = stem.match(/{(?:dropdown\s+)?[0-9]+}/g);
        if (!match) {
          toast.error("You must have at least one blank placeholder (e.g. {dropdown 1}) in the stem.");
          return;
        }
        
        const blankIds = match.map(m => m.replace(/[^0-9]/g, ''));
        for (const id of blankIds) {
          const blank = clozeBlanks[id];
          if (!blank) {
            toast.error(`Dropdown {${id}} is in the text but missing from configuration.`);
            return;
          }
          if (blank.options.some(o => !o.trim())) {
            toast.error(`Dropdown {${id}} has empty options.`);
            return;
          }
          const texts = blank.options.map(o => o.trim().toLowerCase());
          if (new Set(texts).size !== texts.length) {
            toast.error(`Dropdown {${id}} contains duplicate options.`);
            return;
          }
          if (!blank.correct) {
            toast.error(`Please select a correct answer for dropdown {${id}}.`);
            return;
          }
        }
        if (clozeDependencies && clozeDependencies.length > 0) {
          for (const dep of clozeDependencies) {
            if (!dep.sourceBlankId || !dep.targetBlankId) {
              toast.error("Please select a source and target blank for all dependency rules.");
              return;
            }
            if (dep.sourceBlankId === dep.targetBlankId) {
              toast.error(`Dropdown {${dep.sourceBlankId}} cannot depend on itself.`);
              return;
            }
            if (Object.keys(dep.mapping).length === 0) {
              toast.error(`Please map at least one option for the dependency between Dropdown {${dep.sourceBlankId}} and Dropdown {${dep.targetBlankId}}.`);
              return;
            }
          }
        }
      } else if (type === "next-gen-highlight") {
        if (highlightConfig.layout === "table") {
          if (!highlightConfig.tables || highlightConfig.tables.length === 0) {
            toast.error("You must add at least one table tab.");
            return;
          }
          for (const table of highlightConfig.tables) {
            if (isEmpty(table.tabName)) {
              toast.error("Table tab names cannot be empty.");
              return;
            }
            if (!table.rows || table.rows.length === 0) {
              toast.error(`You must add at least one row to table tab: ${table.tabName}`);
              return;
            }
            if (table.rows.some(r => isEmpty(r.label) || r.sentences.some(s => isEmpty(s.text)))) {
              toast.error(`Table rows and sentences cannot be empty in tab: ${table.tabName}`);
              return;
            }
          }
        } else {
          if (!highlightConfig.sentences || highlightConfig.sentences.length === 0) {
            toast.error("You must add at least one sentence to highlight.");
            return;
          }
          if (highlightConfig.sentences.some(s => isEmpty(s.text))) {
            toast.error("Highlight sentences cannot be empty.");
            return;
          }
        }
        if (!highlightConfig.correctHighlights || highlightConfig.correctHighlights.length === 0) {
          toast.error("You must select at least one correct sentence to highlight.");
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
      let finalOptions: any = null;
      if (group === "grouped") {
        // Sync current sub-question before saving
        const currentSubs = [...subQuestions];
        if (activeSubIndex >= 0 && currentSubs[activeSubIndex]) {
          currentSubs[activeSubIndex] = {
            ...currentSubs[activeSubIndex],
            type,
            stem,
            options,
            bowtieConfig,
            tableConfig,
            clozeBlanks,
            clozeDependencies,
            highlightConfig,
            rationale,
            marking_scheme: marking,
            scenario_tabs: includeTabs ? tabs : [],
            include_tabs: includeTabs
          };
        }
        finalOptions = { subQuestions: currentSubs };
      } else if (type === "bowtie") finalOptions = bowtieConfig;
      else if (type === "table") finalOptions = tableConfig;
      else if (type === "next-gen-cloze") finalOptions = { blanks: clozeBlanks, clozeDependencies };
      else if (type === "next-gen-highlight") finalOptions = highlightConfig;
      else if (type.startsWith("mcq")) finalOptions = options;

      if (includeTabs) {
        if (Array.isArray(finalOptions)) {
          finalOptions = { mcq_options: finalOptions, scenario_tabs: tabs };
        } else if (finalOptions) {
          finalOptions.scenario_tabs = tabs;
        } else {
          finalOptions = { scenario_tabs: tabs };
        }
      }

      const payload = {
        type: group === "grouped" ? "grouped" : type,
        category,
        subcategory,
        difficulty,
        stem: group === "grouped" ? "" : stem,
        options: finalOptions,
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
                      </>
                    }
                  >
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                      <SegBtn active={group === "ungrouped"} onClick={() => setGroup("ungrouped")}>Ungrouped</SegBtn>
                      <SegBtn active={group === "grouped"} onClick={() => { setGroup("grouped"); if (activeSubIndex === -1) switchSubQuestion(0); }}>Grouped</SegBtn>
                    </div>
                  </Field>
                  <Field 
                    label={
                      <>
                        Marking Scheme
                      </>
                    }
                  >
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
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

              {group === "ungrouped" && (
              <Section title="Question Type" desc="Pick a Traditional or Next Generation format">
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground">Traditional</div>
                    <div className="flex flex-wrap gap-2">
                      {questionTypes.traditional.map((t) => (
                        <Pill 
                          key={t.id} 
                          active={type === t.id} 
                          disabled={!!editId && !type.startsWith("mcq")} 
                          onClick={() => setType(t.id)}
                        >
                          {t.name}
                        </Pill>
                      ))}
                    </div>
                  </div>
                  <div className="relative rounded-xl p-2 -m-2">
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-info/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-info-foreground">Next Generation</div>
                    <div className="flex flex-wrap gap-2">
                      {questionTypes.ngn.map((t) => {
                        const isEnabled = t.id === "bowtie" || t.id === "next-gen-cloze" || t.id === "table" || t.id === "next-gen-highlight";
                        return (
                          <Pill 
                            key={t.id} 
                            active={type === t.id} 
                            disabled={!!editId}
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
              )}


            </>
          )}

          {step === 2 && (
            <>
              {group === "grouped" && (
                <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 border-b border-border mt-8">
                  {subQuestions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => switchSubQuestion(idx)}
                      className={cn("px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap flex items-center gap-2", activeSubIndex === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted-foreground/10")}
                    >
                      Item {idx + 1}
                      <X className="size-3 hover:text-destructive transition-colors" onClick={(e) => { 
                        e.stopPropagation(); 
                        setSubQuestions(prev => prev.filter((__, i) => i !== idx)); 
                        if(activeSubIndex === idx) switchSubQuestion(-1); 
                      }} />
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      switchSubQuestion(subQuestions.length);
                    }}
                    className="px-4 py-2 rounded-full text-sm font-bold text-primary hover:bg-muted whitespace-nowrap flex items-center gap-2"
                  >
                    <Plus className="size-4" /> Add Item
                  </button>
                </div>
              )}


              
              {(group === "ungrouped" || activeSubIndex >= 0) && (
                <>
                  {group === "grouped" && (
                    <Section title="Question Type" desc="Select format for this sub-question.">
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
                              const isEnabled = t.id === "bowtie" || t.id === "next-gen-cloze" || t.id === "table" || t.id === "next-gen-highlight";
                              return (
                                <Pill key={t.id} active={type === t.id} onClick={() => { if (isEnabled) setType(t.id); }}>
                                  <span className={cn(!isEnabled && "opacity-50 pointer-events-none")}>{t.name}</span>
                                </Pill>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Section>
                  )}
                  <Section title="Question Stem">
                <RichTextEditor
                  value={stem}
                  onChange={(val) => {
                    setStem(val);
                    if (type === "next-gen-cloze") {
                      // Strip HTML tags and normalize &nbsp; to space for accurate regex matching
                      const textContent = val.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
                      const matches = Array.from(textContent.matchAll(/{(?:dropdown\s+)?([0-9]+)}/g));
                      const idsInText = new Set(matches.map(m => m[1]));
                      
                      setClozeBlanks(prev => {
                        const newBlanks = { ...prev };
                        let hasChanges = false;
                        for (const id of Object.keys(newBlanks)) {
                          if (!idsInText.has(id)) {
                            delete newBlanks[id];
                            hasChanges = true;
                          }
                        }
                        return hasChanges ? newBlanks : prev;
                      });

                      setClozeDependencies(prev => {
                        const newDeps = prev.filter(d => idsInText.has(d.sourceBlankId) && idsInText.has(d.targetBlankId));
                        return newDeps.length !== prev.length ? newDeps : prev;
                      });
                    }
                  }}
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
                          <input 
                            value={bowtieConfig.actionLabel || "Causes / Assessments"} 
                            onChange={(e) => setBowtieConfig({ ...bowtieConfig, actionLabel: e.target.value })} 
                            className="w-full text-center text-xs font-bold uppercase text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors pb-1"
                            placeholder="Causes / Assessments Heading"
                          />
                          {bowtieConfig.actions.map((item: any, i: number) => (
                            <div key={i} className={cn("flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm transition-colors", item.isCorrect ? "border-success/50 ring-1 ring-success/20" : "border-border")}>
                              <textarea value={item.text} onChange={(e) => { 
                                const n = [...bowtieConfig.actions]; n[i] = { ...n[i], text: e.target.value }; setBowtieConfig({ ...bowtieConfig, actions: n }); 
                                e.target.style.height = '0px'; e.target.style.height = `${e.target.scrollHeight}px`;
                              }} rows={1} className="flex-1 bg-transparent text-sm outline-none px-1 min-w-0 resize-none overflow-hidden py-1 min-h-[28px]" placeholder={`Option ${i + 1}`} />
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
                          <input 
                            value={bowtieConfig.conditionLabel || "Core Condition"} 
                            onChange={(e) => setBowtieConfig({ ...bowtieConfig, conditionLabel: e.target.value })} 
                            className="w-full text-center text-xs font-bold uppercase text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors pb-1"
                            placeholder="Core Condition Heading"
                          />
                          {bowtieConfig.conditions.map((item: any, i: number) => (
                            <div key={i} className={cn("flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm transition-colors", item.isCorrect ? "border-success/50 ring-1 ring-success/20" : "border-border")}>
                              <textarea value={item.text} onChange={(e) => { 
                                const n = [...bowtieConfig.conditions]; n[i] = { ...n[i], text: e.target.value }; setBowtieConfig({ ...bowtieConfig, conditions: n }); 
                                e.target.style.height = '0px'; e.target.style.height = `${e.target.scrollHeight}px`;
                              }} rows={1} className="flex-1 bg-transparent text-sm outline-none px-1 min-w-0 resize-none overflow-hidden py-1 min-h-[28px]" placeholder={`Option ${i + 1}`} />
                              <label className="flex shrink-0 items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={item.isCorrect} onChange={(e) => { const n = [...bowtieConfig.conditions]; n[i] = { ...n[i], isCorrect: e.target.checked }; setBowtieConfig({ ...bowtieConfig, conditions: n }); }} className="size-3.5 accent-success" /></label>
                              <button onClick={() => { const n = bowtieConfig.conditions.filter((_: any, idx: number) => idx !== i); setBowtieConfig({ ...bowtieConfig, conditions: n }); }} className="grid size-6 place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><X className="size-3" /></button>
                            </div>
                          ))}
                          <button onClick={() => setBowtieConfig({ ...bowtieConfig, conditions: [...bowtieConfig.conditions, { text: "", isCorrect: false }] })} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-primary bg-primary/5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">
                            <Plus className="size-3" /> Add
                          </button>
                        </div>

                        {/* Treatments / Effects */}
                        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                          <input 
                            value={bowtieConfig.parameterLabel || "Treatments / Effects"} 
                            onChange={(e) => setBowtieConfig({ ...bowtieConfig, parameterLabel: e.target.value })} 
                            className="w-full text-center text-xs font-bold uppercase text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none transition-colors pb-1"
                            placeholder="Treatments / Effects Heading"
                          />
                          {bowtieConfig.parameters.map((item: any, i: number) => (
                            <div key={i} className={cn("flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm transition-colors", item.isCorrect ? "border-success/50 ring-1 ring-success/20" : "border-border")}>
                              <textarea value={item.text} onChange={(e) => { 
                                const n = [...bowtieConfig.parameters]; n[i] = { ...n[i], text: e.target.value }; setBowtieConfig({ ...bowtieConfig, parameters: n }); 
                                e.target.style.height = '0px'; e.target.style.height = `${e.target.scrollHeight}px`;
                              }} rows={1} className="flex-1 bg-transparent text-sm outline-none px-1 min-w-0 resize-none overflow-hidden py-1 min-h-[28px]" placeholder={`Option ${i + 1}`} />
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
              ) : type === "next-gen-cloze" ? (
                <Section title="Cloze Configuration" desc="Define the options and correct answer for each dropdown (e.g., {dropdown 1}, {dropdown 2}) in the stem.">
                  <div className="space-y-6">
                    {Object.entries(clozeBlanks).map(([id, blank]) => (
                      <div key={id} className="rounded-xl border border-border bg-muted/20 p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="font-bold text-foreground">Dropdown {id}</h4>
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
                                  setClozeBlanks({ ...clozeBlanks, [id]: { ...blank, options: newOptions, correct: (blank.correct === opt && opt !== "") ? e.target.value : blank.correct } });
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


                    <div className="pt-6 border-t border-border mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-foreground">Inter-Blank Dependencies (Optional)</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-6">Create rules for multi-part dropdowns. For example, make Dropdown 2's options depend on the student's answer for Dropdown 1.</p>

                      <div className="space-y-6">
                        {clozeDependencies.map((dep, dIdx) => (
                          <div key={dIdx} className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="bg-muted/40 p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <span className="text-sm font-semibold text-foreground whitespace-nowrap">Source Dropdown:</span>
                                <select
                                  value={dep.sourceBlankId}
                                  onChange={(e) => {
                                    const newD = [...clozeDependencies];
                                    newD[dIdx].sourceBlankId = e.target.value;
                                    setClozeDependencies(newD);
                                  }}
                                  className="rounded-lg border border-border px-3 py-1.5 text-sm bg-background font-semibold"
                                >
                                  <option value="" disabled>Select source dropdown</option>
                                  {Object.keys(clozeBlanks).map(bId => <option key={bId} value={bId} disabled={bId === dep.targetBlankId}>Dropdown {bId}</option>)}
                                </select>
                                <span className="text-sm font-semibold text-foreground whitespace-nowrap">Target Dropdown:</span>
                                <select
                                  value={dep.targetBlankId}
                                  onChange={(e) => {
                                    const newD = [...clozeDependencies];
                                    newD[dIdx].targetBlankId = e.target.value;
                                    setClozeDependencies(newD);
                                  }}
                                  className="rounded-lg border border-border px-3 py-1.5 text-sm bg-background font-semibold"
                                >
                                  <option value="" disabled>Select target dropdown</option>
                                  {Object.keys(clozeBlanks).map(bId => <option key={bId} value={bId} disabled={bId === dep.sourceBlankId}>Dropdown {bId}</option>)}
                                </select>
                              </div>
                              <button
                                onClick={() => setClozeDependencies(clozeDependencies.filter((_, idx) => idx !== dIdx))}
                                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition self-end md:self-auto"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                            
                            {dep.sourceBlankId && dep.targetBlankId && (
                              <div className="p-4 space-y-4">
                                <p className="text-sm font-medium text-muted-foreground">For each option in Dropdown {dep.sourceBlankId}, select which options are available in Dropdown {dep.targetBlankId}:</p>
                                
                                {clozeBlanks[dep.sourceBlankId]?.options.filter(Boolean).map(sourceOpt => (
                                  <div key={sourceOpt} className="bg-background rounded-lg border border-border p-3">
                                    <p className="text-sm font-bold text-primary mb-2">If student selects: "{sourceOpt}"</p>
                                    <div className="flex flex-wrap gap-2">
                                      {clozeBlanks[dep.targetBlankId]?.options.filter(Boolean).map(targetOpt => (
                                        <label key={targetOpt} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1.5 pr-3 rounded border border-border transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={dep.mapping[sourceOpt]?.includes(targetOpt) || false}
                                            onChange={(e) => {
                                              const newD = [...clozeDependencies];
                                              const currentMap = newD[dIdx].mapping[sourceOpt] || [];
                                              if (e.target.checked) {
                                                newD[dIdx].mapping = { ...newD[dIdx].mapping, [sourceOpt]: [...currentMap, targetOpt] };
                                              } else {
                                                newD[dIdx].mapping = { ...newD[dIdx].mapping, [sourceOpt]: currentMap.filter(o => o !== targetOpt) };
                                              }
                                              setClozeDependencies(newD);
                                            }}
                                            className="size-3.5 rounded accent-primary"
                                          />
                                          <span>{targetOpt}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        
                        <button
                          onClick={() => setClozeDependencies([...clozeDependencies, { sourceBlankId: "", targetBlankId: "", mapping: {} }])}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-2 text-sm font-medium text-primary hover:bg-muted"
                        >
                          <Plus className="size-4" /> Add Dependency Rule
                        </button>
                      </div>
                    </div>
                  </div>
                </Section>
              ) : type === "table" ? (
                <Section title="Table Configuration" desc="Define rows (findings), columns (options like Improved/Declined), and select the correct answer for each row.">
                  <div className="space-y-8">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="table-multi"
                        checked={tableConfig.multiSelect || false} 
                        onChange={(e) => setTableConfig({ ...tableConfig, multiSelect: e.target.checked, correctAnswers: {} })} 
                        className="size-4 accent-primary cursor-pointer" 
                      />
                      <label htmlFor="table-multi" className="text-sm font-semibold text-foreground cursor-pointer">Allow multiple answers per row (Select All That Apply)</label>
                    </div>
                    {/* Columns */}
                    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                      <h5 className="text-sm font-bold uppercase text-muted-foreground">Columns</h5>
                      <div className="flex flex-wrap gap-3">
                        {tableConfig.columns.map((col: any, i: number) => (
                          <div key={col.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-sm">
                            <input
                              value={col.label}
                              onChange={(e) => {
                                const newCols = [...tableConfig.columns];
                                newCols[i] = { ...newCols[i], label: e.target.value };
                                setTableConfig({ ...tableConfig, columns: newCols });
                              }}
                              className="bg-transparent text-sm outline-none px-1 font-semibold"
                              placeholder={`Column ${i + 1}`}
                            />
                            <button
                              onClick={() => {
                                const newCols = tableConfig.columns.filter((_: any, idx: number) => idx !== i);
                                // Clean up correct answers that used this column
                                const newAnswers = { ...tableConfig.correctAnswers };
                                Object.keys(newAnswers).forEach(rowId => {
                                  if (newAnswers[rowId] === col.id) delete newAnswers[rowId];
                                });
                                setTableConfig({ ...tableConfig, columns: newCols, correctAnswers: newAnswers });
                              }}
                              className="grid size-6 place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setTableConfig({ ...tableConfig, columns: [...tableConfig.columns, { id: `col-${Math.random().toString(36).substring(7)}`, label: "" }] })}
                          className="flex items-center gap-1 rounded-lg border border-dashed border-primary bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                        >
                          <Plus className="size-3" /> Add Column
                        </button>
                      </div>
                    </div>

                    {/* Rows */}
                    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                      <h5 className="text-sm font-bold uppercase text-muted-foreground">Rows & Correct Answers</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr>
                              <th className="p-2 border-b border-border text-muted-foreground w-10"></th>
                              <th className="p-2 border-b border-border text-muted-foreground">Row Text (Finding)</th>
                              {tableConfig.columns.map((col: any) => (
                                <th key={col.id} className="p-2 border-b border-border text-muted-foreground text-center">{col.label || "Unnamed"}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tableConfig.rows.map((row: any, i: number) => (
                              <tr key={row.id}>
                                <td className="p-2 border-b border-border">
                                  <button
                                    onClick={() => {
                                      const newRows = tableConfig.rows.filter((_: any, idx: number) => idx !== i);
                                      const newAnswers = { ...tableConfig.correctAnswers };
                                      delete newAnswers[row.id];
                                      setTableConfig({ ...tableConfig, rows: newRows, correctAnswers: newAnswers });
                                    }}
                                    className="grid size-6 place-items-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </td>
                                <td className="p-2 border-b border-border">
                                  <input
                                    value={row.text}
                                    onChange={(e) => {
                                      const newRows = [...tableConfig.rows];
                                      newRows[i] = { ...newRows[i], text: e.target.value };
                                      setTableConfig({ ...tableConfig, rows: newRows });
                                    }}
                                    className="w-full bg-transparent text-sm outline-none px-2 py-1 border border-transparent focus:border-border rounded"
                                    placeholder="e.g. blood pressure of 97/68 mm Hg"
                                  />
                                </td>
                                {tableConfig.columns.map((col: any) => (
                                  <td key={col.id} className="p-2 border-b border-border text-center">
                                    <input
                                      type={tableConfig.multiSelect ? "checkbox" : "radio"}
                                      name={`correct-${row.id}`}
                                      checked={tableConfig.multiSelect ? (tableConfig.correctAnswers[row.id] || []).includes(col.id) : tableConfig.correctAnswers[row.id] === col.id}
                                      onChange={() => {
                                        if (tableConfig.multiSelect) {
                                          const current = tableConfig.correctAnswers[row.id] || [];
                                          const isSelected = current.includes(col.id);
                                          const newArr = isSelected ? current.filter((id: string) => id !== col.id) : [...current, col.id];
                                          setTableConfig({ ...tableConfig, correctAnswers: { ...tableConfig.correctAnswers, [row.id]: newArr } });
                                        } else {
                                          setTableConfig({ ...tableConfig, correctAnswers: { ...tableConfig.correctAnswers, [row.id]: col.id } });
                                        }
                                      }}
                                      className="size-4 accent-success cursor-pointer"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={() => setTableConfig({ ...tableConfig, rows: [...tableConfig.rows, { id: `row-${Math.random().toString(36).substring(7)}`, text: "" }] })}
                        className="mt-3 flex items-center gap-1 rounded-lg border border-dashed border-primary bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 w-fit"
                      >
                        <Plus className="size-3" /> Add Row
                      </button>
                    </div>
                  </div>
                </Section>
              ) : type === "next-gen-highlight" ? (
                <Section title="Highlight Configuration" desc="Configure a paragraph or table with click-to-highlight findings.">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-semibold text-foreground">Layout Format:</label>
                      <div className="flex items-center rounded-lg border border-border p-1 bg-muted/20">
                        <button
                          onClick={() => setHighlightConfig({...highlightConfig, layout: "paragraph"})}
                          className={cn("px-4 py-1.5 text-xs font-semibold rounded-md transition-colors", highlightConfig.layout === "paragraph" ? "bg-background shadow-sm border border-border" : "text-muted-foreground hover:text-foreground")}
                        >
                          Paragraph
                        </button>
                        <button
                          onClick={() => setHighlightConfig({...highlightConfig, layout: "table"})}
                          className={cn("px-4 py-1.5 text-xs font-semibold rounded-md transition-colors", highlightConfig.layout === "table" ? "bg-background shadow-sm border border-border" : "text-muted-foreground hover:text-foreground")}
                        >
                          Table (EHR)
                        </button>
                      </div>
                    </div>

                    {highlightConfig.layout === "table" ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        {/* Tab Navigation */}
                        <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-1">
                          {(highlightConfig.tables || []).map((t, idx) => (
                            <button
                              key={t.id}
                              onClick={() => setActiveHighlightTab(idx)}
                              className={cn(
                                "px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border border-transparent border-b-0",
                                activeHighlightTab === idx
                                  ? "bg-card border-border text-foreground shadow-[0_2px_0_0_hsl(var(--background))]"
                                  : "text-muted-foreground hover:bg-muted/50"
                              )}
                            >
                              {t.tabName || "Unnamed Tab"}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              const newTables = [...(highlightConfig.tables || [])];
                              newTables.push({ id: `t-${Math.random().toString(36).substring(7)}`, tabName: `Tab ${newTables.length + 1}`, headers: { col1: "Body System", col2: "Findings" }, rows: [] });
                              setHighlightConfig({ ...highlightConfig, tables: newTables });
                              setActiveHighlightTab(newTables.length - 1);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
                          >
                            <Plus className="size-3" /> Add Tab
                          </button>
                        </div>

                        {/* Active Tab Content */}
                        {highlightConfig.tables && highlightConfig.tables[activeHighlightTab] && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-foreground">Editing Tab: {highlightConfig.tables[activeHighlightTab].tabName || "Unnamed Tab"}</h3>
                              <button
                                onClick={() => {
                                  const newTables = highlightConfig.tables!.filter((_, i) => i !== activeHighlightTab);
                                  const deletedRowIds = highlightConfig.tables![activeHighlightTab].rows.flatMap(r => r.sentences.map(s => s.id));
                                  const newC = (highlightConfig.correctHighlights || []).filter(id => !deletedRowIds.includes(id));
                                  setHighlightConfig({ ...highlightConfig, tables: newTables, correctHighlights: newC });
                                  setActiveHighlightTab(Math.max(0, activeHighlightTab - 1));
                                }}
                                className="text-xs font-semibold text-destructive hover:underline flex items-center gap-1"
                              >
                                <Trash2 className="size-3" /> Delete Tab
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Tab Name</label>
                                <input
                                  value={highlightConfig.tables[activeHighlightTab].tabName}
                                  onChange={e => {
                                    const newTables = [...highlightConfig.tables!];
                                    newTables[activeHighlightTab].tabName = e.target.value;
                                    setHighlightConfig({...highlightConfig, tables: newTables});
                                  }}
                                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Column 1 Header</label>
                                <input
                                  value={highlightConfig.tables[activeHighlightTab].headers.col1}
                                  onChange={e => {
                                    const newTables = [...highlightConfig.tables!];
                                    newTables[activeHighlightTab].headers.col1 = e.target.value;
                                    setHighlightConfig({...highlightConfig, tables: newTables});
                                  }}
                                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Column 2 Header</label>
                                <input
                                  value={highlightConfig.tables[activeHighlightTab].headers.col2}
                                  onChange={e => {
                                    const newTables = [...highlightConfig.tables!];
                                    newTables[activeHighlightTab].headers.col2 = e.target.value;
                                    setHighlightConfig({...highlightConfig, tables: newTables});
                                  }}
                                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-foreground">Table Rows</label>
                                <button
                                  onClick={() => {
                                    const newTables = [...highlightConfig.tables!];
                                    newTables[activeHighlightTab].rows.push({ id: `r-${Math.random().toString(36).substring(7)}`, label: "", sentences: [] });
                                    setHighlightConfig({...highlightConfig, tables: newTables});
                                  }}
                                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                                >
                                  <Plus className="size-3" /> Add Row
                                </button>
                              </div>
                              
                              <div className="space-y-4">
                                {(highlightConfig.tables[activeHighlightTab].rows || []).map((row, rIdx) => (
                                  <div key={row.id} className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1 space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground">Row Label</label>
                                        <input
                                          value={row.label}
                                          onChange={e => {
                                            const newTables = [...highlightConfig.tables!];
                                            newTables[activeHighlightTab].rows[rIdx].label = e.target.value;
                                            setHighlightConfig({...highlightConfig, tables: newTables});
                                          }}
                                          placeholder="e.g. Neurological"
                                          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                                        />
                                      </div>
                                      <button
                                        onClick={() => {
                                          const newTables = [...highlightConfig.tables!];
                                          newTables[activeHighlightTab].rows = newTables[activeHighlightTab].rows.filter(r => r.id !== row.id);
                                          const removedSentenceIds = row.sentences.map(s => s.id);
                                          const newC = (highlightConfig.correctHighlights || []).filter(id => !removedSentenceIds.includes(id));
                                          setHighlightConfig({...highlightConfig, tables: newTables, correctHighlights: newC});
                                        }}
                                        className="mt-6 grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                                      >
                                        <Trash2 className="size-4" />
                                      </button>
                                    </div>
                                    
                                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                                      <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-muted-foreground">Findings (Phrases to Highlight)</label>
                                        <button
                                          onClick={() => {
                                            const newTables = [...highlightConfig.tables!];
                                            newTables[activeHighlightTab].rows[rIdx].sentences.push({ id: `s-${Math.random().toString(36).substring(7)}`, text: "" });
                                            setHighlightConfig({...highlightConfig, tables: newTables});
                                          }}
                                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                                        >
                                          <Plus className="size-3" /> Add Phrase
                                        </button>
                                      </div>
                                      <div className="space-y-2">
                                        {row.sentences.map((sentence, sIdx) => (
                                          <div key={sentence.id} className="flex gap-2">
                                            <input
                                              value={sentence.text}
                                              onChange={(e) => {
                                                const newTables = [...highlightConfig.tables!];
                                                newTables[activeHighlightTab].rows[rIdx].sentences[sIdx].text = e.target.value;
                                                setHighlightConfig({...highlightConfig, tables: newTables});
                                              }}
                                              placeholder="e.g. increased confusion"
                                              className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm bg-background"
                                            />
                                            <button
                                              onClick={() => {
                                                const newTables = [...highlightConfig.tables!];
                                                newTables[activeHighlightTab].rows[rIdx].sentences = newTables[activeHighlightTab].rows[rIdx].sentences.filter(s => s.id !== sentence.id);
                                                const newC = (highlightConfig.correctHighlights || []).filter(id => id !== sentence.id);
                                                setHighlightConfig({...highlightConfig, tables: newTables, correctHighlights: newC});
                                              }}
                                              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                                            >
                                              <X className="size-3" weight="bold" />
                                            </button>
                                          </div>
                                        ))}
                                        {row.sentences.length === 0 && (
                                          <div className="text-xs text-muted-foreground py-2 italic">No phrases added.</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {(!highlightConfig.tables[activeHighlightTab].rows || highlightConfig.tables[activeHighlightTab].rows.length === 0) && (
                                  <div className="text-center text-sm text-muted-foreground py-4 border border-dashed border-border rounded-xl">No rows added.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {(!highlightConfig.tables || highlightConfig.tables.length === 0) && (
                           <div className="text-center text-sm text-muted-foreground py-8 border border-dashed border-border rounded-xl">No tabs added. Click "Add Tab" above.</div>
                        )}

                        {highlightConfig.tables && highlightConfig.tables.some(t => t.rows.some(r => r.sentences.length > 0)) && (
                          <div className="space-y-2 pt-6 mt-6 border-t border-border">
                            <label className="text-sm font-semibold text-foreground">Select Correct Highlights (Across all tabs)</label>
                            <p className="text-xs text-muted-foreground">Click the findings below that the student should highlight. You can select findings from any tab.</p>
                            
                            {highlightConfig.tables.map(table => table.rows.some(r => r.sentences.length > 0) && (
                              <div key={table.id} className="mt-4">
                                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{table.tabName || "Unnamed Tab"}</div>
                                <div className="rounded-xl border border-border overflow-hidden">
                                  <table className="w-full text-left text-[14px]">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                      <tr>
                                        <th className="p-3 font-semibold w-1/3">{table.headers?.col1 || "Body System"}</th>
                                        <th className="p-3 font-semibold">{table.headers?.col2 || "Findings"}</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                      {table.rows.map(row => (
                                        <tr key={row.id}>
                                          <td className="p-3 font-medium text-foreground">{row.label}</td>
                                          <td className="p-3 leading-relaxed">
                                            {row.sentences.map((sentence, i) => {
                                              const isCorrect = (highlightConfig.correctHighlights || []).includes(sentence.id);
                                              return (
                                                <span key={sentence.id}>
                                                  <span
                                                    onClick={() => {
                                                      const current = highlightConfig.correctHighlights || [];
                                                      const newC = isCorrect ? current.filter(id => id !== sentence.id) : [...current, sentence.id];
                                                      setHighlightConfig({...highlightConfig, correctHighlights: newC});
                                                    }}
                                                    className={cn(
                                                      "px-1 py-0.5 rounded cursor-pointer transition-colors",
                                                      isCorrect ? "bg-success/20 text-success-foreground border-b-2 border-success font-semibold" : "hover:bg-muted"
                                                    )}
                                                  >
                                                    {sentence.text || "[Empty]"}
                                                  </span>
                                                  {i < row.sentences.length - 1 && " "}
                                                </span>
                                              );
                                            })}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-foreground">Sentences</label>
                            <button
                              onClick={() => setHighlightConfig({...highlightConfig, sentences: [...(highlightConfig.sentences || []), { id: `s-${Math.random().toString(36).substring(7)}`, text: "" }]})}
                              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                            >
                              <Plus className="size-3" /> Add Sentence
                            </button>
                          </div>
                          <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border">
                            {highlightConfig.sentences?.map((sentence, i) => (
                              <div key={sentence.id} className="flex gap-2">
                                <input
                                  value={sentence.text}
                                  onChange={(e) => {
                                    const newS = [...highlightConfig.sentences];
                                    newS[i].text = e.target.value;
                                    setHighlightConfig({...highlightConfig, sentences: newS});
                                  }}
                                  placeholder="e.g. The patient reported a pain level of 8/10."
                                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm bg-background"
                                />
                                <button
                                  onClick={() => {
                                    const newS = highlightConfig.sentences.filter(s => s.id !== sentence.id);
                                    const newC = (highlightConfig.correctHighlights || []).filter(id => id !== sentence.id);
                                    setHighlightConfig({...highlightConfig, sentences: newS, correctHighlights: newC});
                                  }}
                                  className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            ))}
                            {(!highlightConfig.sentences || highlightConfig.sentences.length === 0) && (
                              <div className="text-center text-sm text-muted-foreground py-4 border border-dashed border-border rounded-xl bg-background">No sentences added.</div>
                            )}
                          </div>
                        </div>
                        {highlightConfig.sentences && highlightConfig.sentences.length > 0 && (
                          <div className="space-y-2 pt-4 border-t border-border">
                            <label className="text-sm font-semibold text-foreground">Select Correct Highlights</label>
                            <p className="text-xs text-muted-foreground">Click the sentences below that the student should highlight.</p>
                            <div className="bg-card p-4 rounded-xl border border-border leading-relaxed text-[14px]">
                              {highlightConfig.sentences.map(sentence => {
                                const isCorrect = (highlightConfig.correctHighlights || []).includes(sentence.id);
                                return (
                                  <span
                                    key={sentence.id}
                                    onClick={() => {
                                      const current = highlightConfig.correctHighlights || [];
                                      const newC = isCorrect ? current.filter(id => id !== sentence.id) : [...current, sentence.id];
                                      setHighlightConfig({...highlightConfig, correctHighlights: newC});
                                    }}
                                    className={cn(
                                      "px-1 py-0.5 mx-0.5 rounded cursor-pointer transition-colors",
                                      isCorrect ? "bg-success/20 text-success-foreground border-b-2 border-success font-semibold" : "hover:bg-muted"
                                    )}
                                  >
                                    {sentence.text || "[Empty Sentence]"}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Section>
              ) : null}

              <Section
                title="Scenario Tabs (Optional)"
                desc="Add contextual tabs (like Patient Info, Vitals) to display alongside this question."
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Enable Scenario Tabs</h4>
                      <p className="text-xs text-muted-foreground">This will show a split-pane layout with the tabs on the left.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" checked={includeTabs} onChange={(e) => setIncludeTabs(e.target.checked)} />
                      <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                    </label>
                  </div>
                  
                  {includeTabs && (
                    <div className="space-y-2">
                      {tabs.map((t, i) => (
                        <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-background p-2 pl-4">
                          <div className="flex items-center gap-2">
                            <Layers2 className="size-4 text-muted-foreground" />
                            <input
                              value={t.title}
                              onChange={(e) => setTabs(tabs.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))}
                              className="flex-1 bg-transparent text-sm outline-none font-bold"
                              placeholder="Tab Title (e.g. Vitals)"
                            />
                            <select
                              value={t.type || "text"}
                              onChange={(e) => setTabs(tabs.map((x, idx) => (idx === i ? { ...x, type: e.target.value as "text" | "table", tableHeaders: x.tableHeaders || ["Body System", "Findings"], tableRows: x.tableRows || [] } : x)))}
                              className="bg-muted text-xs font-semibold text-muted-foreground outline-none border border-border rounded-md px-2 py-1.5"
                            >
                              <option value="text">Rich Text</option>
                              <option value="table">Table (EHR)</option>
                            </select>
                            <button onClick={() => setTabs(tabs.filter((_, idx) => idx !== i))} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                          {(!t.type || t.type === "text") ? (
                            <RichTextEditor
                              value={t.content}
                              onChange={(content) => setTabs(tabs.map((x, idx) => (idx === i ? { ...x, content } : x)))}
                            />
                          ) : (
                            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                              <div className="flex gap-2 overflow-x-auto pb-2">
                                {t.tableHeaders?.map((header, hIdx) => (
                                  <div key={hIdx} className="flex-1 min-w-[150px] space-y-1 relative group">
                                    <label className="text-xs font-semibold text-muted-foreground flex justify-between">
                                      Column {hIdx + 1}
                                      {t.tableHeaders!.length > 1 && (
                                        <button 
                                          onClick={() => setTabs(tabs.map((x, idx) => idx === i ? {
                                            ...x, 
                                            tableHeaders: x.tableHeaders!.filter((_, idx2) => idx2 !== hIdx),
                                            tableRows: x.tableRows?.map(r => ({ ...r, cells: r.cells.filter((_, idx2) => idx2 !== hIdx) }))
                                          } : x))}
                                          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                                        >
                                          <X className="size-3" />
                                        </button>
                                      )}
                                    </label>
                                    <Input 
                                      value={header} 
                                      onChange={(e) => setTabs(tabs.map((x, idx) => idx === i ? { ...x, tableHeaders: x.tableHeaders!.map((h, idx2) => idx2 === hIdx ? e.target.value : h) } : x))}
                                      placeholder="Header name" 
                                    />
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  className="mt-5 shrink-0"
                                  onClick={() => setTabs(tabs.map((x, idx) => idx === i ? {
                                    ...x,
                                    tableHeaders: [...(x.tableHeaders || []), `Column ${(x.tableHeaders?.length || 0) + 1}`],
                                    tableRows: x.tableRows?.map(r => ({ ...r, cells: [...r.cells, ""] }))
                                  } : x))}
                                >
                                  <Plus className="size-4" />
                                </Button>
                              </div>
                              
                              <div className="space-y-2">
                                {t.tableRows?.map((row, rIndex) => (
                                  <div key={row.id} className="flex gap-2 items-start">
                                    <div className="flex-1 flex gap-2 overflow-x-auto">
                                      {row.cells.map((cell, cIdx) => (
                                        <Input 
                                          key={cIdx}
                                          value={cell} 
                                          onChange={(e) => setTabs(tabs.map((x, idx) => idx === i ? { 
                                            ...x, 
                                            tableRows: x.tableRows?.map(r => r.id === row.id ? { ...r, cells: r.cells.map((c, idx2) => idx2 === cIdx ? e.target.value : c) } : r) 
                                          } : x))}
                                          className={cn("min-w-[150px] flex-1", cIdx === 0 && "font-bold bg-muted/50")}
                                          placeholder={`Row ${rIndex + 1}, Col ${cIdx + 1}`} 
                                        />
                                      ))}
                                    </div>
                                    <button onClick={() => setTabs(tabs.map((x, idx) => idx === i ? { ...x, tableRows: x.tableRows?.filter(r => r.id !== row.id) } : x))} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive shrink-0 border border-border">
                                      <Trash2 className="size-4" />
                                    </button>
                                  </div>
                                ))}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full text-xs" 
                                  onClick={() => setTabs(tabs.map((x, idx) => idx === i ? { ...x, tableRows: [...(x.tableRows || []), { id: Math.random().toString(36).substring(7), cells: Array(x.tableHeaders?.length || 2).fill("") }] } : x))}
                                >
                                  <Plus className="size-3 mr-1" /> Add Row
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {tabs.length < 4 && (
                        <button onClick={() => setTabs([...tabs, { title: "New Tab", content: "" }])} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-3 text-sm font-medium text-primary hover:bg-muted">
                          <Plus className="size-4" weight="regular" /> Add Tab
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Explanation & Rationale" desc="Provide evidence-based reasoning with images">
                <RichTextEditor
                  value={rationale}
                  onChange={setRationale}
                />
              </Section>
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <Section title="Preview" desc="Exactly what students will see">
                <div className="rounded-2xl border border-border bg-background p-6">
                  <div className="mb-3 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">{group === "grouped" ? "Grouped" : "Ungrouped"}</span>
                    <span className="rounded-full bg-info/15 px-2.5 py-1 font-semibold text-info-foreground">{type === "bowtie" ? "BOW-TIE" : type.replace(/-/g, " ").toUpperCase()}</span>
                    <span className="text-muted-foreground">{category} • {subcategory}</span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: type === "next-gen-cloze" ? stem.replace(/{(?:dropdown\s+)?[0-9]+}/g, "_________") : stem }} />
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
                    ) : type === "next-gen-cloze" ? (
                      <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
                        <div className="font-semibold text-primary mb-2">Fill in the Blank Configured</div>
                        <p className="text-muted-foreground">Configured Blanks: {Object.keys(clozeBlanks).length}</p>
                      </div>
                    ) : type === "next-gen-highlight" && (
                      <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
                        <div className="font-semibold text-primary mb-2">Click to Highlight Configured</div>
                        <p className="text-muted-foreground">Layout: <span className="capitalize">{highlightConfig.layout || "paragraph"}</span> | Sentences/Phrases: {highlightConfig.layout === "table" ? (highlightConfig.tables || []).reduce((acc, t) => acc + t.rows.reduce((rAcc, r) => rAcc + r.sentences.length, 0), 0) : highlightConfig.sentences?.length || 0} | Correct Highlights: {highlightConfig.correctHighlights?.length || 0}</p>
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
                      ? ["Cloze dropdowns configured", (() => {
                          const textContent = stem.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
                          const matches = Array.from(textContent.matchAll(/{(?:dropdown\s+)?([0-9]+)}/g));
                          const idsInText = new Set(matches.map(m => m[1]));
                          return Object.values(clozeBlanks).every(b => b.correct !== "" && b.options.every(o => o.trim() !== "")) && 
                                 matches.length > 0 && 
                                 Object.keys(clozeBlanks).length === idsInText.size &&
                                 Object.keys(clozeBlanks).every(id => idsInText.has(id));
                        })()]
                      : type === "next-gen-highlight"
                      ? ["Highlight configured", highlightConfig.layout === "table" ? (highlightConfig.tables?.length > 0 && highlightConfig.correctHighlights?.length > 0 && highlightConfig.tables.every(t => !isEmpty(t.tabName) && t.rows.length > 0 && !t.rows.some(r => isEmpty(r.label) || r.sentences.some(s => isEmpty(s.text))))) : (highlightConfig.sentences?.length > 0 && highlightConfig.correctHighlights?.length > 0 && !highlightConfig.sentences.some(s => isEmpty(s.text)))]
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
                    if (group !== "grouped" && isEmpty(stem)) {
                      toast.error("Question stem cannot be blank.");
                      return;
                    }
                    if (group !== "grouped") {
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
                        const correctConditions = conditions.filter((c: any) => c.isCorrect);
                        if (correctConditions.length !== 1) {
                          toast.error("There must be exactly 1 correct Potential Condition (cannot be empty).");
                          return;
                        }
                        if (!actions.some((a: any) => a.isCorrect) || !parameters.some((p: any) => p.isCorrect)) {
                          toast.error("Please mark at least one correct Action and one correct Parameter (cannot be empty).");
                          return;
                        }
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
        <aside className="flex flex-col gap-5 lg:sticky lg:top-8 h-[calc(100vh-4rem)]">
          <Section title="Preview Summary" desc={undefined}>
            <dl className="space-y-3 text-sm">
              {[
                ["Group", group === "grouped" ? "Grouped" : "Ungrouped"],
                ["Type", type === "next-gen-cloze" ? "Next-Gen/Fill in the Blank" : type === "bowtie" ? "Next-Gen/Bow-tie" : type.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())],
                ["Marking", marking === "zero-one" ? "Zero-One" : "Plus / Minus"],
                ["Category", category],
                ["Subcategory", subcategory],
                ["Difficulty", difficulty],
                ["Time est.", `${timeEst} sec`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-dashed border-border pb-2 last:border-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className={cn("font-semibold", k !== "Type" && "capitalize")}>{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <div className="mt-auto">
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
          </div>
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
    <UISelect value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="w-full rounded-xl border border-border bg-background px-4 py-5 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-none h-11">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border">
        {options.map((o) => (
          <SelectItem key={o} value={o} className="cursor-pointer rounded-lg py-2">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </UISelect>
  );
}

