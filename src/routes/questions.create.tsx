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
  Eye,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

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
  const [previewSubIndex, setPreviewSubIndex] = useState(0);
  const [previewTabIdx, setPreviewTabIdx] = useState(0);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
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
  const [parentStem, setParentStem] = useState("");
  const [parentTabs, setParentTabs] = useState<ScenarioTab[]>([
    { title: "", type: "text", content: "" }
  ]);
  const [parentIncludeTabs, setParentIncludeTabs] = useState(false);
  
  const [tabs, setTabs] = useState<ScenarioTab[]>([
    { title: "", type: "text", content: "" }
  ]);
  const [includeTabs, setIncludeTabs] = useState(false);

  const switchSubQuestion = (newIndex: number, overrideSubs?: any[]) => {
    let updatedSubs = overrideSubs ? [...overrideSubs] : [...subQuestions];
    
    if (activeSubIndex >= 0 && activeSubIndex < (overrideSubs ? overrideSubs.length - 1 : updatedSubs.length)) {
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
    } else if (activeSubIndex === -1) {
      setParentStem(stem);
      setParentTabs(tabs);
      setParentIncludeTabs(includeTabs);
    }

    if (newIndex >= 0) {
      let targetSub = updatedSubs[newIndex];
      if (!targetSub) {
        targetSub = { id: Math.random().toString(36).substring(7), type: "mcq-single" };
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
      setStem(parentStem);
      setTabs(parentTabs);
      setIncludeTabs(parentIncludeTabs);
      setType("mcq-single");
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
          
          const pStem = qData.stem || "";
          let pTabs = [
            { title: "Patient Information", type: "text" as const, content: "" },
            { title: "Vitals", type: "text" as const, content: "" },
            { title: "Current Medications", type: "text" as const, content: "" }
          ];
          let pInclude = false;
          if (qData.options?.scenario_tabs && qData.options.scenario_tabs.length > 0) {
             pTabs = migrateScenarioTabs(qData.options.scenario_tabs);
             pInclude = true;
          }
          setParentStem(pStem);
          setParentTabs(pTabs);
          setParentIncludeTabs(pInclude);
          
          if (qData.group_type === "grouped") {
            setStem(pStem);
            setTabs(pTabs);
            setIncludeTabs(pInclude);
            setActiveSubIndex(-1);
          } else {
            setStem(pStem);
            setTabs(pTabs);
            setIncludeTabs(pInclude);
          }
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
          { title: "", type: "text", content: "" }
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

  const validateItem = (item: any, prefix = ""): boolean => {
    const stripHtml = (html: string) => {
      const tmp = document.createElement("DIV");
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || "";
    };

    const hasImage = (html: string) => html?.includes("<img");

    const isEmpty = (html: string) => {
      if (!html) return true;
      if (hasImage(html)) return false;
      return stripHtml(html).trim() === "";
    };

    if (isEmpty(item.stem)) {
      toast.error(`${prefix}Question stem cannot be blank.`);
      return false;
    }

    if (item.type.startsWith("mcq")) {
      if (item.options?.some((opt: any) => isEmpty(opt.text))) {
        toast.error(`${prefix}All answer options must be filled.`);
        return false;
      }
      const texts = item.options?.map((o: any) => o.text.trim().toLowerCase()) || [];
      if (new Set(texts).size !== texts.length) {
        toast.error(`${prefix}Duplicate answer options are not allowed.`);
        return false;
      }
      if (!item.options?.some((opt: any) => opt.correct)) {
        toast.error(`${prefix}Please mark at least one correct answer.`);
        return false;
      }
    } else if (item.type === "bowtie") {
      const actions = item.bowtieConfig?.actions?.filter((a: any) => !isEmpty(a.text)) || [];
      const conditions = item.bowtieConfig?.conditions?.filter((c: any) => !isEmpty(c.text)) || [];
      const parameters = item.bowtieConfig?.parameters?.filter((p: any) => !isEmpty(p.text)) || [];
      
      const allTexts = [...actions, ...conditions, ...parameters].map(x => x.text.trim().toLowerCase());
      if (new Set(allTexts).size !== allTexts.length) {
        toast.error(`${prefix}Duplicate options are not allowed across Bow-Tie columns.`);
        return false;
      }

      if (actions.length < 2 || conditions.length < 1 || parameters.length < 2) {
        toast.error(`${prefix}Please fill in at least 2 Causes/Treatments and 1 Core Condition.`);
        return false;
      }
      const correctConditions = conditions.filter((c: any) => c.isCorrect);
      if (correctConditions.length !== 1) {
        toast.error(`${prefix}There must be exactly 1 correct Potential Condition (cannot be empty).`);
        return false;
      }
      if (!actions.some((a: any) => a.isCorrect) || !parameters.some((p: any) => p.isCorrect)) {
        toast.error(`${prefix}Please mark at least one correct Action and one correct Parameter (cannot be empty).`);
        return false;
      }
    } else if (item.type === "table") {
      const rows = item.tableConfig?.rows || [];
      const columns = item.tableConfig?.columns || [];
      if (rows.length === 0 || columns.length === 0) {
        toast.error(`${prefix}Table requires at least one row and one column.`);
        return false;
      }
      if (rows.some((r: any) => isEmpty(r.text))) {
        toast.error(`${prefix}Table rows (Assessment Findings) cannot be empty.`);
        return false;
      }
      if (columns.some((c: any) => isEmpty(c.label))) {
        toast.error(`${prefix}Table column headers cannot be empty.`);
        return false;
      }
      if (Object.keys(item.tableConfig?.correctAnswers || {}).length !== rows.length) {
        toast.error(`${prefix}Please provide a correct answer for every row in the table.`);
        return false;
      }
    } else if (item.type === "next-gen-cloze") {
      const match = item.stem?.match(/{(?:dropdown\s+)?[0-9]+}/g);
      if (!match) {
        toast.error(`${prefix}You must have at least one blank placeholder (e.g. {dropdown 1}) in the stem.`);
        return false;
      }
      
      const blankIds = match.map((m: string) => m.replace(/[^0-9]/g, ''));
      for (const id of blankIds) {
        const blank = item.clozeBlanks?.[id];
        if (!blank) {
          toast.error(`${prefix}Dropdown {${id}} is in the text but missing from configuration.`);
          return false;
        }
        if (blank.options?.some((o: string) => !o.trim())) {
          toast.error(`${prefix}Dropdown {${id}} has empty options.`);
          return false;
        }
        const texts = blank.options?.map((o: string) => o.trim().toLowerCase()) || [];
        if (new Set(texts).size !== texts.length) {
          toast.error(`${prefix}Dropdown {${id}} contains duplicate options.`);
          return false;
        }
        if (!blank.correct) {
          toast.error(`${prefix}Please select a correct answer for dropdown {${id}}.`);
          return false;
        }
      }
      if (item.clozeDependencies && item.clozeDependencies.length > 0) {
        for (const dep of item.clozeDependencies) {
          if (!dep.sourceBlankId || !dep.targetBlankId) {
            toast.error(`${prefix}Please select a source and target blank for all dependency rules.`);
            return false;
          }
          if (dep.sourceBlankId === dep.targetBlankId) {
            toast.error(`${prefix}Dropdown {${dep.sourceBlankId}} cannot depend on itself.`);
            return false;
          }
          if (Object.keys(dep.mapping || {}).length === 0) {
            toast.error(`${prefix}Please map at least one option for the dependency between Dropdown {${dep.sourceBlankId}} and Dropdown {${dep.targetBlankId}}.`);
            return false;
          }
        }
      }
    } else if (item.type === "next-gen-highlight") {
      if (item.highlightConfig?.layout === "table") {
        if (!item.highlightConfig.tables || item.highlightConfig.tables.length === 0) {
          toast.error(`${prefix}You must add at least one table tab.`);
          return false;
        }
        for (const table of item.highlightConfig.tables) {
          const isEmptyString = (str: string) => (!str || str.trim() === "");
          if (isEmptyString(table.tabName)) {
            toast.error(`${prefix}Table tab names cannot be empty.`);
            return false;
          }
          if (isEmptyString(table.headers?.col1) || isEmptyString(table.headers?.col2)) {
            toast.error(`${prefix}Table column headers cannot be empty in tab: ${table.tabName}`);
            return false;
          }
          if (!table.rows || table.rows.length === 0) {
            toast.error(`${prefix}You must add at least one row to table tab: ${table.tabName}`);
            return false;
          }
          if (table.rows.some((r: any) => isEmptyString(r.label) || r.sentences?.some((s: any) => isEmptyString(s.text)))) {
            toast.error(`${prefix}Table rows and sentences cannot be empty in tab: ${table.tabName}`);
            return false;
          }
        }
      } else {
        if (!item.highlightConfig?.sentences || item.highlightConfig.sentences.filter((s: any) => s.isClickable !== false).length === 0) {
          toast.error(`${prefix}You must add at least one clickable phrase to highlight using brackets [].`);
          return false;
        }
        const isEmptyString = (str: string) => (!str || str.trim() === "");
        if (item.highlightConfig.sentences.filter((s: any) => s.isClickable !== false).some((s: any) => isEmptyString(s.text))) {
          toast.error(`${prefix}Highlight phrases cannot be empty.`);
          return false;
        }
      }
      if (!item.highlightConfig?.correctHighlights || item.highlightConfig.correctHighlights.length === 0) {
        toast.error(`${prefix}You must select at least one correct sentence to highlight.`);
        return false;
      }
    }
    
    if (isEmpty(item.rationale)) {
      toast.error(`${prefix}Rationale cannot be blank.`);
      return false;
    }
    
    return true;
  };

  const handlePublish = async (status: "published" | "draft") => {
    let itemsToValidate = [];
    if (group === "grouped") {
      const currentSubs = [...subQuestions];
      if (activeSubIndex >= 0 && currentSubs[activeSubIndex]) {
        currentSubs[activeSubIndex] = {
          ...currentSubs[activeSubIndex],
          type, stem, options, bowtieConfig, tableConfig, clozeBlanks, clozeDependencies, highlightConfig, rationale
        };
      }
      itemsToValidate = currentSubs;
      if (itemsToValidate.length === 0) {
         toast.error("Grouped questions must have at least one item.");
         return;
      }
      const stripHtml = (html: string) => { const tmp = document.createElement("DIV"); tmp.innerHTML = html; return tmp.textContent || tmp.innerText || ""; };
      const hasImage = (html: string) => html?.includes("<img");
      const isEmpty = (html: string) => { if (!html) return true; if (hasImage(html)) return false; return stripHtml(html).trim() === ""; };
      
      const currentParentStem = activeSubIndex === -1 ? stem : parentStem;
      if (isEmpty(currentParentStem)) {
        toast.error("Common Case Scenario cannot be blank.");
        return;
      }
      if (parentIncludeTabs) {
        if (parentTabs.some((t: any) => t.title.trim() === "")) {
          toast.error("Grouped question Scenario Tab titles cannot be blank.");
          return;
        }
        if (parentTabs.some((t: any) => t.type === "table" ? (!t.tableRows || t.tableRows.length === 0) : isEmpty(t.content))) {
          toast.error("Grouped question Scenario Tab content cannot be blank.");
          return;
        }
      }
    } else {
      itemsToValidate = [{ type, stem, options, bowtieConfig, tableConfig, clozeBlanks, clozeDependencies, highlightConfig, rationale }];
      const stripHtml = (html: string) => { const tmp = document.createElement("DIV"); tmp.innerHTML = html; return tmp.textContent || tmp.innerText || ""; };
      const hasImage = (html: string) => html?.includes("<img");
      const isEmpty = (html: string) => { if (!html) return true; if (hasImage(html)) return false; return stripHtml(html).trim() === ""; };
      
      if (includeTabs) {
        if (tabs.some((t: any) => t.title.trim() === "")) {
          toast.error("Scenario Tab titles cannot be blank.");
          return;
        }
        if (tabs.some((t: any) => t.type === "table" ? (!t.tableRows || t.tableRows.length === 0) : isEmpty(t.content))) {
          toast.error("Scenario Tab content cannot be blank.");
          return;
        }
      }
    }

    for (let i = 0; i < itemsToValidate.length; i++) {
       const prefix = group === "grouped" ? `Item ${i + 1}: ` : "";
       if (!validateItem(itemsToValidate[i], prefix)) {
          return;
       }
    }

    setIsPublishing(true);
    try {
      let finalOptions: any = null;
      if (group === "grouped") {
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
        } else if (activeSubIndex === -1) {
          setParentStem(stem);
          setParentTabs(tabs);
          setParentIncludeTabs(includeTabs);
        }
        finalOptions = { subQuestions: currentSubs };
        if (activeSubIndex === -1 ? includeTabs : parentIncludeTabs) {
          finalOptions.scenario_tabs = activeSubIndex === -1 ? tabs : parentTabs;
        }
      } else if (type === "bowtie") finalOptions = bowtieConfig;
      else if (type === "table") finalOptions = tableConfig;
      else if (type === "next-gen-cloze") finalOptions = { blanks: clozeBlanks, clozeDependencies };
      else if (type === "next-gen-highlight") finalOptions = highlightConfig;
      else if (type.startsWith("mcq")) finalOptions = options;

      if (group !== "grouped" && includeTabs) {
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
        stem: group === "grouped" ? (activeSubIndex === -1 ? stem : parentStem) : stem,
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

  const handleTypeChange = (newType: string) => {
    if (newType === 'mcq-single' && type === 'mcq-multi') {
      let foundCorrect = false;
      const newOptions = options.map(opt => {
        if (opt.correct) {
          if (!foundCorrect) {
            foundCorrect = true;
            return opt;
          }
          return { ...opt, correct: false };
        }
        return opt;
      });
      setOptions(newOptions);
    }
    setType(newType);
  };

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
                      <SegBtn disabled={!!editId} active={group === "ungrouped"} onClick={() => setGroup("ungrouped")}>Ungrouped</SegBtn>
                      <SegBtn disabled={!!editId} active={group === "grouped"} onClick={() => { setGroup("grouped"); switchSubQuestion(0); }}>Grouped</SegBtn>
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
                      placeholder="Select Category"
                      onChange={(v) => {
                        setCategory(v);
                        const c = dbCategories.find((x) => x.name === v);
                        if (c) setSubcategory(c.subcategories[0]);
                      }}
                      options={dbCategories.map((c) => c.name)}
                    />
                  </Field>
                  <Field label="Subcategory">
                    <Select value={subcategory} placeholder="Select Subcategory" onChange={setSubcategory} options={cat?.subcategories || []} />
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
                          onClick={() => handleTypeChange(t.id)}
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
                            onClick={() => { if (isEnabled) handleTypeChange(t.id); }}
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
                <>
                  <Section title="Common Case Scenario" desc="This stem applies to all items in this group.">
                    <div className={cn("rounded-xl border transition-colors", isEmpty(parentStem) ? "border-destructive ring-1 ring-destructive/20" : "border-transparent")}>
                      <RichTextEditor value={parentStem} onChange={setParentStem} />
                    </div>
                  </Section>
                  
                  <ScenarioTabsEditor 
                    includeTabs={parentIncludeTabs} 
                    setIncludeTabs={setParentIncludeTabs} 
                    tabs={parentTabs} 
                    setTabs={setParentTabs} 
                  />

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
                </>
              )}


              
              {(group === "ungrouped" || (group === "grouped" && activeSubIndex >= 0)) && (
                <>
                  {group === "grouped" && activeSubIndex >= 0 && (
                    <Section title="Question Type" desc="Select format for this sub-question.">
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary-foreground">Traditional</div>
                          <div className="flex flex-wrap gap-2">
                            {questionTypes.traditional.map((t) => (
                              <Pill key={t.id} active={type === t.id} onClick={() => handleTypeChange(t.id)}>{t.name}</Pill>
                            ))}
                          </div>
                        </div>
                        <div className="relative rounded-xl p-2 -m-2">
                          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-info/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-info-foreground">Next Generation</div>
                          <div className="flex flex-wrap gap-2">
                            {questionTypes.ngn.map((t) => {
                              const isEnabled = t.id === "bowtie" || t.id === "next-gen-cloze" || t.id === "table" || t.id === "next-gen-highlight";
                              return (
                                <Pill key={t.id} active={type === t.id} onClick={() => { if (isEnabled) handleTypeChange(t.id); }}>
                                  <span className={cn(!isEnabled && "opacity-50 pointer-events-none")}>{t.name}</span>
                                </Pill>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Section>
                  )}
                  <Section title={group === "grouped" ? "Question Stem (Item Specific)" : "Question Stem"}>
                    <div className={cn("rounded-xl border transition-colors", isEmpty(stem) ? "border-destructive ring-1 ring-destructive/20" : "border-transparent")}>
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
              </div>
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
                          placeholder={`Option ${o.letter}`}
                          className={cn("flex-1 bg-transparent text-sm outline-none px-2 py-1 rounded border transition-colors", o.text.trim() === "" ? "border-destructive" : "border-transparent")}
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
                            className={cn("w-full text-center text-xs font-bold uppercase text-muted-foreground bg-transparent border-b hover:border-border focus:border-primary outline-none transition-colors pb-1", (bowtieConfig.actionLabel ?? "").trim() === "" ? "border-destructive" : "border-transparent")}
                          />
                          {bowtieConfig.actions.map((item: any, i: number) => (
                            <div key={i} className={cn("flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm transition-colors", item.isCorrect ? "border-success/50 ring-1 ring-success/20" : item.text.trim() === "" ? "border-destructive ring-1 ring-destructive/20" : "border-border")}>
                              <textarea value={item.text} onChange={(e) => { 
                                const n = [...bowtieConfig.actions]; n[i] = { ...n[i], text: e.target.value }; setBowtieConfig({ ...bowtieConfig, actions: n }); 
                                e.target.style.height = '0px'; e.target.style.height = `${e.target.scrollHeight}px`;
                              }} rows={1} className="flex-1 bg-transparent text-sm outline-none px-1 min-w-0 resize-none overflow-hidden py-1 min-h-[28px]" />
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
                            className={cn("w-full text-center text-xs font-bold uppercase text-muted-foreground bg-transparent border-b hover:border-border focus:border-primary outline-none transition-colors pb-1", (bowtieConfig.conditionLabel ?? "").trim() === "" ? "border-destructive" : "border-transparent")}
                          />
                          {bowtieConfig.conditions.map((item: any, i: number) => (
                            <div key={i} className={cn("flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm transition-colors", item.isCorrect ? "border-success/50 ring-1 ring-success/20" : item.text.trim() === "" ? "border-destructive ring-1 ring-destructive/20" : "border-border")}>
                              <textarea value={item.text} onChange={(e) => { 
                                const n = [...bowtieConfig.conditions]; n[i] = { ...n[i], text: e.target.value }; setBowtieConfig({ ...bowtieConfig, conditions: n }); 
                                e.target.style.height = '0px'; e.target.style.height = `${e.target.scrollHeight}px`;
                              }} rows={1} className="flex-1 bg-transparent text-sm outline-none px-1 min-w-0 resize-none overflow-hidden py-1 min-h-[28px]" />
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
                            className={cn("w-full text-center text-xs font-bold uppercase text-muted-foreground bg-transparent border-b hover:border-border focus:border-primary outline-none transition-colors pb-1", (bowtieConfig.parameterLabel ?? "").trim() === "" ? "border-destructive" : "border-transparent")}
                          />
                          {bowtieConfig.parameters.map((item: any, i: number) => (
                            <div key={i} className={cn("flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm transition-colors", item.isCorrect ? "border-success/50 ring-1 ring-success/20" : item.text.trim() === "" ? "border-destructive ring-1 ring-destructive/20" : "border-border")}>
                              <textarea value={item.text} onChange={(e) => { 
                                const n = [...bowtieConfig.parameters]; n[i] = { ...n[i], text: e.target.value }; setBowtieConfig({ ...bowtieConfig, parameters: n }); 
                                e.target.style.height = '0px'; e.target.style.height = `${e.target.scrollHeight}px`;
                              }} rows={1} className="flex-1 bg-transparent text-sm outline-none px-1 min-w-0 resize-none overflow-hidden py-1 min-h-[28px]" />
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
                            <div key={i} className={cn("flex items-center gap-3 rounded-xl border p-2 transition-colors", blank.correct === opt && opt !== "" ? "border-success/50 bg-success/5" : opt.trim() === "" ? "border-destructive ring-1 ring-destructive/20 bg-destructive/5" : "border-border bg-card")}>
                              <input
                                value={opt}
                                onChange={(e) => {
                                  const newOptions = [...blank.options];
                                  newOptions[i] = e.target.value;
                                  setClozeBlanks({ ...clozeBlanks, [id]: { ...blank, options: newOptions, correct: (blank.correct === opt && opt !== "") ? e.target.value : blank.correct } });
                                }}
                                className="flex-1 bg-transparent text-sm outline-none px-2"
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
                              placeholder="Column Name"
                              className={cn("bg-transparent text-sm outline-none px-1 font-semibold border-b", col.label.trim() === "" ? "border-destructive" : "border-transparent")}
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
                                    placeholder="e.g. Assessment Finding"
                                    className={cn("w-full bg-transparent text-sm outline-none px-2 py-1 border rounded", row.text.trim() === "" ? "border-destructive" : "border-transparent focus:border-border")}
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
                          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background/60 p-5 shadow-sm backdrop-blur-md transition-all mt-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-[16px] font-bold text-foreground">Editing Tab: {highlightConfig.tables[activeHighlightTab].tabName || "Unnamed Tab"}</h3>
                              <button
                                onClick={() => {
                                  const newTables = highlightConfig.tables!.filter((_, i) => i !== activeHighlightTab);
                                  const deletedRowIds = highlightConfig.tables![activeHighlightTab].rows.flatMap(r => r.sentences.map(s => s.id));
                                  const newC = (highlightConfig.correctHighlights || []).filter(id => !deletedRowIds.includes(id));
                                  setHighlightConfig({ ...highlightConfig, tables: newTables, correctHighlights: newC });
                                  setActiveHighlightTab(Math.max(0, activeHighlightTab - 1));
                                }}
                                className="text-xs font-semibold text-destructive hover:bg-destructive/10 px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="size-4.5" /> Delete Tab
                              </button>
                            </div>

                            <div className="max-w-sm space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 flex justify-between items-center px-1">Tab Name</label>
                              <Input
                                value={highlightConfig.tables[activeHighlightTab].tabName}
                                onChange={e => {
                                  const newTables = [...highlightConfig.tables!];
                                  newTables[activeHighlightTab].tabName = e.target.value;
                                  setHighlightConfig({...highlightConfig, tables: newTables});
                                }}
                                placeholder="e.g. History & Physical"
                                className={cn("bg-background shadow-sm font-semibold border-border focus-visible:ring-primary h-9 text-sm", highlightConfig.tables[activeHighlightTab].tabName.trim() === "" && "border-destructive border-2")}
                              />
                            </div>

                            <div className="mt-2 rounded-xl border border-border bg-background shadow-sm flex flex-col relative overflow-x-auto">
                              <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-muted/40">
                                  <tr>
                                    <th className="p-2 border-b border-r border-border font-semibold text-muted-foreground align-top w-[250px] relative group">
                                      <div className="flex justify-between items-center mb-1 px-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Column 1 Header</span>
                                      </div>
                                      <Input 
                                        value={highlightConfig.tables[activeHighlightTab].headers.col1}
                                        onChange={e => {
                                          const newTables = [...highlightConfig.tables!];
                                          newTables[activeHighlightTab].headers.col1 = e.target.value;
                                          setHighlightConfig({...highlightConfig, tables: newTables});
                                        }}
                                        placeholder="e.g. Body System"
                                        className={cn("bg-transparent shadow-none font-semibold text-foreground hover:border-border focus-visible:ring-primary focus-visible:bg-background h-8 text-sm px-2 w-full transition-all", highlightConfig.tables[activeHighlightTab].headers.col1.trim() === "" ? "border-destructive border" : "border-transparent")}
                                      />
                                    </th>
                                    <th className="p-2 border-b border-border font-semibold text-muted-foreground align-top relative group">
                                      <div className="flex justify-between items-center mb-1 px-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Column 2 Header</span>
                                      </div>
                                      <Input 
                                        value={highlightConfig.tables[activeHighlightTab].headers.col2}
                                        onChange={e => {
                                          const newTables = [...highlightConfig.tables!];
                                          newTables[activeHighlightTab].headers.col2 = e.target.value;
                                          setHighlightConfig({...highlightConfig, tables: newTables});
                                        }}
                                        placeholder="e.g. Findings"
                                        className={cn("bg-transparent shadow-none font-semibold text-foreground hover:border-border focus-visible:ring-primary focus-visible:bg-background h-8 text-sm px-2 w-full transition-all", highlightConfig.tables[activeHighlightTab].headers.col2.trim() === "" ? "border-destructive border" : "border-transparent")}
                                      />
                                    </th>
                                    <th className="border-b border-border w-[50px]"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {(highlightConfig.tables[activeHighlightTab].rows || []).map((row, rIdx) => (
                                    <tr key={row.id} className="group/row transition-colors hover:bg-muted/10">
                                      <td className="p-1.5 border-r border-border align-top bg-muted/20">
                                        <Input
                                          value={row.label}
                                          onChange={e => {
                                            const newTables = [...highlightConfig.tables!];
                                            newTables[activeHighlightTab].rows[rIdx].label = e.target.value;
                                            setHighlightConfig({...highlightConfig, tables: newTables});
                                          }}
                                          placeholder="e.g. Assessment Finding"
                                          className={cn("bg-transparent shadow-none text-foreground font-medium hover:border-border focus-visible:ring-primary focus-visible:bg-background h-8 text-sm px-2 w-full transition-all", row.label.trim() === "" ? "border-destructive border" : "border-transparent")}
                                        />
                                      </td>
                                      <td className="p-3 align-top border-border">
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between pb-1">
                                            <span className="text-[10px] text-muted-foreground/60 italic">Select text and click:</span>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                  const ta = document.getElementById(`row-editor-${row.id}`) as HTMLTextAreaElement;
                                                  if (!ta) return;
                                                  const start = ta.selectionStart;
                                                  const end = ta.selectionEnd;
                                                  if (start === end) {
                                                    toast.error("Please select some text first.");
                                                    return;
                                                  }
                                                  const text = row.rawText ?? (row.sentences || []).map((s: any) => s.isClickable !== false ? `[${s.text}]` : s.text).join(" ");
                                                  const selected = text.substring(start, end);
                                                  const newText = text.substring(0, start) + `[${selected}]` + text.substring(end);
                                                  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                                  nativeSetter?.call(ta, newText);
                                                  ta.dispatchEvent(new Event('input', { bubbles: true }));
                                                }}
                                                className="text-[10px] font-semibold text-primary hover:bg-primary/20 transition-all flex items-center gap-1 bg-primary/10 px-2 py-1 rounded border border-primary/20"
                                              >
                                                [ ] Clickable
                                              </button>
                                              <button
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                  const ta = document.getElementById(`row-editor-${row.id}`) as HTMLTextAreaElement;
                                                  if (!ta) return;
                                                  const start = ta.selectionStart;
                                                  const end = ta.selectionEnd;
                                                  if (start === end) {
                                                    toast.error("Please select some text first.");
                                                    return;
                                                  }
                                                  const text = row.rawText ?? (row.sentences || []).map((s: any) => s.isClickable !== false ? `[${s.text}]` : s.text).join(" ");
                                                  const selected = text.substring(start, end);
                                                  const newText = text.substring(0, start) + `[*${selected}]` + text.substring(end);
                                                  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                                  nativeSetter?.call(ta, newText);
                                                  ta.dispatchEvent(new Event('input', { bubbles: true }));
                                                }}
                                                className="text-[10px] font-semibold text-success hover:bg-success/20 transition-all flex items-center gap-1 bg-success/10 px-2 py-1 rounded border border-success/20"
                                              >
                                                [*] Correct
                                              </button>
                                            </div>
                                          </div>
                                      <textarea
                                        id={`row-editor-${row.id}`}
                                        value={row.rawText ?? (row.sentences || []).map((s: any) => s.isClickable !== false ? `[${s.text}]` : s.text).join(" ")}
                                        onChange={(e) => {
                                          const text = e.target.value;
                                          const newTables = [...highlightConfig.tables!];
                                          
                                          let parsedSentences: any[] = [];
                                          let parsedCorrect: string[] = [];
                                          const bracketRegex = /\[(.*?)\]/g;
                                          let lastIndex = 0;
                                          let match;
                                          let clickIndex = 0;
                                          
                                          const processPlain = (plain: string) => {
                                            if (!plain) return;
                                            parsedSentences.push({ id: `text-${row.id}-${clickIndex++}`, text: plain, isClickable: false });
                                          };
                                          
                                          while ((match = bracketRegex.exec(text)) !== null) {
                                            if (match.index > lastIndex) {
                                              processPlain(text.substring(lastIndex, match.index));
                                            }
                                            let innerText = match[1];
                                            let isC = false;
                                            if (innerText.startsWith("*")) { isC = true; innerText = innerText.substring(1); }
                                            const clickId = `click-${row.id}-${clickIndex++}`;
                                            parsedSentences.push({ id: clickId, text: innerText, isClickable: true });
                                            if (isC) parsedCorrect.push(clickId);
                                            lastIndex = bracketRegex.lastIndex;
                                          }
                                          if (lastIndex < text.length) {
                                            processPlain(text.substring(lastIndex));
                                          }
                                          
                                          newTables[activeHighlightTab].rows[rIdx].rawText = text;
                                          newTables[activeHighlightTab].rows[rIdx].sentences = parsedSentences;
                                          
                                          const currentC = highlightConfig.correctHighlights || [];
                                          // Retain existing correct highlights from other rows, and replace this row's correct highlights with parsedCorrect
                                          const otherRowsC = currentC.filter((id: string) => !id.includes(`-${row.id}-`));
                                          const finalCorrect = [...otherRowsC, ...parsedCorrect];
                                          
                                          setHighlightConfig({...highlightConfig, tables: newTables, correctHighlights: parsedCorrect.length > 0 ? finalCorrect : currentC});
                                        }}
                                        
                                        className="w-full min-h-[80px] rounded-lg border border-border p-3 text-sm bg-background resize-y outline-none focus:border-primary shadow-sm"
                                      />
                                      {row.sentences && row.sentences.length > 0 && (
                                        <div className="mt-2 p-3 bg-muted/20 border border-border rounded-lg text-[13px] leading-relaxed text-foreground">
                                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.48c.35.79,8.82,19.58,27.65,38.41C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.35c18.83-18.83,27.3-37.62,27.65-38.41A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path></svg>
                                            Live Preview
                                          </span>
                                          {row.sentences.map((s: any, i: number) => {
                                            if (s.isClickable === false) {
                                              return <span key={s.id || i}>{s.text}</span>;
                                            }
                                            const isCorrect = (highlightConfig.correctHighlights || []).includes(s.id);
                                            return (
                                              <span
                                                key={s.id || i}
                                                onClick={() => {
                                                  const current = highlightConfig.correctHighlights || [];
                                                  const newC = isCorrect ? current.filter((id: string) => id !== s.id) : [...current, s.id];
                                                  
                                                  const newText = row.sentences.map((rs: any) => {
                                                    if (rs.isClickable === false) return rs.text;
                                                    if (newC.includes(rs.id)) return `[*${rs.text}]`;
                                                    return `[${rs.text}]`;
                                                  }).join("");
                                                  
                                                  const ta = document.getElementById(`row-editor-${row.id}`) as HTMLTextAreaElement;
                                                  if (ta) {
                                                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                                    nativeSetter?.call(ta, newText);
                                                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                                                  }
                                                }}
                                                className={cn(
                                                  "px-1.5 py-0.5 mx-[1px] rounded cursor-pointer transition-colors inline-block",
                                                  isCorrect ? "bg-success/20 text-success-foreground border-b-2 border-success font-semibold" : "font-bold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20"
                                                )}
                                              >
                                                {s.text}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-1.5 align-middle text-center w-[50px] border-border">
                                    <button
                                      onClick={() => {
                                        const newTables = [...highlightConfig.tables!];
                                        newTables[activeHighlightTab].rows = newTables[activeHighlightTab].rows.filter(r => r.id !== row.id);
                                        const removedSentenceIds = row.sentences.map(s => s.id);
                                        const newC = (highlightConfig.correctHighlights || []).filter(id => !removedSentenceIds.includes(id));
                                        setHighlightConfig({...highlightConfig, tables: newTables, correctHighlights: newC});
                                      }}
                                      className="inline-grid size-8 place-items-center rounded-md text-muted-foreground opacity-30 group-hover/row:opacity-100 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all mx-auto"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {(!highlightConfig.tables[activeHighlightTab].rows || highlightConfig.tables[activeHighlightTab].rows.length === 0) && (
                                <tr>
                                  <td colSpan={3} className="text-center text-sm text-muted-foreground py-6 border-dashed">No rows added.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          
                          <div className="p-2 bg-muted/10 border-t border-border">
                            <Button 
                              variant="outline" 
                              className="w-full text-xs font-semibold border-dashed border-2 py-3 h-9 rounded-lg text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all shadow-sm"
                              onClick={() => {
                                const newTables = [...highlightConfig.tables!];
                                newTables[activeHighlightTab].rows.push({ id: `r-${Math.random().toString(36).substring(7)}`, label: "", sentences: [] });
                                setHighlightConfig({...highlightConfig, tables: newTables});
                              }}
                            >
                              <Plus className="size-4 mr-1.5" /> Add Row
                            </Button>
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
                            
                            <div className="mt-4">
                              <div className="flex border-b border-border gap-1 overflow-x-auto">
                                {highlightConfig.tables.map((t: any, idx: number) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); setActiveHighlightTab(idx); }}
                                    className={cn(
                                      "px-5 py-2.5 text-[13px] font-bold rounded-t-md relative z-10 transition-colors border border-b-0",
                                      activeHighlightTab === idx
                                        ? "text-foreground bg-card border-border -mb-[1px]"
                                        : "text-muted-foreground bg-muted/30 border-transparent hover:bg-muted"
                                    )}
                                  >
                                    {t.tabName || "Unnamed Tab"}
                                  </button>
                                ))}
                              </div>
                              
                              {highlightConfig.tables[activeHighlightTab] && (
                                <div className="overflow-x-auto border border-border bg-card">
                                  <table className="w-full text-left text-[13px]">
                                    <thead className="bg-[#eaf3fa] text-slate-900 border-b border-border">
                                      <tr>
                                        <th className="p-4 font-bold w-[30%]">{highlightConfig.tables[activeHighlightTab].headers?.col1 || "Body System"}</th>
                                        <th className="p-4 font-bold">{highlightConfig.tables[activeHighlightTab].headers?.col2 || "Findings"}</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {highlightConfig.tables[activeHighlightTab].rows?.map((row: any, rIndex: number) => (
                                        <tr key={row.id} className={rIndex % 2 === 0 ? "bg-slate-50/70" : "bg-card"}>
                                          <td className="p-4 font-bold text-slate-800 align-top">{row.label}</td>
                                          <td className="p-4 leading-relaxed align-top">
                                            {row.sentences?.map((s: any, i: number) => {
                                              if (s.isClickable === false) {
                                                return <span key={s.id}>{s.text}</span>;
                                              }
                                              const isCorrect = (highlightConfig.correctHighlights || []).includes(s.id);
                                              return (
                                                <span key={s.id}>
                                                  <span
                                                    onClick={() => {
                                                      const current = highlightConfig.correctHighlights || [];
                                                      const newC = isCorrect ? current.filter((id: string) => id !== s.id) : [...current, s.id];
                                                      setHighlightConfig({...highlightConfig, correctHighlights: newC});
                                                    }}
                                                    className={cn(
                                                      "transition-all rounded-sm py-0.5 cursor-pointer",
                                                      isCorrect ? "bg-success/30 border-b-2 border-success font-semibold" : "bg-transparent hover:bg-yellow-100"
                                                    )}
                                                  >
                                                    {s.text || "[Empty]"}
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
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-foreground">Paragraph Text</label>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  const ta = document.getElementById("paragraph-editor") as HTMLTextAreaElement;
                                  if (!ta) return;
                                  const start = ta.selectionStart;
                                  const end = ta.selectionEnd;
                                  if (start === end) {
                                     toast.error("Please select some text first.");
                                     return;
                                  }
                                  const text = highlightConfig.paragraphText || "";
                                  const selected = text.substring(start, end);
                                  const newText = text.substring(0, start) + `[${selected}]` + text.substring(end);
                                  
                                  const e = { target: { value: newText } } as any;
                                  document.getElementById("paragraph-editor")?.dispatchEvent(new Event('input', { bubbles: true }));
                                  
                                  const parseRes = (() => {
                                    let parsedSentences: any[] = [];
                                    let parsedCorrect: string[] = [];
                                    const bracketRegex = /\[(.*?)\]/g;
                                    let lastIndex = 0;
                                    let match;
                                    let clickIndex = 0;
                                    
                                    const processPlain = (plain: string) => {
                                      if (!plain) return;
                                      parsedSentences.push({ id: `text-${clickIndex++}`, text: plain, isClickable: false });
                                    };
                                    
                                    while ((match = bracketRegex.exec(newText)) !== null) {
                                      if (match.index > lastIndex) {
                                        processPlain(newText.substring(lastIndex, match.index));
                                      }
                                      let innerText = match[1];
                                      let isC = false;
                                      if (innerText.startsWith("*")) { isC = true; innerText = innerText.substring(1); }
                                      const clickId = `click-${clickIndex++}`;
                                      parsedSentences.push({ id: clickId, text: innerText, isClickable: true });
                                      if (isC) parsedCorrect.push(clickId);
                                      lastIndex = bracketRegex.lastIndex;
                                    }
                                    if (lastIndex < newText.length) {
                                      processPlain(newText.substring(lastIndex));
                                    }
                                    return { sentences: parsedSentences, correctHighlights: parsedCorrect };
                                  })();
                                  
                                  setHighlightConfig({ ...highlightConfig, paragraphText: newText, sentences: parseRes.sentences, correctHighlights: parseRes.correctHighlights });
                                }}
                                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md"
                              >
                                [ ] Make Clickable
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  const ta = document.getElementById("paragraph-editor") as HTMLTextAreaElement;
                                  if (!ta) return;
                                  const start = ta.selectionStart;
                                  const end = ta.selectionEnd;
                                  if (start === end) {
                                     toast.error("Please select some text first.");
                                     return;
                                  }
                                  const text = highlightConfig.paragraphText || "";
                                  const selected = text.substring(start, end);
                                  const newText = text.substring(0, start) + `[*${selected}]` + text.substring(end);
                                  
                                  const parseRes = (() => {
                                    let parsedSentences: any[] = [];
                                    let parsedCorrect: string[] = [];
                                    const bracketRegex = /\[(.*?)\]/g;
                                    let lastIndex = 0;
                                    let match;
                                    let clickIndex = 0;
                                    
                                    const processPlain = (plain: string) => {
                                      if (!plain) return;
                                      parsedSentences.push({ id: `text-${clickIndex++}`, text: plain, isClickable: false });
                                    };
                                    
                                    while ((match = bracketRegex.exec(newText)) !== null) {
                                      if (match.index > lastIndex) {
                                        processPlain(newText.substring(lastIndex, match.index));
                                      }
                                      let innerText = match[1];
                                      let isC = false;
                                      if (innerText.startsWith("*")) { isC = true; innerText = innerText.substring(1); }
                                      const clickId = `click-${clickIndex++}`;
                                      parsedSentences.push({ id: clickId, text: innerText, isClickable: true });
                                      if (isC) parsedCorrect.push(clickId);
                                      lastIndex = bracketRegex.lastIndex;
                                    }
                                    if (lastIndex < newText.length) {
                                      processPlain(newText.substring(lastIndex));
                                    }
                                    return { sentences: parsedSentences, correctHighlights: parsedCorrect };
                                  })();
                                  
                                  setHighlightConfig({ ...highlightConfig, paragraphText: newText, sentences: parseRes.sentences, correctHighlights: parseRes.correctHighlights });
                                }}
                                className="text-xs font-semibold text-success hover:underline flex items-center gap-1 bg-success/10 px-2 py-1 rounded-md"
                              >
                                [*] Mark Correct
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">Type your paragraph below. Select any text and click the buttons above to mark it as a clickable phrase or the correct answer.</p>
                          <textarea
                            id="paragraph-editor"
                            value={highlightConfig.paragraphText || ""}
                            onChange={(e) => {
                              const text = e.target.value;
                              
                              let parsedSentences: any[] = [];
                              let parsedCorrect: string[] = [];
                              const bracketRegex = /\[(.*?)\]/g;
                              let lastIndex = 0;
                              let match;
                              let clickIndex = 0;
                              
                              const processPlain = (plain: string) => {
                                if (!plain) return;
                                parsedSentences.push({ id: `text-${clickIndex++}`, text: plain, isClickable: false });
                              };
                              
                              while ((match = bracketRegex.exec(text)) !== null) {
                                if (match.index > lastIndex) {
                                  processPlain(text.substring(lastIndex, match.index));
                                }
                                let innerText = match[1];
                                let isC = false;
                                if (innerText.startsWith("*")) { isC = true; innerText = innerText.substring(1); }
                                const clickId = `click-${clickIndex++}`;
                                parsedSentences.push({ id: clickId, text: innerText, isClickable: true });
                                if (isC) parsedCorrect.push(clickId);
                                lastIndex = bracketRegex.lastIndex;
                              }
                              if (lastIndex < text.length) {
                                processPlain(text.substring(lastIndex));
                              }
                              
                              const finalCorrect = parsedCorrect.length > 0 
                                ? parsedCorrect 
                                : (highlightConfig.correctHighlights || []).filter((id: string) => parsedSentences.some(s => s.id === id));
                              
                              setHighlightConfig({
                                ...highlightConfig, 
                                paragraphText: text,
                                sentences: parsedSentences,
                                correctHighlights: finalCorrect
                              });
                            }}
                            
                            className="w-full min-h-[150px] rounded-lg border border-border p-3 text-sm bg-background resize-y outline-none focus:border-primary"
                          />
                          
                          {highlightConfig.sentences && highlightConfig.sentences.length > 0 && (
                            <div className="mt-4 p-4 bg-muted/30 border border-border rounded-lg text-[14px] leading-relaxed text-foreground">
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.48c.35.79,8.82,19.58,27.65,38.41C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.35c18.83-18.83,27.3-37.62,27.65-38.41A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path></svg>
                                Live Preview
                              </span>
                              {highlightConfig.sentences.map((s: any, i: number) => (
                                <span key={i} className={s.isClickable ? "font-bold text-primary bg-primary/10 px-1 rounded mx-0.5 border border-primary/20" : ""}>
                                  {s.text}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {highlightConfig.sentences && highlightConfig.sentences.filter((s: any) => s.isClickable).length > 0 ? (
                          <div className="space-y-2 pt-4 border-t border-border">
                            <label className="text-sm font-semibold text-foreground">Select Correct Highlights</label>
                            <p className="text-xs text-muted-foreground">You can also click the phrases below to toggle their correct state in the text above.</p>
                            <div className="bg-card p-4 rounded-xl border border-border flex flex-wrap gap-2 text-[14px]">
                              {highlightConfig.sentences.filter((s: any) => s.isClickable).map((sentence: any) => {
                                const isCorrect = (highlightConfig.correctHighlights || []).includes(sentence.id);
                                return (
                                  <span
                                    key={sentence.id}
                                    onClick={() => {
                                      const current = highlightConfig.correctHighlights || [];
                                      const newC = isCorrect ? current.filter((id: string) => id !== sentence.id) : [...current, sentence.id];
                                      
                                      const newText = highlightConfig.sentences.map((s: any) => {
                                         if (!s.isClickable) return s.text;
                                         if (newC.includes(s.id)) return `[*${s.text}]`;
                                         return `[${s.text}]`;
                                      }).join("");
                                      
                                      let parsedSentences: any[] = [];
                                      let parsedCorrect: string[] = [];
                                      const bracketRegex = /\[(.*?)\]/g;
                                      let lastIndex = 0;
                                      let match;
                                      let clickIndex = 0;
                                      
                                      const processPlain = (plain: string) => {
                                        if (!plain) return;
                                        parsedSentences.push({ id: `text-${clickIndex++}`, text: plain, isClickable: false });
                                      };

                                      while ((match = bracketRegex.exec(newText)) !== null) {
                                        if (match.index > lastIndex) {
                                          processPlain(newText.substring(lastIndex, match.index));
                                        }
                                        let innerText = match[1];
                                        let isC = false;
                                        if (innerText.startsWith("*")) { isC = true; innerText = innerText.substring(1); }
                                        const clickId = `click-${clickIndex++}`;
                                        parsedSentences.push({ id: clickId, text: innerText, isClickable: true });
                                        if (isC) parsedCorrect.push(clickId);
                                        lastIndex = bracketRegex.lastIndex;
                                      }
                                      if (lastIndex < newText.length) {
                                        processPlain(newText.substring(lastIndex));
                                      }
                                      
                                      setHighlightConfig({...highlightConfig, paragraphText: newText, sentences: parsedSentences, correctHighlights: parsedCorrect});
                                    }}
                                    className={cn(
                                      "px-1 py-0.5 mx-0.5 rounded cursor-pointer transition-colors",
                                      isCorrect ? "bg-success/20 text-success-foreground border-b-2 border-success font-semibold" : "bg-muted hover:bg-muted/80 text-foreground"
                                    )}
                                  >
                                    {sentence.text || "[Empty]"}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-4 border-t border-border">
                            <label className="text-sm font-semibold text-foreground">Select Correct Highlights</label>
                            <div className="bg-muted/50 p-6 rounded-xl border border-dashed border-border text-center flex flex-col items-center justify-center gap-2">
                              <p className="text-sm font-medium text-foreground">No clickable phrases found</p>
                              <p className="text-xs text-muted-foreground">Wrap any words in brackets <code>[like this]</code> in the paragraph above. They will appear here for you to mark as correct.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Section>
              ) : null}

              {group === "ungrouped" && (
                <ScenarioTabsEditor 
                  includeTabs={includeTabs} 
                  setIncludeTabs={setIncludeTabs} 
                  tabs={tabs} 
                  setTabs={setTabs} 
                />
              )}

              <Section title="Explanation & Rationale" desc="Provide evidence-based reasoning with images">
                <div className={cn("rounded-xl border transition-colors", isEmpty(rationale) ? "border-destructive ring-1 ring-destructive/20" : "border-transparent")}>
                  <RichTextEditor
                    value={rationale}
                    onChange={setRationale}
                  />
                </div>
              </Section>
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <Section title="Preview" desc="Exactly what students will see">
                {group === "grouped" && subQuestions.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {subQuestions.map((_, idx) => (
                      <Button 
                        key={idx} 
                        variant="outline" 
                        onClick={() => { setPreviewSubIndex(idx); setPreviewModalOpen(true); }}
                        className="w-full h-14 rounded-xl border-dashed border-2 bg-muted/50 text-sm font-semibold hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-300 justify-start px-6"
                      >
                        <Eye className="size-5 mr-3" weight="duotone" />
                        Preview Item {idx + 1}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => { setPreviewSubIndex(0); setPreviewModalOpen(true); }}
                    className="w-full h-16 rounded-2xl border-dashed border-2 bg-muted/50 text-base font-semibold hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-300"
                  >
                    <Eye className="size-5 mr-2" weight="duotone" />
                    Open Question Preview
                  </Button>
                )}
                
                <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Question Preview</DialogTitle>
                      <DialogDescription>
                        {category} • {subcategory} ({group === "grouped" ? "Grouped Question" : type})
                      </DialogDescription>
                    </DialogHeader>
                    <div className={cn("mt-4 rounded-3xl border border-border bg-card/50 p-6 flex flex-col gap-8 shadow-sm", (group === "grouped" ? parentIncludeTabs : includeTabs) && (group === "grouped" ? parentTabs : tabs).filter((t: any) => t.title?.trim() !== "" || (t.type === "table" ? t.tableRows?.length > 0 : !isEmpty(t.content))).length > 0 && "md:flex-row")}>
                  
                  {((group === "grouped" ? parentIncludeTabs : includeTabs) && (group === "grouped" ? parentTabs : tabs).filter((t: any) => t.title?.trim() !== "" || (t.type === "table" ? t.tableRows?.length > 0 : !isEmpty(t.content))).length > 0) && (
                    <div className="w-full md:w-1/2 flex flex-col gap-5">
                      {group === "grouped" && !isEmpty(parentStem) && (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed text-foreground bg-background/80 p-5 rounded-2xl border border-border shadow-sm" dangerouslySetInnerHTML={{ __html: parentStem }} />
                      )}
                      
                      <div className="flex flex-col rounded-2xl border border-border bg-background overflow-hidden shadow-sm">
                        <div className="flex overflow-x-auto border-b border-border bg-muted/30 [&::-webkit-scrollbar]:hidden">
                          {(group === "grouped" ? parentTabs : tabs).filter((t: any) => t.title?.trim() !== "" || (t.type === "table" ? t.tableRows?.length > 0 : !isEmpty(t.content))).map((tab: any, i: number) => (
                             <button
                               key={i}
                               onClick={() => setPreviewTabIdx(i)}
                               className={cn("px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors", previewTabIdx === i ? "border-b-2 border-primary text-primary bg-background" : "text-muted-foreground hover:bg-muted/50 border-b-2 border-transparent")}
                             >
                               {tab.title || "Untitled Tab"}
                             </button>
                          ))}
                        </div>
                        <div className="p-6 relative z-10 overflow-hidden bg-background min-h-[250px] max-h-[500px] overflow-y-auto">
                          {(() => {
                            const activeTab = (group === "grouped" ? parentTabs : tabs).filter((t: any) => t.title?.trim() !== "" || (t.type === "table" ? t.tableRows?.length > 0 : !isEmpty(t.content)))[previewTabIdx];
                            if (!activeTab) return null;
                            if (activeTab.type === "table") {
                              return (
                                <div className="overflow-x-auto rounded-lg border border-border">
                                  <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-muted/40">
                                      <tr>
                                        {activeTab.tableHeaders?.map((h: string, idx: number) => (
                                          <th key={idx} className="p-3 border-b border-border font-semibold text-muted-foreground">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {activeTab.tableRows?.map((row: any) => (
                                        <tr key={row.id} className="hover:bg-muted/20">
                                          {row.cells?.map((cell: string, idx: number) => (
                                            <td key={idx} className={cn("p-3 border-border", idx < (activeTab.tableHeaders?.length || 1) - 1 && "border-r", idx === 0 && "font-medium")}>{cell}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            }
                            return <div className="prose prose-sm dark:prose-invert max-w-none text-[14.5px] leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: activeTab.content || "" }} />;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={cn("w-full flex flex-col gap-6", (group === "grouped" ? parentIncludeTabs : includeTabs) && (group === "grouped" ? parentTabs : tabs).filter((t: any) => t.title?.trim() !== "" || (t.type === "table" ? t.tableRows?.length > 0 : !isEmpty(t.content))).length > 0 && "md:w-1/2")}>
                    {(group === "grouped" ? (subQuestions.length > 0 ? [subQuestions[previewSubIndex]] : []) : [{ type, stem, options, bowtieConfig, clozeBlanks, highlightConfig, rationale, category, subcategory }]).map((q: any, _mappedIdx: number, arr: any[]) => {
                      const idx = group === "grouped" ? previewSubIndex : 0;
                      return (
                      <div key={idx} className="w-full bg-background/80 backdrop-blur-md rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="mb-5 flex flex-wrap items-center gap-3">
                          <span className="whitespace-nowrap rounded-full bg-secondary/80 px-3 py-1.5 text-xs font-bold text-secondary-foreground shadow-sm">{group === "grouped" ? `Item ${idx + 1}` : "Ungrouped"}</span>
                          <span className="whitespace-nowrap rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary shadow-sm ring-1 ring-primary/20">{q?.type === "bowtie" ? "BOW-TIE" : (q?.type||"").replace(/-/g, " ").toUpperCase()}</span>
                          <span className="ml-auto whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-full">{category} • {subcategory}</span>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed break-words text-foreground font-medium" dangerouslySetInnerHTML={{ __html: q?.type === "next-gen-cloze" ? (q?.stem||"").replace(/{(?:dropdown\s+)?[0-9]+}/g, "_________") : (q?.stem||"") }} />
                        
                        <div className="mt-6 space-y-3">
                          {q?.type?.startsWith("mcq") ? (q?.options || []).map((o: any) => (
                            <div key={o.letter} className={cn("group flex items-center gap-4 rounded-xl border p-4 text-sm transition-all duration-300", o.correct ? "border-success/40 bg-success/5 shadow-sm ring-1 ring-success/20" : "border-border bg-background hover:border-primary/30 hover:shadow-sm")}>
                              <div className={cn("grid size-8 place-items-center rounded-lg text-xs font-bold shrink-0 transition-colors duration-300", o.correct ? "bg-success text-success-foreground shadow-sm" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary")}>{o.letter}</div>
                              <span className="flex-1 break-words min-w-0 font-medium text-foreground">{o.text}</span>
                              {o.correct && <Check className="ml-auto size-5 text-success drop-shadow-sm" weight="bold" />}
                            </div>
                          )) : q?.type === "bowtie" ? (
                            <div className="rounded-xl border border-border p-5 text-sm bg-muted/10">
                              <div className="font-semibold text-teal-800 mb-6 text-sm text-center">Bow-Tie Correct Answers</div>
                              <div className="flex flex-col md:flex-row items-stretch justify-center gap-4">
                                 <div className="flex-1 flex flex-col justify-start items-center bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 w-full text-center min-h-[120px]">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">{q?.bowtieConfig?.actionLabel || "Actions to Take"}</div>
                                    <div className="space-y-1.5 text-[13px] text-slate-700 font-medium w-full">
                                       {q?.bowtieConfig?.actions?.map((a: any, i: number) => (
                                         <div key={i} className={cn("py-1.5 px-2.5 rounded-md border text-center flex items-center justify-center gap-2", a.isCorrect ? "bg-teal-50 border-teal-200 text-teal-800 font-semibold" : "bg-slate-50 border-slate-100 text-slate-500")}>
                                           {a.isCorrect && <Check className="w-3.5 h-3.5 shrink-0 text-teal-600" />}
                                           <span>{a.text || "—"}</span>
                                         </div>
                                       ))}
                                    </div>
                                 </div>
                                 <div className="flex-1 flex flex-col justify-start items-center bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 w-full text-center min-h-[120px]">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">{q?.bowtieConfig?.conditionLabel || "Potential Conditions"}</div>
                                    <div className="space-y-1.5 text-[13px] text-slate-700 font-medium w-full">
                                       {q?.bowtieConfig?.conditions?.map((a: any, i: number) => (
                                         <div key={i} className={cn("py-1.5 px-2.5 rounded-md border text-center flex items-center justify-center gap-2", a.isCorrect ? "bg-teal-50 border-teal-200 text-teal-800 font-semibold" : "bg-slate-50 border-slate-100 text-slate-500")}>
                                           {a.isCorrect && <Check className="w-3.5 h-3.5 shrink-0 text-teal-600" />}
                                           <span>{a.text || "—"}</span>
                                         </div>
                                       ))}
                                    </div>
                                 </div>
                                 <div className="flex-1 flex flex-col justify-start items-center bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 w-full text-center min-h-[120px]">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-3">{q?.bowtieConfig?.parameterLabel || "Parameters to Monitor"}</div>
                                    <div className="space-y-1.5 text-[13px] text-slate-700 font-medium w-full">
                                       {q?.bowtieConfig?.parameters?.map((a: any, i: number) => (
                                         <div key={i} className={cn("py-1.5 px-2.5 rounded-md border text-center flex items-center justify-center gap-2", a.isCorrect ? "bg-teal-50 border-teal-200 text-teal-800 font-semibold" : "bg-slate-50 border-slate-100 text-slate-500")}>
                                           {a.isCorrect && <Check className="w-3.5 h-3.5 shrink-0 text-teal-600" />}
                                           <span>{a.text || "—"}</span>
                                         </div>
                                       ))}
                                    </div>
                                 </div>
                              </div>
                            </div>
                          ) : q?.type === "next-gen-cloze" ? (
                            <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
                              <div className="font-semibold text-primary mb-3">Fill in the Blank Answers</div>
                              <div className="space-y-2">
                                {Object.entries(q?.clozeBlanks || {}).map(([key, blank]: [string, any]) => (
                                  <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-background border">
                                    <div className="font-semibold text-teal-700 shrink-0 bg-teal-50 px-2.5 py-1 rounded-md text-xs uppercase tracking-wider">Blank {key}</div>
                                    <div className="flex-1 text-slate-600 text-[13px]">
                                       Correct Answer: <span className="font-semibold text-slate-900 ml-1">{blank.correct}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : q?.type === "next-gen-highlight" && (
                            <div className="space-y-6">
                              {q?.highlightConfig?.tables?.map((t: any, i: number) => (
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
                                                   <span key={s.id} className={cn("inline rounded px-1", q?.highlightConfig?.correctHighlights?.includes(s.id) ? "bg-teal-100 text-teal-800 font-bold" : "")}>
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
                              {q?.highlightConfig?.layout === "text" && (
                                 <div className="rounded-xl border border-border p-5 text-sm bg-muted/10 leading-relaxed">
                                    {q?.highlightConfig?.paragraphs?.map((p: any, pi: number) => (
                                       <p key={pi} className="mb-4 last:mb-0">
                                          {p.sentences?.map((s: any) => (
                                            <span key={s.id} className={cn("inline rounded px-1", q?.highlightConfig?.correctHighlights?.includes(s.id) ? "bg-teal-100 text-teal-800 font-bold" : "")}>
                                              {s.text}{" "}
                                            </span>
                                          ))}
                                       </p>
                                    ))}
                                 </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5 relative overflow-hidden shadow-sm">
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 rounded-l-xl"></div>
                          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                            <Sparkles className="size-4 text-primary/70" weight="duotone" /> Rationale
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words text-[14px] leading-relaxed text-foreground/90 pl-1" dangerouslySetInnerHTML={{ __html: q?.rationale || "" }} />
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
                </DialogContent>
                </Dialog>
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
                      ? ["Highlight configured", highlightConfig.layout === "table" ? (highlightConfig.tables?.length > 0 && highlightConfig.correctHighlights?.length > 0 && highlightConfig.tables.every(t => !isEmpty(t.tabName) && !isEmpty(t.headers?.col1) && !isEmpty(t.headers?.col2) && t.rows.length > 0 && !t.rows.some(r => isEmpty(r.label) || r.sentences.some(s => isEmpty(s.text))))) : (highlightConfig.sentences?.length > 0 && highlightConfig.correctHighlights?.length > 0 && !highlightConfig.sentences.some(s => isEmpty(s.text)))]
                      : type === "table"
                      ? ["Table configured", tableConfig.rows?.length > 0 && tableConfig.columns?.length > 0 && !tableConfig.rows.some((r: any) => isEmpty(r.text)) && !tableConfig.columns.some((c: any) => isEmpty(c.label)) && Object.keys(tableConfig.correctAnswers || {}).length === tableConfig.rows.length]
                      : ["Configuration complete", true],
                    ["Rationale provided", !isEmpty(rationale)],
                    ...((group === "grouped" ? parentIncludeTabs : includeTabs) ? [
                      ["Scenario tab titles provided", (group === "grouped" ? parentTabs : tabs).every(t => t.title.trim() !== "")],
                      ["Scenario tab content provided", (group === "grouped" ? parentTabs : tabs).every(t => t.type === "table" ? (t.tableRows && t.tableRows.length > 0) : !isEmpty(t.content))]
                    ] : [])
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
              onClick={() => {
                setStep(Math.max(1, step - 1));
                document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
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
                    let itemsToValidate = [];
                    if (group === "grouped") {
                      const currentSubs = [...subQuestions];
                      if (activeSubIndex >= 0 && currentSubs[activeSubIndex]) {
                        currentSubs[activeSubIndex] = {
                          ...currentSubs[activeSubIndex],
                          type, stem, options, bowtieConfig, tableConfig, clozeBlanks, clozeDependencies, highlightConfig, rationale
                        };
                      }
                      itemsToValidate = currentSubs;
                      if (itemsToValidate.length === 0) {
                         toast.error("Grouped questions must have at least one item.");
                         return;
                      }
                      
                      const stripHtml = (html: string) => { const tmp = document.createElement("DIV"); tmp.innerHTML = html; return tmp.textContent || tmp.innerText || ""; };
                      const hasImage = (html: string) => html?.includes("<img");
                      const isEmpty = (html: string) => { if (!html) return true; if (hasImage(html)) return false; return stripHtml(html).trim() === ""; };
                      const currentParentStem = activeSubIndex === -1 ? stem : parentStem;
                      if (isEmpty(currentParentStem)) {
                        toast.error("Common Case Scenario cannot be blank.");
                        return;
                      }
                    } else {
                      itemsToValidate = [{ type, stem, options, bowtieConfig, tableConfig, clozeBlanks, clozeDependencies, highlightConfig, rationale }];
                    }

                    for (let i = 0; i < itemsToValidate.length; i++) {
                       const prefix = group === "grouped" ? `Item ${i + 1}: ` : "";
                       if (!validateItem(itemsToValidate[i], prefix)) {
                          return;
                       }
                    }
                  }
                  setStep(step + 1);
                  document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
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
function SegBtn({ active, onClick, children, disabled }: any) {
  return (
    <button disabled={disabled} onClick={onClick} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition", active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground", disabled && "opacity-50 cursor-not-allowed")}>{children}</button>
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

function ScenarioTabsEditor({
  includeTabs, setIncludeTabs, tabs, setTabs
}: {
  includeTabs: boolean;
  setIncludeTabs: (val: boolean) => void;
  tabs: any[];
  setTabs: (val: any[]) => void;
}) {
  return (
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
              <div key={i} className="flex flex-col gap-4 rounded-2xl border border-border bg-background/60 p-5 shadow-sm backdrop-blur-md transition-all hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-xl bg-primary/10">
                    <Layers2 className="size-4.5 text-primary" weight="duotone" />
                  </div>
                  <input
                    value={t.title}
                    onChange={(e) => setTabs(tabs.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))}
                    className={cn("flex-1 bg-transparent text-[16px] outline-none font-bold text-foreground placeholder:text-muted-foreground placeholder:font-normal transition-all pb-0.5", t.title.trim() === "" ? "border-b-2 border-destructive" : "focus:border-b-2 focus:border-primary")}
                    placeholder="Enter tab title (e.g. Patient Info)"
                  />
                  <select
                    value={t.type || "text"}
                    onChange={(e) => setTabs(tabs.map((x, idx) => (idx === i ? { ...x, type: e.target.value as "text" | "table", tableHeaders: x.tableHeaders || ["Body System", "Findings"], tableRows: x.tableRows || [] } : x)))}
                    className="bg-background text-[13px] font-medium text-foreground outline-none border border-border rounded-lg px-3 py-2 shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer appearance-none pr-8 relative"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
                  >
                    <option value="text">Rich Text</option>
                    <option value="table">Table (EHR)</option>
                  </select>
                  <button onClick={() => {
                    const newTabs = tabs.filter((_, idx) => idx !== i);
                    setTabs(newTabs);
                    if (newTabs.length === 0) setIncludeTabs(false);
                  }} className="grid size-9 place-items-center rounded-xl border border-transparent text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all">
                    <Trash2 className="size-4.5" />
                  </button>
                </div>
                {(!t.type || t.type === "text") ? (
                  <div className={cn("mt-2 rounded-xl overflow-hidden border shadow-sm", isEmpty(t.content) ? "border-destructive" : "border-border")}>
                    <RichTextEditor
                      value={t.content}
                      onChange={(content) => setTabs(tabs.map((x, idx) => (idx === i ? { ...x, content } : x)))}
                    />
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-border bg-background shadow-sm flex flex-col relative overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-muted/40">
                        <tr>
                          {t.tableHeaders?.map((header: any, hIdx: number) => (
                            <th key={hIdx} className="p-2 border-b border-r border-border font-semibold text-muted-foreground align-top min-w-[150px] relative group">
                              <div className="flex justify-between items-center mb-1 px-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Column {hIdx + 1}</span>
                                {t.tableHeaders!.length > 1 && (
                                  <button 
                                    onClick={() => setTabs(tabs.map((x, idx) => idx === i ? {
                                      ...x, 
                                      tableHeaders: x.tableHeaders!.filter((_: any, idx2: number) => idx2 !== hIdx),
                                      tableRows: x.tableRows?.map((r: any) => ({ ...r, cells: r.cells.filter((_: any, idx2: number) => idx2 !== hIdx) }))
                                    } : x))}
                                    className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded px-1.5 py-0.5 text-[9px] transition-all"
                                  >
                                    REMOVE
                                  </button>
                                )}
                              </div>
                              <Input 
                                value={header} 
                                onChange={(e) => setTabs(tabs.map((x, idx) => idx === i ? { ...x, tableHeaders: x.tableHeaders!.map((h: any, idx2: number) => idx2 === hIdx ? e.target.value : h) } : x))}
                                 
                                className={cn("bg-transparent border-transparent shadow-none font-semibold text-foreground hover:border-border focus-visible:ring-primary focus-visible:bg-background h-8 text-sm px-2 w-full transition-all", header.trim() === "" && "border-destructive border")}
                              />
                            </th>
                          ))}
                          <th className="p-2 border-b border-border align-bottom w-[100px]">
                            <Button
                              variant="outline"
                              className="w-full h-8 px-2 text-xs bg-background shadow-sm hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all border-dashed"
                              onClick={() => setTabs(tabs.map((x, idx) => idx === i ? {
                                ...x,
                                tableHeaders: [...(x.tableHeaders || []), `Column ${(x.tableHeaders?.length || 0) + 1}`],
                                tableRows: x.tableRows?.map((r: any) => ({ ...r, cells: [...r.cells, ""] }))
                              } : x))}
                            >
                              <Plus className="size-3 mr-1" /> Add Col
                            </Button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {t.tableRows?.map((row: any, rIndex: number) => (
                          <tr key={row.id} className="hover:bg-muted/10 transition-colors group/row">
                            {row.cells.map((cell: any, cIdx: number) => (
                              <td key={cIdx} className={cn("p-1.5 border-border", cIdx < t.tableHeaders!.length - 1 && "border-r", cIdx === 0 && "bg-muted/20 font-medium")}>
                                <Input 
                                  value={cell} 
                                  onChange={(e) => setTabs(tabs.map((x, idx) => idx === i ? { 
                                    ...x, 
                                    tableRows: x.tableRows?.map((r: any) => r.id === row.id ? { ...r, cells: r.cells.map((c: any, idx2: number) => idx2 === cIdx ? e.target.value : c) } : r) 
                                  } : x))}
                                  className={cn("bg-transparent border-transparent shadow-none text-foreground hover:border-border focus-visible:ring-primary focus-visible:bg-background h-8 text-sm px-2 w-full transition-all", cell.trim() === "" && "border-destructive border")}
                                />
                              </td>
                            ))}
                            <td className="p-1.5 align-middle text-center w-[50px]">
                              <button 
                                onClick={() => setTabs(tabs.map((x, idx) => idx === i ? { ...x, tableRows: x.tableRows?.filter((r: any) => r.id !== row.id) } : x))} 
                                className="inline-grid size-7 place-items-center rounded-md text-muted-foreground opacity-30 group-hover/row:opacity-100 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="p-2 bg-muted/10 border-t border-border">
                      <Button 
                        variant="outline" 
                        className="w-full text-xs font-semibold border-dashed border-2 py-3 h-9 rounded-lg text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all shadow-sm" 
                        onClick={() => setTabs(tabs.map((x, idx) => idx === i ? { ...x, tableRows: [...(x.tableRows || []), { id: Math.random().toString(36).substring(7), cells: Array(x.tableHeaders?.length || 2).fill("") }] } : x))}
                      >
                        <Plus className="size-4 mr-1.5" /> Add Row
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
  );
}

