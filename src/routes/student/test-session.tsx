import { StudentLayout } from "@/components/layout/StudentLayout";
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter, pointerWithin, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { X, CaretLeft as ChevronLeft, CaretRight as ChevronRight, CaretDoubleRight, CheckCircle as CheckCircle2, XCircle, DotsSixVertical as GripVertical, BookOpen, Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function StudentTestSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const config = location.state || { type: "traditional" };
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const [activePool, setActivePool] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function initSession() {
      setLoading(true);
      
      if (config.mode === 'review' && config.sessionId) {
        setSessionId(config.sessionId);
        const { data, error } = await supabase
          .from('test_answers')
          .select('*, questions(*)')
          .eq('session_id', config.sessionId)
          .order('created_at', { ascending: true });
          
        if (!error && data) {
          let pool = data.map((a: any) => {
            const q = a.questions;
            if (q.group_type === "grouped") {
              const subIdx = a.selected_options?._sub_index !== undefined ? a.selected_options._sub_index : 0;
              const sub = q.options?.subQuestions?.[subIdx] || {};
              const rawOptions = Array.isArray(sub.options) ? sub.options : (sub.options?.mcq_options || null);
              return {
                ...sub,
                id: `${q.id}-sub-${subIdx}`,
                parent_id: q.id,
                category: q.category,
                subcategory: q.subcategory,
                difficulty: q.difficulty,
                marking_scheme: sub.marking_scheme || q.marking_scheme,
                text: sub.stem,
                parent_stem: q.stem,
                correctId: rawOptions ? rawOptions.find((o: any) => o.correct)?.letter : null,
                correctIds: rawOptions ? rawOptions.filter((o: any) => o.correct).map((o: any) => o.letter) : [],
                options: rawOptions ? rawOptions.map((o: any) => ({ id: o.letter, text: o.text })) : sub.options,
                scenario_tabs: q.options?.scenario_tabs || null,
                is_subquestion: true,
                sub_index: subIdx,
                sub_total: q.options?.subQuestions?.length || 1,
                _submittedAnswer: a.selected_options?.answers || a.selected_options
              };
            } else {
              return {
                ...q,
                text: q.stem,
                correctId: Array.isArray(q.options) ? q.options.find((o: any) => o.correct)?.letter : null,
                correctIds: Array.isArray(q.options) ? q.options.filter((o: any) => o.correct).map((o: any) => o.letter) : [],
                options: Array.isArray(q.options) ? q.options.map((o: any) => ({ id: o.letter, text: o.text })) : q.options,
                _submittedAnswer: a.selected_options?.answers || a.selected_options
              };
            }
          });
          setActivePool(pool);
        }
      } else {
        let query = supabase.from('questions').select('*').eq('is_published', true);
        
        if (config.categoryNames && config.categoryNames.length > 0) {
          query = query.in('category', config.categoryNames);
        } else if (config.categoryName) {
          query = query.eq('category', config.categoryName);
        }
        
        if (config.refinements && !config.refinements.includes('all') && config.refinements.length > 0) {
          query = query.in('subcategory', config.refinements);
        } else if (config.refinement && config.refinement !== 'all') {
          query = query.eq('subcategory', config.refinement);
        }

        const { data, error } = await query;
        
        // Fetch user history to support "new" and "review" modes
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
        
        if (!error && data) {
          let pool = data;
          
          if (config.status === "new" && seenIds.length > 0) {
            pool = pool.filter((q: any) => !seenIds.includes(q.id));
          } else if (config.status === "review") {
            pool = pool.filter((q: any) => incorrectIds.includes(q.id));
          }

          if (config.type === "traditional") pool = pool.filter((q: any) => q.type.startsWith("mcq") && q.group_type !== "grouped");
          if (config.type === "next-gen") {
            pool = pool.filter((q: any) => {
              if (q.group_type === "grouped") {
                const subs = q.options?.subQuestions || [];
                const hasTrad = subs.some((s: any) => s.type?.startsWith("mcq") || s.type === "traditional");
                const hasNgn = subs.some((s: any) => s.type && !s.type.startsWith("mcq") && s.type !== "traditional");
                if (hasTrad && hasNgn) return false;
                return true;
              }
              return !q.type.startsWith("mcq");
            });
          }
          
          // Randomize parent questions
          pool.sort(() => Math.random() - 0.5);

          if (config.count && config.count !== 999) {
            let selectedParents = [];
            let itemCount = 0;
            for (const q of pool) {
              if (itemCount >= config.count) break;
              selectedParents.push(q);
              itemCount += (q.group_type === "grouped" ? (q.options?.subQuestions?.length || 1) : 1);
            }
            pool = selectedParents;
          }

          pool = pool.flatMap((q: any) => {
            if (q.group_type === "grouped") {
              const subQuestions = q.options?.subQuestions || [];
              const scenario_tabs = q.options?.scenario_tabs || null;
              
              return subQuestions.map((sub: any, idx: number) => {
                const rawOptions = Array.isArray(sub.options) ? sub.options : (sub.options?.mcq_options || null);
                return {
                  ...sub,
                  id: `${q.id}-sub-${idx}`,
                  parent_id: q.id,
                  category: q.category,
                  subcategory: q.subcategory,
                  difficulty: q.difficulty,
                  marking_scheme: sub.marking_scheme || q.marking_scheme,
                  text: sub.stem,
                  parent_stem: q.stem,
                  correctId: rawOptions ? rawOptions.find((o: any) => o.correct)?.letter : null,
                  correctIds: rawOptions ? rawOptions.filter((o: any) => o.correct).map((o: any) => o.letter) : [],
                  options: rawOptions ? rawOptions.map((o: any) => ({ id: o.letter, text: o.text })) : sub.options,
                  scenario_tabs: migrateScenarioTabs(sub.scenario_tabs || scenario_tabs),
                  is_subquestion: true,
                  sub_index: idx,
                  sub_total: subQuestions.length
                };
              });
            } else {
              const rawOptions = Array.isArray(q.options) ? q.options : (q.options?.mcq_options || null);
              return [{
                ...q,
                text: q.stem,
                correctId: rawOptions ? rawOptions.find((o: any) => o.correct)?.letter : null,
                correctIds: rawOptions ? rawOptions.filter((o: any) => o.correct).map((o: any) => o.letter) : [],
                options: rawOptions ? rawOptions.map((o: any) => ({ id: o.letter, text: o.text })) : q.options,
                scenario_tabs: migrateScenarioTabs(q.options?.scenario_tabs || null)
              }];
            }
          });

          setActivePool(pool);
        }

        const { data: sData } = await supabase.from('test_sessions').insert({ 
          student_id: user?.id 
        }).select('id').single();
        if (sData) setSessionId(sData.id);
      }
      
      setLoading(false);
    }
    initSession();
  }, [config, user]);

  const getInitialState = (q: any) => {
    if (!q) return null;
    if (q.type === "traditional") return null;
    if (q.type === "next-gen-cloze") return {};
    if (q.type === "table") return {};
    if (q.type === "bowtie") return { condition: null, actions: [], parameters: [], activeSlot: null };
    if (q.type === "next-gen-order") return [...(q.steps || [])];
    if (q.type === "next-gen-highlight") return [];
    if (q.type === "next-gen-sata" || q.type === "mcq-multi") return [];
    return null;
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const activeQuestion = activePool[currentIndex];
  const [activeTab, setActiveTab] = useState(0);
  const [activeEhrTab, setActiveEhrTab] = useState(0);

  useEffect(() => {
    setActiveTab(0);
    setActiveEhrTab(0);
  }, [currentIndex]);
  
  // Generic answer state
  const [answerState, setAnswerState] = useState<any>(null);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (activePool.length > 0 && timeRemaining === null && config.mode !== 'review') {
      const totalTime = activePool.reduce((acc, q) => acc + (q.time_est || 90), 0);
      setTimeRemaining(totalTime);
    }
  }, [activePool, timeRemaining, config.mode]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || config.mode === 'review') return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, config.mode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (activePool.length === 0) return;
    const q = activePool[currentIndex];
    
    if (config.mode === 'review') {
      setAnswerState(q._submittedAnswer);
      setIsSubmitted(true);
    } else if (q._sessionSubmitted) {
      setAnswerState(q._sessionAnswerState);
      setIsSubmitted(true);
    } else if (!answerState) {
      setAnswerState(getInitialState(q));
      setIsSubmitted(false);
    }
  }, [currentIndex, activePool, config.mode]);

  // Derived validation logic based on type
  const canSubmit = useMemo(() => {
    if (isSubmitted || !answerState) return false;
    switch (activeQuestion.type) {
      case "traditional": 
      case "mcq-single":
        return typeof answerState === "string";
      case "next-gen-cloze": {
        const blankIds = Object.keys(activeQuestion.options?.blanks || {});
        return blankIds.length > 0 && blankIds.every(id => {
          const val = answerState[id];
          return val && activeQuestion.options?.blanks?.[id]?.options?.includes(val);
        });
      }
      case "table": {
        const rowCount = activeQuestion.options?.rows?.length || 0;
        if (activeQuestion.options?.multiSelect) {
          return Object.keys(answerState).filter(k => Array.isArray(answerState[k]) && answerState[k].length > 0).length === rowCount;
        }
        return Object.keys(answerState).length === rowCount;
      }
      case "bowtie": {
        const expectedActs = activeQuestion.options?.actions?.filter((x: any) => x.isCorrect).length || 2;
        const expectedParams = activeQuestion.options?.parameters?.filter((x: any) => x.isCorrect).length || 2;
        return (answerState.actions?.filter(Boolean).length === expectedActs) && (answerState.parameters?.filter(Boolean).length === expectedParams);
      }
      case "next-gen-order": return true; // Can submit any order
      case "next-gen-highlight": return answerState.length > 0;
      case "next-gen-sata": 
      case "mcq-multi":
        return answerState.length > 0;
      default: return false;
    }
  }, [activeQuestion, answerState, isSubmitted]);

  const isCorrect = useMemo(() => {
    if (!answerState || !activeQuestion) return false;
    switch (activeQuestion.type) {
      case "traditional": 
      case "mcq-single":
        return answerState === activeQuestion.correctId;
      case "next-gen-cloze": {
        return Object.entries(activeQuestion.options?.blanks || {}).every(([key, blank]) => (blank as any).correct === answerState[key]);
      }
      case "table":
        if (activeQuestion.options?.multiSelect) {
          return Object.entries(activeQuestion.options?.correctAnswers || {}).every(([rowId, colIds]: [string, any]) => {
            const ansIds = answerState[rowId] || [];
            return Array.isArray(colIds) && ansIds.length === colIds.length && ansIds.every((id: string) => colIds.includes(id));
          });
        }
        return Object.entries(activeQuestion.options?.correctAnswers || {}).every(([rowId, colId]) => answerState[rowId] === colId);
      case "bowtie": {
        const opts = activeQuestion.options || {};
        const correctActs = opts.actions?.filter((a: any) => a.isCorrect).map((a: any) => a.text) || [];
        const correctParams = opts.parameters?.filter((p: any) => p.isCorrect).map((p: any) => p.text) || [];
        
        const actsCorrect = (answerState.actions || []).every((a: string) => a && correctActs.includes(a)) && answerState.actions?.filter(Boolean).length === correctActs.length;
        const paramsCorrect = (answerState.parameters || []).every((p: string) => p && correctParams.includes(p)) && answerState.parameters?.filter(Boolean).length === correctParams.length;
        return actsCorrect && paramsCorrect;
      }
      case "next-gen-order":
        return JSON.stringify((answerState || []).map((s: any) => s.id)) === JSON.stringify(activeQuestion.correctOrder);
      case "next-gen-highlight":
        const hlAns = activeQuestion.options?.correctHighlights || [];
        if (hlAns.length !== (answerState.length || 0)) return false;
        return (answerState || []).every((id: string) => hlAns.includes(id));
      case "next-gen-sata":
      case "mcq-multi":
        const sataAns = activeQuestion.correctIds || [];
        if (sataAns.length !== (answerState.length || 0)) return false;
        return (answerState || []).every((id: string) => sataAns.includes(id));
      default: return false;
    }
  }, [activeQuestion, answerState]);

  const handleNext = () => {
    if (currentIndex < activePool.length - 1) {
      const nextIdx = currentIndex + 1;
      const nextQ = activePool[nextIdx];
      if (config.mode === 'review' || nextQ._sessionSubmitted) {
        setAnswerState(config.mode === 'review' ? nextQ._submittedAnswer : nextQ._sessionAnswerState);
        setIsSubmitted(true);
      } else {
        setIsSubmitted(false);
        setAnswerState(getInitialState(nextQ));
      }
      setCurrentIndex(nextIdx);
    } else {
      if (config.mode !== 'review') handleEndSession();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      const prevQ = activePool[prevIdx];
      if (config.mode === 'review' || prevQ._sessionSubmitted) {
        setAnswerState(config.mode === 'review' ? prevQ._submittedAnswer : prevQ._sessionAnswerState);
        setIsSubmitted(true);
      } else {
        setIsSubmitted(false);
        setAnswerState(getInitialState(prevQ));
      }
      setCurrentIndex(prevIdx);
    }
  };

  const handleSubmitAnswer = async () => {
    setIsSubmitted(true);
    
    const updatedPool = [...activePool];
    updatedPool[currentIndex]._sessionSubmitted = true;
    updatedPool[currentIndex]._sessionAnswerState = answerState;
    setActivePool(updatedPool);

    if (sessionId && activeQuestion) {
      const payloadOptions = activeQuestion.is_subquestion 
        ? { answers: answerState, _sub_index: activeQuestion.sub_index }
        : answerState;

      const { error } = await supabase.from('test_answers').insert({
        session_id: sessionId,
        question_id: activeQuestion.parent_id || activeQuestion.id,
        selected_options: payloadOptions,
        is_correct: isCorrect
      });
      if (error) {
        console.error("Failed to insert test answer:", error);
      }
    }
  };

  const handleSkip = async () => {
    const updatedPool = [...activePool];
    updatedPool[currentIndex]._sessionSubmitted = false;
    updatedPool[currentIndex]._sessionAnswerState = null;
    setActivePool(updatedPool);

    if (sessionId && activeQuestion) {
      const payloadOptions = activeQuestion.is_subquestion 
        ? { answers: null, _sub_index: activeQuestion.sub_index }
        : null;

      const { error } = await supabase.from('test_answers').insert({
        session_id: sessionId,
        question_id: activeQuestion.parent_id || activeQuestion.id,
        selected_options: payloadOptions,
        is_correct: false
      });
      if (error) {
        console.error("Failed to insert skipped test answer:", error);
      }
    }
    handleNext();
  };

  const handleEndSession = async () => {
    if (sessionId) {
      let startSkipIndex = currentIndex;
      if (config.mode !== 'review') {
        if (!isSubmitted && answerState && canSubmit && activeQuestion) {
          await supabase.from('test_answers').insert({
            session_id: sessionId,
            question_id: activeQuestion.id,
            selected_options: answerState,
            is_correct: isCorrect
          });
          startSkipIndex = currentIndex + 1;
        } else if (isSubmitted) {
          startSkipIndex = currentIndex + 1;
        }

        const skippedQuestions = activePool.slice(startSkipIndex).map((q) => ({
          session_id: sessionId,
          question_id: q.id,
          selected_options: null,
          is_correct: false
        }));

        if (skippedQuestions.length > 0) {
          const { error } = await supabase.from('test_answers').insert(skippedQuestions);
          if (error) console.error("Failed to insert skipped questions:", error);
        }
      }

      await supabase.from('test_sessions').update({ completed_at: new Date().toISOString() }).eq('id', sessionId);
    }
    navigate("/student");
  };

  const progressPercent = activePool.length > 0 ? Math.round(((currentIndex + 1) / activePool.length) * 100) : 0;

  if (loading) return <StudentLayout title="Loading..."><div className="p-8">Loading questions...</div></StudentLayout>;
  if (!activeQuestion) return <StudentLayout title="No Questions"><div className="p-8">No questions found for this test.</div></StudentLayout>;

  // -------- RENDERERS --------

  const renderTraditional = () => {
    return (
      <div className="space-y-3">
        {activeQuestion.options?.map((option: any, index: number) => {
          const isSelected = answerState === option.id;
          const showCorrect = isSubmitted && option.id === activeQuestion.correctId;
          const showIncorrect = isSubmitted && isSelected && !isCorrect;
          
          const label = String.fromCharCode(65 + index);

          return (
            <button
              key={option.id}
              disabled={isSubmitted}
              onClick={() => setAnswerState(option.id)}
              className={cn(
                "group relative flex w-full items-center justify-between gap-4 rounded-full border p-3 pl-4 text-left transition-all",
                !isSubmitted && isSelected ? "border-teal-700 bg-teal-50/20 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                showCorrect && "border-green-500 bg-green-50",
                showIncorrect && "border-red-500 bg-red-50"
              )}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <input 
                  type="radio" 
                  checked={isSelected}
                  readOnly
                  className="size-4 shrink-0 cursor-pointer accent-teal-700" 
                />
                <span className="font-bold text-slate-500 text-[13px]">{label}.</span>
                <div className={cn("text-[13px] break-words min-w-0 font-medium", (showCorrect || (isSelected && !isSubmitted)) ? "text-slate-900" : "text-slate-700")}>
                  {option.text}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };


  const renderSata = () => {
    const selected = (answerState || []) as string[];
    const toggle = (id: string) => {
      if (selected.includes(id)) setAnswerState(selected.filter(x => x !== id));
      else setAnswerState([...selected, id]);
    };

    return (
      <div className="space-y-2">
        {activeQuestion.options?.map((option) => {
          const isSelected = selected.includes(option.id);
          const isExpected = activeQuestion.correctIds?.includes(option.id);
          
          let highlightClass = "";
          let icon = null;
          
          if (isSubmitted) {
            if (isExpected && isSelected) {
              highlightClass = "border-success bg-success/10 ring-1 ring-success/20";
              icon = <CheckCircle2 className="size-4 text-success-foreground" />;
            } else if (isExpected && !isSelected) {
              highlightClass = "border-warning bg-warning/10 ring-1 ring-warning/20 border-dashed";
              icon = <CheckCircle2 className="size-4 text-warning-foreground" />;
            } else if (!isExpected && isSelected) {
              highlightClass = "border-destructive bg-destructive/10 ring-1 ring-destructive/20";
              icon = <XCircle className="size-4 text-destructive-foreground" />;
            } else {
              highlightClass = "border-border bg-card opacity-50";
            }
          } else if (isSelected) {
            highlightClass = "border-primary bg-primary/5 ring-1 ring-primary/20";
          } else {
            highlightClass = "border-border bg-card hover:border-primary/40";
          }

          return (
            <button
              key={option.id}
              disabled={isSubmitted}
              onClick={() => toggle(option.id)}
              className={cn("group relative flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all", highlightClass)}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="size-4 shrink-0 cursor-pointer accent-primary"
                />
                <span className="font-bold text-muted-foreground text-[13px]">{option.id}.</span>
                <div className={cn("flex-1 text-[13px] break-words min-w-0", (isSelected && !isSubmitted) ? "font-medium text-foreground" : "text-muted-foreground", isSubmitted && "text-foreground")}>
                  {option.text}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderCloze = () => {
    if (!activeQuestion.text) return null;
    const answers = answerState || {};

    const parseHtmlToReact = (htmlString: string) => {
      const doc = new DOMParser().parseFromString(htmlString, 'text/html');

      const renderNode = (node: Node, index: number): React.ReactNode => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          const parts = text.split(/({(?:dropdown\s+)?[0-9]+})/);
          if (parts.length === 1) return text;

          return (
            <span key={index}>
              {parts.map((part, i) => {
                const match = part.match(/{(?:dropdown\s+)?([0-9]+)}/);
                if (match) {
                  const blankId = match[1];
                  const blanksConfig = activeQuestion.clozeBlanks || activeQuestion.options?.blanks;
                  const blank = blanksConfig?.[blankId];
                  if (!blank) return null;
                  
                  let isAnsweredCorrectly = answers[blankId] === blank.correct;
                  let availableOptions = blank.options;
                  
                  const activeClozeDeps = activeQuestion.clozeDependencies || activeQuestion.options?.clozeDependencies;
                  if (activeClozeDeps && activeClozeDeps.length > 0) {
                    const deps = activeClozeDeps;
                    const dep = deps.find((d: any) => String(d.targetBlankId) === String(blankId));
                    if (dep) {
                      const sourceVal = answers[dep.sourceBlankId];
                      if (sourceVal && dep.mapping[sourceVal]) {
                        availableOptions = blank.options.filter((opt: string) => dep.mapping[sourceVal].includes(opt));
                      } else {
                        availableOptions = [];
                      }
                    }
                  }
                  
                  const validAnswer = availableOptions.includes(answers[blankId]) ? answers[blankId] : "";

                  return (
                    <span key={i} className="inline-flex relative mx-1 my-0.5 align-middle">
                      {isSubmitted ? (
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold text-[15px] border shadow-sm",
                          isAnsweredCorrectly 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-red-50 text-red-700 border-red-200"
                        )}>
                          <span className={cn(!isAnsweredCorrectly && "line-through opacity-70")}>
                            {answers[blankId] || "No answer"}
                          </span>
                          {!isAnsweredCorrectly && (
                            <>
                              <span className="text-slate-300">→</span>
                              <span className="text-green-700">{blank.correct}</span>
                            </>
                          )}
                          {isAnsweredCorrectly ? (
                            <CheckCircle2 className="size-4" weight="bold" />
                          ) : (
                            <XCircle className="size-4 text-red-500" weight="bold" />
                          )}
                        </span>
                      ) : (
                        <div className="relative">
                          <Select
                            disabled={isSubmitted}
                            value={validAnswer}
                            onValueChange={(value) => {
                              const newAns = { ...answers, [blankId]: value };
                              if (activeQuestion.options?.clozeDependencies) {
                                const deps = activeQuestion.options.clozeDependencies;
                                
                                let currentSources = [blankId];
                                let targetsToClear = new Set<string>();
                                
                                while (currentSources.length > 0) {
                                  const nextSources: string[] = [];
                                  for (const source of currentSources) {
                                    const matchingDeps = deps.filter((d: any) => String(d.sourceBlankId) === String(source));
                                    for (const d of matchingDeps) {
                                      targetsToClear.add(String(d.targetBlankId));
                                      nextSources.push(String(d.targetBlankId));
                                    }
                                  }
                                  currentSources = nextSources;
                                }
                                
                                for (const target of targetsToClear) {
                                  newAns[target] = "";
                                }
                              }
                              setAnswerState(newAns);
                            }}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 cursor-pointer rounded-lg border px-3 text-[13px] font-medium outline-none transition-all min-w-[200px] shadow-none [&>span]:w-full [&>span]:text-left border-slate-300 bg-white hover:border-teal-700 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 text-slate-800 [&>svg]:text-teal-700 [&>svg]:opacity-100"
                              )}
                            >
                              <SelectValue placeholder="Select answer" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {availableOptions.map((opt: string) => (
                                <SelectItem key={opt} value={opt} className="text-[13px] cursor-pointer">
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </span>
                  );
                }
                return part;
              })}
            </span>
          );
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tagName = el.tagName.toLowerCase();
          
          if (tagName === 'script' || tagName === 'style' || tagName === 'html' || tagName === 'head' || tagName === 'body') {
             if (tagName === 'body') {
               return React.createElement(React.Fragment, { key: index }, Array.from(el.childNodes).map((child, i) => renderNode(child, i)));
             }
             return null;
          }

          const children = Array.from(el.childNodes).map((child, i) => renderNode(child, i));
          
          const props: any = { key: index };
          Array.from(el.attributes).forEach(attr => {
             let name = attr.name;
             if (name === 'class') name = 'className';
             if (name === 'style') return; // Skip complex inline styles mapping
             props[name] = attr.value;
          });

          return React.createElement(tagName, props, children.length > 0 ? children : null);
        }
        
        return null;
      };

      return Array.from(doc.body.childNodes).map((node, i) => renderNode(node, i));
    };
    
    return (
      <div className="leading-[2.25rem] text-[14px] text-slate-800">
        {parseHtmlToReact(activeQuestion.text)}
      </div>
    );
  };

  const renderMatrix = () => {
    const answers = answerState || {};
    const correctAns = activeQuestion.options?.correctAnswers || {};

    return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="p-4 font-semibold">Assessment Finding</th>
              {activeQuestion.options?.columns?.map((c: any) => <th key={c.id} className="p-4 text-center font-semibold">{c.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activeQuestion.options?.rows?.map((r: any) => (
              <tr key={r.id}>
                <td className="p-4 font-medium text-foreground">{r.text}</td>
                {activeQuestion.options?.columns?.map((c: any) => {
                  const isMulti = activeQuestion.options?.multiSelect;
                  const isSelected = isMulti ? (answers[r.id] || []).includes(c.id) : answers[r.id] === c.id;
                  const isExpected = isMulti ? (correctAns[r.id] || []).includes(c.id) : correctAns[r.id] === c.id;
                  let bgClass = "";
                  
                  if (isSubmitted) {
                    if (isSelected && isExpected) bgClass = "bg-success/20 ring-2 ring-inset ring-success";
                    else if (isSelected && !isExpected) bgClass = "bg-destructive/20 ring-2 ring-inset ring-destructive";
                    else if (!isSelected && isExpected) bgClass = "bg-warning/20 ring-2 ring-inset ring-warning";
                  }

                  return (
                    <td key={c.id} className={cn("p-4 text-center transition-colors", bgClass)}>
                      <input 
                        type={isMulti ? "checkbox" : "radio"} 
                        disabled={isSubmitted}
                        name={`row-${r.id}`} 
                        checked={isSelected}
                        onChange={() => {
                          if (isMulti) {
                            const current = answers[r.id] || [];
                            const newArr = isSelected ? current.filter((id: string) => id !== c.id) : [...current, c.id];
                            setAnswerState({ ...answers, [r.id]: newArr });
                          } else {
                            setAnswerState({ ...answers, [r.id]: c.id });
                          }
                        }}
                        className="size-5 cursor-pointer accent-primary" 
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderHighlight = () => {
    const selected = (answerState || []) as string[];
    const toggle = (id: string) => {
      if (selected.includes(id)) setAnswerState(selected.filter(x => x !== id));
      else setAnswerState([...selected, id]);
    };

    let tables = activeQuestion.options?.tables;
    if (activeQuestion.options?.layout === "table" && !tables && activeQuestion.options?.tableRows) {
      tables = [{
        id: "default",
        tabName: activeQuestion.options.tableTabName || "History and Physical",
        headers: activeQuestion.options.tableHeaders || { col1: "Body System", col2: "Findings" },
        rows: activeQuestion.options.tableRows
      }];
    }

    return (
      <div className="space-y-4">
        {activeQuestion.options?.layout === "table" ? (
          <div className="flex flex-col mt-4">
            <div className="flex border-b border-slate-300 gap-1 overflow-x-auto">
              {(tables || []).map((t: any, idx: number) => (
                <button
                  key={t.id}
                  onClick={() => setActiveEhrTab(idx)}
                  className={cn(
                    "px-5 py-2.5 text-[13px] font-bold rounded-t-md relative z-10 transition-colors border border-b-0",
                    activeEhrTab === idx
                      ? "text-slate-700 bg-white border-slate-300 -mb-[1px]"
                      : "text-slate-500 bg-slate-50 border-transparent hover:bg-slate-100"
                  )}
                >
                  {t.tabName || "Unnamed Tab"}
                </button>
              ))}
            </div>
            
            {tables && tables[activeEhrTab] && (
              <div className="overflow-x-auto border border-slate-300 bg-white">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-[#eaf3fa] text-slate-900 border-b border-slate-300">
                    <tr>
                      <th className="p-4 font-bold w-[30%]">{tables[activeEhrTab].headers?.col1 || "Body System"}</th>
                      <th className="p-4 font-bold">{tables[activeEhrTab].headers?.col2 || "Findings"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tables[activeEhrTab].rows?.map((row: any, rIndex: number) => (
                      <tr key={row.id} className={rIndex % 2 === 0 ? "bg-slate-50/70" : "bg-white"}>
                        <td className="p-4 font-bold text-slate-800 align-top">{row.label}</td>
                        <td className="p-4 leading-relaxed align-top">
                          {row.sentences?.map((s: any, i: number) => {
                            const isSelected = selected.includes(s.id);
                            const isExpected = activeQuestion.options?.correctHighlights?.includes(s.id);
                            let highlightClass = "bg-transparent hover:bg-yellow-100 dark:hover:bg-yellow-900/50 cursor-pointer transition-colors";
                            if (isSubmitted) {
                              if (isSelected && isExpected) highlightClass = "bg-success/30 border-b-2 border-success font-semibold";
                              else if (isSelected && !isExpected) highlightClass = "bg-destructive/30 border-b-2 border-destructive line-through";
                              else if (!isSelected && isExpected) highlightClass = "bg-warning/30 border-b-2 border-warning border-dashed";
                              else highlightClass = "opacity-50 cursor-default";
                            } else if (isSelected) {
                              highlightClass = "bg-yellow-300 text-slate-900 dark:bg-yellow-500 dark:text-slate-900";
                            }

                            return (
                              <span key={s.id}>
                                <span
                                  onClick={() => !isSubmitted && toggle(s.id)}
                                  className={cn("transition-all rounded-sm py-0.5", highlightClass)}
                                >
                                  {s.text}
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
        ) : (
          <div className="space-y-2 text-[14px] leading-relaxed text-slate-800">
            {activeQuestion.options?.sentences?.map((s: any, i: number) => {
              if (s.isClickable === false) {
                 return <span key={s.id}>{s.text}</span>;
              }

              const isSelected = selected.includes(s.id);
              const isExpected = activeQuestion.options?.correctHighlights?.includes(s.id);
              
              let highlightClass = "bg-transparent hover:bg-yellow-100 dark:hover:bg-yellow-900/50 cursor-pointer transition-colors";
              if (isSubmitted) {
                if (isSelected && isExpected) highlightClass = "bg-success/30 border-b-2 border-success font-semibold";
                else if (isSelected && !isExpected) highlightClass = "bg-destructive/30 border-b-2 border-destructive line-through";
                else if (!isSelected && isExpected) highlightClass = "bg-warning/30 border-b-2 border-warning border-dashed";
                else highlightClass = "opacity-50 cursor-default";
              } else if (isSelected) {
                highlightClass = "bg-yellow-300 text-slate-900 dark:bg-yellow-500 dark:text-slate-900";
              }

              return (
                <span key={s.id}>
                  <span
                    onClick={() => !isSubmitted && toggle(s.id)}
                    className={cn("transition-all rounded-sm", highlightClass)}
                  >
                    {s.text}
                  </span>
                  {s.isClickable === undefined && i < (activeQuestion.options?.sentences?.length || 0) - 1 && " "}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderOrder = () => {
    const steps = answerState || [];
    
    return (
      <Reorder.Group 
        axis="y" 
        values={steps} 
        onReorder={(newOrder) => !isSubmitted && setAnswerState(newOrder)}
        className="space-y-3"
      >
        {steps.map((step: any, index: number) => {
          let stateClass = "border-border bg-card";
          if (isSubmitted) {
            const expectedIndex = activeQuestion.correctOrder?.indexOf(step.id);
            if (expectedIndex === index) stateClass = "border-success bg-success/10 ring-1 ring-success/20";
            else stateClass = "border-destructive bg-destructive/10 ring-1 ring-destructive/20";
          }

          return (
            <Reorder.Item 
              key={step.id} 
              value={step}
              className={cn("relative flex items-center gap-4 rounded-2xl border p-4 shadow-sm", stateClass, isSubmitted ? "cursor-default" : "cursor-grab active:cursor-grabbing hover:border-primary/50")}
            >
              <div className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
                <GripVertical className="size-5" />
              </div>
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                {index + 1}
              </div>
              <div className="font-medium text-foreground">{step.text}</div>
              
              {isSubmitted && activeQuestion.correctOrder?.indexOf(step.id) !== index && (
                <div className="ml-auto text-xs font-semibold text-destructive">
                  Should be #{activeQuestion.correctOrder!.indexOf(step.id) + 1}
                </div>
              )}
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    );
  };

  const renderBowtie = () => {
    const config = activeQuestion.bowtieConfig || activeQuestion.options || {};
    const state = answerState || { actions: [], condition: null, parameters: [] };
    
    const correctActions = config.actions?.filter((c: any) => c.isCorrect) || [];
    const correctConditions = config.conditions?.filter((c: any) => c.isCorrect) || [];
    const correctParameters = config.parameters?.filter((c: any) => c.isCorrect) || [];
    
    const actionSlotCount = Math.max(2, correctActions.length);
    const paramSlotCount = Math.max(2, correctParameters.length);
    
    const handleDragEnd = (event: any) => {
      const { active, over } = event;
      if (!over || isSubmitted) return;

      const word = active.data.current?.word;
      const sourceType = active.data.current?.typeId;
      const targetSlot = over.id;

      if (!word) return;

      const newState = { actions: [...(state.actions || [])], condition: state.condition, parameters: [...(state.parameters || [])] } as any;

      ["actions", "parameters"].forEach(key => {
        const idx = newState[key].indexOf(word);
        if (idx > -1) newState[key][idx] = null;
      });

      if (newState.condition === word) newState.condition = null;

      if (targetSlot.startsWith("bank-")) {
        setAnswerState(newState);
        return;
      }

      const [targetType, idxStr] = targetSlot.split("-");
      if (targetType === "condition") {
        newState.condition = word;
      } else if (["actions", "parameters"].includes(targetType)) {
        const targetIdx = parseInt(idxStr);
        newState[targetType][targetIdx] = word;
      } else {
        setAnswerState(newState);
        return;
      }
      
      setAnswerState(newState);
    };

    const DraggableWord = ({ word, typeId, state }: { word: string, typeId: string, state?: 'correct' | 'incorrect' }) => {
      const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `${typeId}::${word}`,
        data: { word, typeId },
        disabled: isSubmitted
      });
      const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
      
      let stateClass = "bg-white text-slate-700 border-slate-200 hover:border-slate-300";
      if (state === 'correct') {
        stateClass = "bg-green-50 text-green-800 border-green-500 ring-1 ring-green-500 hover:border-green-500";
      } else if (state === 'incorrect') {
        stateClass = "bg-red-50 text-red-800 border-red-500 ring-1 ring-red-500 hover:border-red-500";
      }

      return (
        <button
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={cn(
            "relative flex items-stretch rounded-none text-[13px] font-medium shadow-[0_1px_4px_-1px_rgba(0,0,0,0.05)] border touch-none group hover:shadow-sm",
            stateClass,
            !typeId.startsWith("bank-") ? "w-full h-full min-h-[3rem]" : "",
            isDragging ? "opacity-95 ring-2 ring-blue-400/30 scale-105 shadow-md rotate-1 z-50 transition-none" : "transition-all duration-300 ease-out",
            isSubmitted && "opacity-90 cursor-default hover:transform-none hover:shadow-sm"
          )}
        >
          <div className="px-4 py-2.5 flex-1 flex items-center justify-center text-center">
            <span className="tracking-tight leading-tight">{word}</span>
          </div>
        </button>
      );
    };

    const DroppableSlot = ({ label, id, value, isExpected, type }: any) => {
      const { isOver, setNodeRef } = useDroppable({ id });
      
      const isCause = type === 'cause';
      
      let uiClass = isCause 
        ? "bg-white border-blue-400/70 border-dashed hover:bg-blue-50/50 text-blue-600"
        : "bg-white border-teal-400/70 border-dashed hover:bg-teal-50/50 text-teal-600";
      
      if (isOver) {
        uiClass = isCause 
          ? "bg-blue-50 border-blue-400 text-blue-700 border-solid shadow-sm scale-[1.01]"
          : "bg-teal-50 border-teal-400 text-teal-700 border-solid shadow-sm scale-[1.01]";
      } else if (value) {
        uiClass = "border-transparent bg-transparent p-0";
      }

      if (isSubmitted && value) {
        uiClass = "border-transparent bg-transparent p-0";
      } else if (isSubmitted && !value) {
        uiClass = "bg-red-50 text-red-500 border-dashed border-red-300";
      }

      return (
        <div 
          ref={setNodeRef}
          className={cn("flex min-h-[3rem] w-full flex-col items-center justify-center rounded-none border px-2 py-2 transition-colors duration-200 cursor-pointer relative", uiClass)}
        >
          {value ? (
            <div className="flex w-full h-full items-center justify-center animate-in zoom-in-95 duration-200">
               <DraggableWord word={value} typeId={id} state={isSubmitted ? (isExpected(value) ? 'correct' : 'incorrect') : undefined} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-center">{label}</span>
            </div>
          )}
        </div>
      );
    };

    const DroppableWordBank = ({ children, id, className }: any) => {
      const { setNodeRef, isOver } = useDroppable({ id });
      return (
        <div 
          ref={setNodeRef} 
          className={cn(
            "flex min-h-[100px] transition-all duration-300", 
            isOver && "bg-slate-50/50 rounded-br-2xl", 
            className
          )}
        >
          {children}
        </div>
      );
    };

    return (
      <DndContext onDragEnd={handleDragEnd} sensors={sensors} collisionDetection={pointerWithin}>
        <div className="w-full max-w-[90rem] mx-auto mt-6 flex flex-col gap-6">
          <div className="w-full rounded-2xl bg-white border border-slate-200 shadow-sm select-none relative z-10">
            <div className="flex flex-col md:flex-row items-stretch justify-center p-6 lg:p-8 gap-4 w-full">
             
             {/* Actions Left */}
             <div className="flex-[1.2] flex flex-col">
               <div className="flex items-center gap-4 h-10 mb-6 shrink-0">
                 <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                 </div>
                 <span className="text-sm font-bold text-slate-800 uppercase tracking-widest">{config.actionLabel || "Causes & Assessments"}</span>
               </div>
               <div className="flex-1 flex flex-col gap-6 justify-around relative">
                 {Array.from({ length: actionSlotCount }).map((_, i: number) => (
                   <DroppableSlot key={i} label={config.actionLabel || "Cause / Assessment"} id={`actions-${i}`} type="cause" value={state.actions?.[i]} isExpected={(v: string) => correctActions.some((c: any) => c.text === v)} />
                 ))}
               </div>
             </div>

             {/* Connection Left -> Center */}
             <div className="hidden md:flex w-24 flex-col">
               <div className="h-10 mb-6 shrink-0"></div>
               <div className="relative flex-1">
                 <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 {Array.from({ length: actionSlotCount }).map((_, i: number) => {
                   const y = ((2 * i + 1) / (2 * actionSlotCount)) * 100;
                   return <path key={i} d={`M 0 ${y} L 100 50`} fill="none" stroke="#cbd5e1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />;
                 })}
               </svg>
               <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 text-slate-300">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
               </div>
               </div>
             </div>

             {/* Center */}
             <div className="flex-[1.4] flex flex-col px-2">
               <div className="flex items-center justify-center h-10 mb-6 shrink-0">
                 <span className="text-[11px] font-bold text-teal-700 uppercase tracking-widest">{config.conditionLabel || "Core Condition"}</span>
               </div>
               <div className="flex-1 flex flex-col items-center justify-center relative">
                 <DroppableSlot 
                   label={config.conditionLabel || "Core Condition"} 
                   id="condition-0" 
                   type="condition" 
                   value={state.condition} 
                   isExpected={(v: string) => correctConditions.some((c: any) => c.text === v)} 
                 />
               </div>
             </div>

             {/* Connection Center -> Right */}
             <div className="hidden md:flex w-24 flex-col">
               <div className="h-10 mb-6 shrink-0"></div>
               <div className="relative flex-1">
                 <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 {Array.from({ length: paramSlotCount }).map((_, i: number) => {
                   const y = ((2 * i + 1) / (2 * paramSlotCount)) * 100;
                   return <path key={i} d={`M 0 50 L 100 ${y}`} fill="none" stroke="#cbd5e1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />;
                 })}
               </svg>
               {Array.from({ length: paramSlotCount }).map((_, i: number) => {
                 const y = ((2 * i + 1) / (2 * paramSlotCount)) * 100;
                 return (
                   <div key={i} className="absolute right-[-4px] -translate-y-1/2 text-slate-300" style={{ top: `${y}%` }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                   </div>
                 );
               })}
               </div>
             </div>

             {/* Parameters Right */}
             <div className="flex-[1.2] flex flex-col">
               <div className="flex items-center justify-end gap-4 h-10 mb-6 shrink-0">
                 <span className="text-sm font-bold text-slate-800 uppercase tracking-widest text-right">{config.parameterLabel || "Treatments & Effects"}</span>
                 <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                 </div>
               </div>
               <div className="flex-1 flex flex-col gap-6 justify-around relative">
                 {Array.from({ length: paramSlotCount }).map((_, i: number) => (
                   <DroppableSlot key={i} label={config.parameterLabel || "Treatment / Effect"} id={`parameters-${i}`} type="parameter" value={state.parameters?.[i]} isExpected={(v: string) => correctParameters.some((c: any) => c.text === v)} />
                 ))}
               </div>
             </div>
           </div>
         </div>
           
         {isSubmitted ? (
           <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-6 h-fit">
             <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-slate-900">
               <BookOpen weight="fill" className="size-5 text-teal-700" />
               Detailed Explanation
             </h3>
             <div 
               className="text-[13px] leading-relaxed text-slate-600 break-words prose prose-sm prose-slate max-w-none"
               dangerouslySetInnerHTML={{ __html: activeQuestion.rationale || "No explanation provided for this question." }}
             />
           </div>          ) : (
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 rounded-2xl bg-white border border-slate-200 shadow-sm p-6 relative z-20">
               {/* Actions Word Bank */}
               <div className="flex flex-col border border-slate-200 rounded-xl bg-slate-50/50">
                 <div className="bg-white py-3 px-4 font-bold text-slate-800 text-center text-[13px] border-b border-slate-200 uppercase tracking-wide rounded-t-xl">Causes & Assessments</div>
                 <DroppableWordBank id="bank-actions" className="flex flex-col gap-3 p-4 flex-1">
                   {config.actions?.filter((item: any) => item.text).sort((a: any, b: any) => a.text.localeCompare(b.text)).map((item: any, idx: number) => {
                     const isUsed = state.actions?.includes(item.text);
                     if (isUsed) return <div key={`act-${idx}`} className="h-10 w-full rounded-none bg-slate-100/50 border border-slate-200/50 pointer-events-none"></div>;
                     return <DraggableWord key={`act-${idx}`} word={item.text} typeId="bank-actions" />;
                   })}
                 </DroppableWordBank>
               </div>

               {/* Conditions Word Bank */}
               <div className="flex flex-col border border-slate-200 rounded-xl bg-slate-50/50">
                 <div className="bg-white py-3 px-4 font-bold text-slate-800 text-center text-[13px] border-b border-slate-200 uppercase tracking-wide rounded-t-xl">Core Conditions</div>
                 <DroppableWordBank id="bank-conditions" className="flex flex-col gap-3 p-4 flex-1">
                   {config.conditions?.filter((item: any) => item.text).sort((a: any, b: any) => a.text.localeCompare(b.text)).map((item: any, idx: number) => {
                     const isUsed = state.condition === item.text;
                     if (isUsed) return <div key={`cond-${idx}`} className="h-10 w-full rounded-none bg-slate-100/50 border border-slate-200/50 pointer-events-none"></div>;
                     return <DraggableWord key={`cond-${idx}`} word={item.text} typeId="bank-conditions" />;
                   })}
                 </DroppableWordBank>
               </div>

               {/* Parameters Word Bank */}
               <div className="flex flex-col border border-slate-200 rounded-xl bg-slate-50/50">
                 <div className="bg-white py-3 px-4 font-bold text-slate-800 text-center text-[13px] border-b border-slate-200 uppercase tracking-wide rounded-t-xl">Treatments & Effects</div>
                 <DroppableWordBank id="bank-parameters" className="flex flex-col gap-3 p-4 flex-1">
                   {config.parameters?.filter((item: any) => item.text).sort((a: any, b: any) => a.text.localeCompare(b.text)).map((item: any, idx: number) => {
                     const isUsed = state.parameters?.includes(item.text);
                     if (isUsed) return <div key={`param-${idx}`} className="h-10 w-full rounded-none bg-slate-100/50 border border-slate-200/50 pointer-events-none"></div>;
                     return <DraggableWord key={`param-${idx}`} word={item.text} typeId="bank-parameters" />;
                   })}
                 </DroppableWordBank>
               </div>
            </div>
          )}
        </div>
      </DndContext>
    );
  };

  const renderContent = () => {
    switch (activeQuestion.type) {
      case "traditional": 
      case "mcq-single":
        return renderTraditional();
      case "next-gen-cloze": return (
        <div className={cn(
          "rounded-xl overflow-hidden",
          !isSubmitted ? "border border-slate-200 bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] p-8 pb-10" : ""
        )}>
          {renderCloze()}
        </div>
      );
      case "next-gen-matrix":
      case "table": return renderMatrix();
      case "bowtie": return renderBowtie();
      case "next-gen-order": return renderOrder();
      case "next-gen-highlight": return (
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">Electronic Health Record</h2>
          {renderHighlight()}
        </div>
      );
      case "next-gen-sata": 
      case "mcq-multi":
        return renderSata();
      default: return null;
    }
  };

  const renderHeader = () => {
    let contentHTML = activeQuestion.type === "next-gen-cloze" && !activeQuestion.is_subquestion 
      ? "Complete the statement" 
      : activeQuestion.text;

    contentHTML = (contentHTML || "").replace(/{dropdown\s*\d*}/gi, '________');

    return (
      <>
        {activeQuestion.is_subquestion ? (
          <div className="mb-3 text-[13px] font-bold text-slate-800">
            Item {activeQuestion.sub_index + 1} of {activeQuestion.sub_total}
          </div>
        ) : (
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Question {(currentIndex + 1).toString().padStart(2, '0')}</div>
        )}
        <div className="mb-6 flex items-start gap-3">
          <div className="mt-1 font-bold text-teal-700 text-[15px] shrink-0">Q:</div>
          <div 
            className="text-[14px] font-normal leading-relaxed text-slate-800 break-words prose prose-slate prose-sm max-w-none prose-p:my-1"
            dangerouslySetInnerHTML={{ __html: contentHTML }}
          />
        </div>
      </>
    );
  };

  const renderScenario = () => {
    if (!activeQuestion.scenario_tabs || activeQuestion.scenario_tabs.length === 0) return null;
    return (
      <div className={cn("mt-6", !activeQuestion.is_subquestion && "mb-8")}>
        <div className="flex overflow-x-auto gap-2 z-10 relative px-0 -mb-[1px]">
          {activeQuestion.scenario_tabs.map((tab: any, i: number) => {
            const isActive = activeTab === i;
            return (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={cn(
                  "px-5 py-2 text-[13.5px] whitespace-nowrap border rounded-none transition-colors relative",
                  isActive 
                    ? "bg-white font-bold text-slate-900 border-slate-400 border-b-white z-20" 
                    : "bg-white font-normal text-slate-800 border-slate-400 hover:bg-slate-50 z-0"
                )}
              >
                {tab.title}
              </button>
            );
          })}
        </div>
        <div className="bg-white border border-slate-400 rounded-none p-0 md:p-0 relative z-10 overflow-hidden">
          {(!activeQuestion.scenario_tabs[activeTab]?.type || activeQuestion.scenario_tabs[activeTab]?.type === "text") ? (
            <div className="p-5 md:p-8">
              <div 
                className="prose prose-slate max-w-none text-slate-800 break-words text-[14.5px] leading-[1.6]" 
                dangerouslySetInnerHTML={{ __html: activeQuestion.scenario_tabs[activeTab]?.content || "<div class='text-slate-400 italic'>No content provided</div>" }} 
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px]">
                <thead className="bg-[#eaf3fa] text-slate-900 border-b border-slate-300">
                  <tr>
                    {activeQuestion.scenario_tabs[activeTab]?.tableHeaders?.map((header: string, hIdx: number) => (
                      <th key={hIdx} className={cn("p-4 md:px-6 md:py-4 font-bold", hIdx === 0 && "w-[30%]")}>{header || `Column ${hIdx + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeQuestion.scenario_tabs[activeTab]?.tableRows?.map((row: any, rIndex: number) => (
                    <tr key={row.id || rIndex} className={rIndex % 2 === 0 ? "bg-slate-50/70" : "bg-white"}>
                      {row.cells?.map((cell: string, cIdx: number) => (
                        <td key={cIdx} className={cn("p-4 md:px-6 md:py-4 align-top", cIdx === 0 ? "font-bold text-slate-800" : "leading-relaxed")}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                  {(!activeQuestion.scenario_tabs[activeTab]?.tableRows || activeQuestion.scenario_tabs[activeTab]?.tableRows.length === 0) && (
                    <tr>
                      <td colSpan={activeQuestion.scenario_tabs[activeTab]?.tableHeaders?.length || 2} className="p-8 text-center text-slate-400 italic">No rows provided</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderInteractive = () => (
    <>
      {!isSubmitted ? (
        <div className="animate-in fade-in duration-500 h-full flex flex-col">
          {(activeQuestion.type.startsWith('mcq') || activeQuestion.type === 'next-gen-sata') && (
            <div className="mb-4 text-[13px] font-medium text-slate-700 italic">Select {activeQuestion.type === 'mcq-multi' || activeQuestion.type === 'next-gen-sata' ? 'all that apply' : 'one answer'}</div>
          )}
          {activeQuestion.type === "next-gen-cloze" && (activeQuestion.options?.clozeDependentMode || (activeQuestion.options?.clozeDependencies && activeQuestion.options.clozeDependencies.length > 0)) && (
            <div className="mb-4 flex items-center gap-2 text-[13px] text-teal-700 font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              Options for some blanks depend on your previous selections.
            </div>
          )}
          {activeQuestion.is_subquestion && (
            <div className="mb-6 flex items-start gap-3">
              <div className="mt-1 font-bold text-teal-700 text-[15px] shrink-0">Q:</div>
              <div 
                className="text-[14px] font-normal leading-relaxed text-slate-800 break-words prose prose-slate prose-sm max-w-none prose-p:my-1"
                dangerouslySetInnerHTML={{ __html: activeQuestion.text }}
              />
            </div>
          )}
          <div className={cn("flex-1", activeQuestion.type === 'bowtie' && "pt-2")}>
            {renderContent()}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Question Review</div>
          {activeQuestion.is_subquestion && (
            <div className="mb-6 flex items-start gap-3">
              <div className="mt-1 font-bold text-teal-700 text-[15px] shrink-0">Q:</div>
              <div 
                className="text-[14px] font-normal leading-relaxed text-slate-800 break-words prose prose-slate prose-sm max-w-none prose-p:my-1"
                dangerouslySetInnerHTML={{ __html: activeQuestion.text }}
              />
            </div>
          )}
          <div className="grid grid-cols-1 gap-10">
            <div className="min-w-0">
              {renderContent()}
            </div>
            {activeQuestion.type !== "bowtie" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-6 h-fit mt-6">
                <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold text-slate-900">
                  <BookOpen weight="fill" className="size-4 text-teal-700" />
                  Detailed Explanation
                </h3>
                <div 
                  className="text-[12px] leading-relaxed text-slate-600 break-words prose prose-sm prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: activeQuestion.rationale || "No explanation provided for this question." }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  const renderFooter = () => (
    <div className={cn("bg-white flex items-center justify-between border-t border-slate-200 px-6 md:px-8 py-4 shrink-0")}>
      <div className="flex items-center hidden md:flex">
        {!isSubmitted && (
          activeQuestion.type === 'next-gen-cloze' ? (
            <div className="flex items-center gap-4">
               <span className="text-[12px] font-medium text-slate-600 whitespace-nowrap">
                 {Object.keys(activeQuestion.options?.blanks || {}).filter(id => {
                   const val = (answerState || {})[id];
                   return val && activeQuestion.options?.blanks?.[id]?.options?.includes(val);
                 }).length} of {Object.keys(activeQuestion.options?.blanks || {}).length} blanks completed
               </span>
               <div className="h-1.5 w-24 rounded-full bg-slate-200 overflow-hidden shrink-0">
                  <div className="h-full bg-slate-400 transition-all" style={{ width: `${(Object.keys(activeQuestion.options?.blanks || {}).filter(id => {
                     const val = (answerState || {})[id];
                     return val && activeQuestion.options?.blanks?.[id]?.options?.includes(val);
                  }).length / Math.max(1, Object.keys(activeQuestion.options?.blanks || {}).length)) * 100}%` }}></div>
               </div>
            </div>
          ) : null
        )}
      </div>
      
      <div className="flex items-center justify-end shrink-0 ml-auto gap-3">
        {config.mode === 'review' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/student/test-history')}
              className="rounded-full border border-slate-200 px-7 py-2.5 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-50 whitespace-nowrap"
            >
              Exit Review
            </button>
            {currentIndex > 0 && (
              <button
                onClick={handlePrev}
                className="rounded-full border border-slate-200 px-7 py-2.5 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-50 whitespace-nowrap"
              >
                Previous
              </button>
            )}
            {currentIndex < activePool.length - 1 && (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 rounded-full bg-teal-700 px-7 py-2.5 text-[15px] font-semibold text-white transition hover:bg-teal-800 whitespace-nowrap"
              >
                Next <ChevronRight weight="bold" className="size-4" />
              </button>
            )}
          </div>
        ) : !isSubmitted ? (
          <div className="flex items-center gap-3">
            {currentIndex > 0 && (
              <button
                onClick={handlePrev}
                className="rounded-full border border-slate-200 px-7 py-2.5 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-50 whitespace-nowrap"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleSkip}
              className="rounded-full border border-slate-200 px-7 py-2.5 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-50 whitespace-nowrap"
            >
              Skip
            </button>
            <button
              disabled={!canSubmit || timeRemaining === 0}
              onClick={handleSubmitAnswer}
              className="flex items-center gap-2 rounded-full bg-teal-700 px-8 py-2.5 text-[15px] font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Submit answer <ChevronRight weight="bold" className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {currentIndex > 0 && (
              <button
                onClick={handlePrev}
                className="rounded-full border border-slate-200 px-7 py-2.5 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-50 whitespace-nowrap"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-7 py-2.5 text-[15px] font-semibold text-white transition hover:bg-slate-800 whitespace-nowrap"
            >
              {currentIndex < activePool.length - 1 ? "Next Question" : "Finish Test"}
              {currentIndex < activePool.length - 1 && <ChevronRight weight="bold" className="size-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderLayout = () => {
    return (
      <div className="flex flex-col lg:flex-row h-full w-full">
        {activeQuestion.is_subquestion || (activeQuestion.scenario_tabs && activeQuestion.scenario_tabs.length > 0) ? (
          <>
            <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200">
              <div className="flex flex-col h-full overflow-hidden min-h-0">
                <div className="p-6 md:p-8 lg:p-10 flex-1 min-h-0 overflow-y-auto">
                  {renderHeader()}
                  {renderScenario()}
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col h-full bg-white overflow-hidden min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 lg:p-10">
                {renderInteractive()}
              </div>
              {renderFooter()}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col h-full bg-white overflow-hidden min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 lg:p-12 w-full mx-auto max-w-4xl space-y-8">
              <div>
                {renderHeader()}
                {renderScenario()}
              </div>
              <div>
                {renderInteractive()}
              </div>
            </div>
            {renderFooter()}
          </div>
        )}
      </div>
    );
  };

  return (
    <StudentLayout title="Test Session">
      <div className="flex h-full flex-col bg-slate-50 overflow-hidden font-sans rounded-[1.5rem] md:rounded-none">
        
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shrink-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/student/create-test")}
              className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="size-4" weight="bold" />
            </button>
            <div className="text-[15px] font-semibold text-slate-900 hidden md:block">
              Question {currentIndex + 1} of {activePool.length}
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-teal-700 md:ml-2">
              {activeQuestion.type === "next-gen-cloze" ? "Fill in the Blank" : activeQuestion.type.replace(/-/g, " ")}
            </span>
          </div>
          
          <div className="flex items-center gap-4 md:gap-8">
            {timeRemaining !== null && config.mode !== 'review' && (
              <div className={cn("hidden md:flex items-center gap-2 text-[15px] font-semibold", timeRemaining === 0 ? "text-red-500 animate-bounce" : timeRemaining < 60 ? "text-red-500 animate-pulse" : "text-slate-800")}>
                <Clock className="size-5" weight="regular" />
                {timeRemaining === 0 ? "Time's Up!" : formatTime(timeRemaining)}
              </div>
            )}
            
            <div className="hidden md:flex items-center gap-3">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
                <div 
                  className="h-full bg-teal-700 transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-xs font-bold text-slate-800">{progressPercent}%</div>
            </div>
            
            <button 
              onClick={() => config.mode === 'review' ? navigate('/student/test-history') : handleEndSession()}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              {config.mode === 'review' ? "Exit Review" : "End Session"}
            </button>
          </div>
        </header>

        {/* Question Area */}
        <main className="flex-1 overflow-hidden flex flex-col w-full max-w-none">
          <div className="w-full h-full flex flex-col relative z-10">
            
            {timeRemaining === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-6 rounded-2xl border border-red-200 bg-white p-12 text-center shadow-sm animate-in fade-in zoom-in duration-500">
                <div className="grid size-20 place-items-center rounded-full bg-red-50 text-red-500">
                  <Clock className="size-10" weight="fill" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">Time's Up!</h2>
                  <p className="text-lg text-slate-500">Your test session has ended because the time ran out.</p>
                  <p className="text-sm text-slate-400 mt-2">All your previously submitted answers have been saved.</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEndSession}
                  className="mt-8 rounded-lg bg-teal-700 px-8 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-teal-800"
                >
                  End Session & View Results
                </motion.button>
              </div>
            ) : renderLayout()}

          </div>
        </main> 
      </div>
    </StudentLayout>
  );
}
