import { StudentLayout } from "@/components/layout/StudentLayout";
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter } from "@dnd-kit/core";
import { X, CaretLeft as ChevronLeft, CaretRight as ChevronRight, CheckCircle as CheckCircle2, XCircle, DotsSixVertical as GripVertical, BookOpen, Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StudentTestSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const config = location.state || { type: "traditional" };
  
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
          let pool = data.map((a: any) => ({
            ...a.questions,
            text: a.questions.stem,
            correctId: Array.isArray(a.questions.options) ? a.questions.options.find((o: any) => o.correct)?.letter : null,
            correctIds: Array.isArray(a.questions.options) ? a.questions.options.filter((o: any) => o.correct).map((o: any) => o.letter) : [],
            options: Array.isArray(a.questions.options) ? a.questions.options.map((o: any) => ({ id: o.letter, text: o.text })) : a.questions.options,
            _submittedAnswer: a.selected_options
          }));
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

          pool = pool.map((q: any) => ({
            ...q,
            text: q.stem,
            correctId: Array.isArray(q.options) ? q.options.find((o: any) => o.correct)?.letter : null,
            correctIds: Array.isArray(q.options) ? q.options.filter((o: any) => o.correct).map((o: any) => o.letter) : [],
            options: Array.isArray(q.options) ? q.options.map((o: any) => ({ id: o.letter, text: o.text })) : q.options
          }));

          if (config.type === "traditional") pool = pool.filter((q: any) => q.type.startsWith("mcq"));
          if (config.type === "next-gen") pool = pool.filter((q: any) => !q.type.startsWith("mcq"));
          
          // Randomize question order
          pool.sort(() => Math.random() - 0.5);
          
          if (config.count && config.count !== 999) {
            pool = pool.slice(0, config.count);
          }
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
    if (q.type === "next-gen-matrix") return {};
    if (q.type === "bowtie") return { condition: null, actions: [], parameters: [], activeSlot: null };
    if (q.type === "next-gen-order") return [...(q.steps || [])];
    if (q.type === "next-gen-highlight") return [];
    if (q.type === "next-gen-sata" || q.type === "mcq-multi") return [];
    return null;
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const activeQuestion = activePool[currentIndex];
  
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
    if (timeRemaining === null || timeRemaining <= 0 || config.mode === 'review' || isSubmitted) return;

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
  }, [timeRemaining, config.mode, isSubmitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (activePool.length > 0 && !answerState) {
      if (config.mode === 'review') {
        setAnswerState(activePool[currentIndex]._submittedAnswer);
        setIsSubmitted(true);
      } else {
        setAnswerState(getInitialState(activePool[currentIndex]));
      }
    }
  }, [activePool, currentIndex]);

  // Derived validation logic based on type
  const canSubmit = useMemo(() => {
    if (isSubmitted || !answerState) return false;
    switch (activeQuestion.type) {
      case "traditional": 
      case "mcq-single":
        return typeof answerState === "string";
      case "next-gen-cloze": return Object.keys(activeQuestion.options?.blanks || {}).length > 0 && Object.keys(activeQuestion.options?.blanks || {}).length === Object.keys(answerState).length && Object.values(answerState).every(Boolean);
      case "next-gen-matrix": return Object.keys(answerState).length === (activeQuestion.rows?.length || 0);
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
      case "next-gen-matrix":
        return Object.entries(activeQuestion.correctAnswers || {}).every(([rowId, colId]) => answerState[rowId] === colId);
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
        const hlAns = activeQuestion.correctHighlights || [];
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
      const nextQ = activePool[currentIndex + 1];
      setCurrentIndex(prev => prev + 1);
      
      if (config.mode === 'review') {
        setAnswerState(nextQ._submittedAnswer);
        setIsSubmitted(true);
      } else {
        setIsSubmitted(false);
        setAnswerState(getInitialState(nextQ));
      }
    } else {
      if (config.mode !== 'review') handleEndSession();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevQ = activePool[currentIndex - 1];
      setCurrentIndex(prev => prev - 1);
      if (config.mode === 'review') {
        setAnswerState(prevQ._submittedAnswer);
        setIsSubmitted(true);
      } else {
        setIsSubmitted(false);
        setAnswerState(getInitialState(prevQ));
      }
    }
  };

  const handleSubmitAnswer = async () => {
    setIsSubmitted(true);
    if (sessionId && activeQuestion) {
      const { error } = await supabase.from('test_answers').insert({
        session_id: sessionId,
        question_id: activeQuestion.id,
        selected_options: answerState,
        is_correct: isCorrect
      });
      if (error) {
        console.error("Failed to insert test answer:", error);
      }
    }
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
                "group relative flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all",
                !isSubmitted && isSelected ? "border-teal-700 bg-teal-50/20 ring-1 ring-teal-700 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                showCorrect && "border-green-500 bg-green-50 ring-1 ring-green-500",
                showIncorrect && "border-red-500 bg-red-50 ring-1 ring-red-500"
              )}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full text-[15px] font-bold transition-all",
                  !isSubmitted && isSelected ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700 group-hover:bg-slate-200",
                  showCorrect && "bg-green-500 text-white",
                  showIncorrect && "bg-red-500 text-white"
                )}>
                  {showCorrect ? <CheckCircle2 weight="fill" className="size-5" /> : showIncorrect ? <XCircle weight="fill" className="size-5" /> : label}
                </div>
                <div className={cn("text-base break-words min-w-0", (showCorrect || (isSelected && !isSubmitted)) ? "font-semibold text-slate-900" : "font-medium text-slate-800")}>
                  {option.text}
                </div>
              </div>
              {!isSubmitted && isSelected && (
                <div className="text-teal-700 pr-2 animate-in fade-in zoom-in duration-200">
                  <CheckCircle2 weight="fill" className="size-6" />
                </div>
              )}
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
              <div className={cn(
                "grid size-7 shrink-0 place-items-center rounded-md border text-xs font-bold transition-all",
                (!isSubmitted && isSelected) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground",
                isSubmitted && isExpected && isSelected && "border-success bg-success text-success-foreground",
                isSubmitted && !isExpected && isSelected && "border-destructive bg-destructive text-destructive-foreground",
                isSubmitted && isExpected && !isSelected && "border-warning bg-warning text-warning-foreground"
              )}>
                {isSubmitted && icon ? icon : (isSelected && !isSubmitted ? <CheckCircle2 className="size-4" /> : option.id)}
              </div>
              <div className={cn("flex-1 text-sm break-words min-w-0", (isSelected && !isSubmitted) ? "font-medium text-foreground" : "text-muted-foreground", isSubmitted && "text-foreground")}>
                {option.text}
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
          const parts = text.split(/({[0-9]+})/);
          if (parts.length === 1) return text;

          return (
            <span key={index}>
              {parts.map((part, i) => {
                const match = part.match(/{([0-9]+)}/);
                if (match) {
                  const blankId = match[1];
                  const blank = activeQuestion.options?.blanks?.[blankId];
                  if (!blank) return null;
                  
                  let isAnsweredCorrectly = answers[blankId] === blank.correct;
                  let availableOptions = blank.options;
                  
                  if (activeQuestion.options?.clozeDependencies && activeQuestion.options.clozeDependencies.length > 0) {
                    const deps = activeQuestion.options.clozeDependencies;
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
                  
                  // Prevent repeating options: Filter out any options already selected in other blanks
                  const otherSelectedValues = Object.entries(answers)
                    .filter(([key, val]) => String(key) !== String(blankId) && val)
                    .map(([_, val]) => val);
                  
                  availableOptions = availableOptions.filter((opt: string) => !otherSelectedValues.includes(opt));
                  
                  return (
                    <span key={i} className="inline-flex relative mx-1 my-0.5 align-middle">
                      <div className="relative">
                        {availableOptions.length === 0 && (
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                             <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                          </div>
                        )}
                        <Select
                          disabled={isSubmitted || availableOptions.length === 0}
                          value={answers[blankId] || ""}
                          onValueChange={(value) => {
                            const newAns = { ...answers, [blankId]: value };
                            if (activeQuestion.options?.clozeDependencies) {
                              const deps = activeQuestion.options.clozeDependencies;
                              
                              // Recursively clear all targets that depend on this one, or targets of targets, etc.
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
                              "h-10 cursor-pointer rounded-xl border px-4 text-[15px] font-medium outline-none transition-all min-w-[200px] shadow-none [&>span]:w-full [&>span]:text-left",
                              availableOptions.length > 0 
                                 ? (!isSubmitted && "border-slate-300 bg-white hover:border-teal-700 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 text-slate-800 [&>svg]:text-teal-700 [&>svg]:opacity-100")
                                 : "border-slate-200 bg-slate-100 text-slate-400 pl-11 [&>svg]:opacity-30",
                              isSubmitted && isAnsweredCorrectly && "border-green-500 bg-green-50 text-green-700 font-semibold [&>svg]:text-green-700",
                              isSubmitted && !isAnsweredCorrectly && "border-red-500 bg-red-50 text-red-700 font-semibold [&>svg]:text-red-700",
                              availableOptions.length === 0 && "cursor-not-allowed"
                            )}
                          >
                            <SelectValue placeholder={availableOptions.length === 0 ? "Select Blank 1 first" : "Select answer"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {availableOptions.map((opt: string) => (
                              <SelectItem key={opt} value={opt} className="text-[15px] cursor-pointer">
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
      <div className="leading-[2.5rem] text-lg text-slate-800">
        {parseHtmlToReact(activeQuestion.text)}
      </div>
    );
  };

  const renderMatrix = () => {
    const answers = answerState || {};
    const correctAns = activeQuestion.correctAnswers as any;

    return (
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="p-4 font-semibold">Assessment Finding</th>
              {activeQuestion.columns?.map(c => <th key={c.id} className="p-4 text-center font-semibold">{c.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activeQuestion.rows?.map(r => (
              <tr key={r.id}>
                <td className="p-4 font-medium text-foreground">{r.text}</td>
                {activeQuestion.columns?.map(c => {
                  const isSelected = answers[r.id] === c.id;
                  const isExpected = correctAns[r.id] === c.id;
                  let bgClass = "";
                  
                  if (isSubmitted) {
                    if (isSelected && isExpected) bgClass = "bg-success/20 ring-2 ring-inset ring-success";
                    else if (isSelected && !isExpected) bgClass = "bg-destructive/20 ring-2 ring-inset ring-destructive";
                    else if (!isSelected && isExpected) bgClass = "bg-warning/20 ring-2 ring-inset ring-warning";
                  }

                  return (
                    <td key={c.id} className={cn("p-4 text-center transition-colors", bgClass)}>
                      <input 
                        type="radio" 
                        disabled={isSubmitted}
                        name={`row-${r.id}`} 
                        checked={isSelected}
                        onChange={() => setAnswerState({ ...answers, [r.id]: c.id })}
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

    return (
      <div className="space-y-2 text-lg leading-relaxed text-foreground">
        {activeQuestion.sentences?.map(s => {
          const isSelected = selected.includes(s.id);
          const isExpected = activeQuestion.correctHighlights?.includes(s.id);
          
          let highlightClass = "bg-transparent hover:bg-muted cursor-pointer";
          if (isSubmitted) {
            if (isSelected && isExpected) highlightClass = "bg-success/30 border-b-2 border-success font-semibold";
            else if (isSelected && !isExpected) highlightClass = "bg-destructive/30 border-b-2 border-destructive line-through";
            else if (!isSelected && isExpected) highlightClass = "bg-warning/30 border-b-2 border-warning border-dashed";
            else highlightClass = "opacity-50 cursor-default";
          } else if (isSelected) {
            highlightClass = "bg-yellow-200/50 dark:bg-yellow-600/30 border-b-2 border-yellow-400 dark:border-yellow-600";
          }

          return (
            <span
              key={s.id}
              onClick={() => !isSubmitted && toggle(s.id)}
              className={cn("px-1 transition-all rounded-sm", highlightClass)}
            >
              {s.text}
            </span>
          );
        })}
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
    const config = activeQuestion.options || {};
    const state = answerState || { actions: [], condition: null, parameters: [] };
    
    const correctActions = config.actions?.filter((c: any) => c.isCorrect) || [];
    const correctConditions = config.conditions?.filter((c: any) => c.isCorrect) || [];
    const correctParameters = config.parameters?.filter((c: any) => c.isCorrect) || [];
    
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

      if (targetSlot.startsWith("bank-")) {
        setAnswerState(newState);
        return;
      }

      const [targetType, idxStr] = targetSlot.split("-");
      if (!["actions", "parameters"].includes(targetType)) {
        setAnswerState(newState);
        return;
      }

      if (sourceType !== "bank-options" && sourceType !== `bank-${targetType}` && !sourceType.startsWith(`${targetType}-`)) {
        setAnswerState(newState); 
        return;
      }

      const targetIdx = parseInt(idxStr);
      newState[targetType][targetIdx] = word;
      
      setAnswerState(newState);
    };

    const DraggableWord = ({ word, typeId }: { word: string, typeId: string }) => {
      const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `${typeId}::${word}`,
        data: { word, typeId },
        disabled: isSubmitted
      });
      const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
      
      return (
        <button
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={cn(
            "relative flex items-stretch rounded-lg bg-white text-xs font-medium text-slate-700 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.05)] border border-slate-200 touch-none group hover:shadow-sm hover:border-slate-300",
            !typeId.startsWith("bank-") && "w-full",
            isDragging ? "opacity-95 ring-2 ring-blue-400/30 scale-105 shadow-md rotate-1 z-50 transition-none" : "transition-all duration-300 ease-out",
            isSubmitted && "opacity-75 cursor-default hover:transform-none hover:shadow-sm hover:border-slate-200"
          )}
        >
          <div className="flex items-center justify-center px-1.5 py-2 border-r border-slate-100 text-slate-300 group-hover:text-slate-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm7-7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
          </div>
          <div className="px-3 py-2 text-center flex-1">
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
        if (isExpected(value)) uiClass = "bg-green-50 border-green-300 text-green-700 p-0 border-solid";
        else uiClass = "bg-red-50 border-red-300 text-red-700 p-0 border-solid";
      } else if (isSubmitted && !value) {
        uiClass = "bg-red-50 text-red-500 border-dashed border-red-300";
      }

      return (
        <div 
          ref={setNodeRef}
          className={cn("flex min-h-[5.5rem] w-full flex-col items-center justify-center rounded-xl border px-2 py-2 transition-colors duration-200 cursor-pointer relative", uiClass)}
        >
          {value ? (
            <div className="flex w-full h-full items-center justify-center animate-in zoom-in-95 duration-200">
               <DraggableWord word={value} typeId={id} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className={cn("w-8 h-8 rounded-full border-[1.5px] border-dashed flex items-center justify-center", isCause ? "border-blue-400/70" : "border-teal-400/70")}></div>
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
      <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <div className="w-full rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden select-none relative z-0 mt-6 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-stretch justify-center p-8 gap-4 w-full">
             
             {/* Actions Left */}
             <div className="flex-[1.2] flex flex-col">
               <div className="flex items-center gap-4 h-10 mb-6 shrink-0">
                 <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                 </div>
                 <span className="text-sm font-bold text-slate-800 uppercase tracking-widest">Causes & Assessments</span>
               </div>
               <div className="flex-1 flex flex-col gap-6 justify-around relative">
                 {correctActions.map((_, i: number) => (
                   <DroppableSlot key={i} label={`Cause ${i+1}`} id={`actions-${i}`} type="cause" value={state.actions?.[i]} isExpected={(v: string) => correctActions.some((c: any) => c.text === v)} />
                 ))}
               </div>
             </div>

             {/* Connection Left -> Center */}
             <div className="hidden md:flex w-24 flex-col">
               <div className="h-10 mb-6 shrink-0"></div>
               <div className="relative flex-1">
                 <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 {correctActions.map((_: any, i: number) => {
                   const y = ((2 * i + 1) / (2 * correctActions.length)) * 100;
                   return <path key={i} d={`M 0 ${y} C 50 ${y}, 50 50, 100 50`} fill="none" stroke="#cbd5e1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />;
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
                 <span className="text-[13px] font-bold text-teal-700 uppercase tracking-widest">Core Condition</span>
               </div>
               <div className="flex-1 flex flex-col items-center justify-center relative">
                 <div className="w-full flex flex-col items-center justify-center bg-white rounded-xl border border-teal-500/70 shadow-sm px-6 py-10 min-h-[11rem]">
                    <span className="text-xl font-bold text-teal-800 text-center break-words">{correctConditions[0]?.text || "Unknown Condition"}</span>
                 </div>
               </div>
             </div>

             {/* Connection Center -> Right */}
             <div className="hidden md:flex w-24 flex-col">
               <div className="h-10 mb-6 shrink-0"></div>
               <div className="relative flex-1">
                 <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 {correctParameters.map((_: any, i: number) => {
                   const y = ((2 * i + 1) / (2 * correctParameters.length)) * 100;
                   return <path key={i} d={`M 0 50 C 50 50, 50 ${y}, 100 ${y}`} fill="none" stroke="#cbd5e1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />;
                 })}
               </svg>
               {correctParameters.map((_: any, i: number) => {
                 const y = ((2 * i + 1) / (2 * correctParameters.length)) * 100;
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
                 <span className="text-sm font-bold text-slate-800 uppercase tracking-widest text-right">Treatments & Effects</span>
                 <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                 </div>
               </div>
               <div className="flex-1 flex flex-col gap-6 justify-around relative">
                 {correctParameters.map((_, i: number) => (
                   <DroppableSlot key={i} label={`Treatment ${i+1}`} id={`parameters-${i}`} type="treatment" value={state.parameters?.[i]} isExpected={(v: string) => correctParameters.some((c: any) => c.text === v)} />
                 ))}
               </div>
             </div>
          </div>
          
          <div className="border-t border-slate-200 flex flex-col bg-slate-50/30">
            <div className="flex items-center px-6 py-4 border-b border-slate-200 bg-white shrink-0">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 3H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM9 9H5V5h4v4zm11-6h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zm-1 6h-4V5h4v4zm-9 4H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1zm-1 6H5v-4h4v4zm11-6h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1zm-1 6h-4v-4h4v4z"/></svg>
                 </div>
                 <span className="text-xs font-bold text-slate-800 uppercase tracking-widest whitespace-nowrap">Word Bank</span>
               </div>
            </div>
            <DroppableWordBank id="bank-options" className="flex flex-row flex-wrap items-center gap-3 p-6 flex-1 min-h-[100px]">
              {(() => {
                  const allOptions = [
                    ...(config.actions || []),
                    ...(config.parameters || [])
                  ].filter(item => item.text).sort((a, b) => a.text.localeCompare(b.text));

                  return allOptions.map((item: any, idx: number) => {
                    const isUsed = state.actions?.includes(item.text) || state.parameters?.includes(item.text);
                    if (isUsed) return <div key={`${item.text}-${idx}`} className="h-[34px] w-[1px] opacity-0 pointer-events-none m-0 p-0 overflow-hidden"></div>;
                    return <DraggableWord key={`${item.text}-${idx}`} word={item.text} typeId="bank-options" />;
                  });
              })()}
            </DroppableWordBank>
          </div>
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
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100">
             <div className="w-10 h-10 rounded-lg bg-slate-100/80 text-slate-600 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
             </div>
             <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-800">Case Study</h2>
          </div>
          <div className="p-8 pb-10">
            {renderCloze()}
            
            {activeQuestion.options?.clozeDependentMode && (
              <div className="mt-10 flex items-center gap-3 rounded-lg border border-teal-100 bg-teal-50/50 p-4 text-teal-800">
                <div className="text-teal-700">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </div>
                <span className="text-[13px] font-medium">Blank 2 options depend on your first selection.</span>
              </div>
            )}
          </div>
        </div>
      );
      case "next-gen-matrix": return renderMatrix();
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
              {activeQuestion.type === "next-gen-cloze" ? "fill in the blanks drop down" : activeQuestion.type.replace(/-/g, " ")}
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
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start">
          <div className={cn("w-full h-fit transition-all duration-300", activeQuestion.type === "bowtie" ? "max-w-6xl" : "max-w-4xl")}>
            
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
            ) : (
              <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 md:p-10">
                  <div className="mb-8 flex gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{activeQuestion.category}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{activeQuestion.subcategory}</span>
                  </div>

                  {!isSubmitted ? (
                    <div className="animate-in fade-in duration-500">
                      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Question {(currentIndex + 1).toString().padStart(2, '0')}</div>
                      
                      {activeQuestion.type === "next-gen-cloze" ? (
                        <>
                          <div className="mb-2 text-[22px] font-bold leading-snug text-slate-900">Complete the statement</div>
                          <div className="mb-8 text-[15px] text-slate-500">Choose an answer for Blank 1 to unlock Blank 2.</div>
                        </>
                      ) : (
                        <>
                          <div 
                            className="mb-3 text-[22px] font-bold leading-snug text-slate-900"
                            dangerouslySetInnerHTML={{ __html: activeQuestion.text }}
                          />
                          {(activeQuestion.type.startsWith('mcq') || activeQuestion.type === 'next-gen-sata') && (
                            <div className="mb-8 text-[15px] text-slate-500">Select {activeQuestion.type === 'mcq-multi' || activeQuestion.type === 'next-gen-sata' ? 'all that apply' : 'one answer'}</div>
                          )}
                        </>
                      )}
                      
                      <div className={cn(activeQuestion.type === 'bowtie' && "pt-2")}>
                        {renderContent()}
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-500">
                      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Question Review</div>
                      <div 
                        className="mb-8 text-[22px] font-bold leading-snug text-slate-900"
                        dangerouslySetInnerHTML={{ __html: activeQuestion.type === "next-gen-cloze" ? activeQuestion.text.replace(/{[0-9]+}/g, "_________") : activeQuestion.text }}
                      />
                      
                      <div className={cn("grid grid-cols-1 gap-10", activeQuestion.type === "bowtie" ? "" : "lg:grid-cols-[1fr_360px]")}>
                        <div className="min-w-0">
                          {renderContent()}
                        </div>
                        
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 h-fit">
                          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-slate-900">
                            <BookOpen weight="fill" className="size-5 text-teal-700" />
                            Detailed Explanation
                          </h3>
                          <div 
                            className="text-[13px] leading-relaxed text-slate-600 break-words prose prose-sm prose-slate"
                            dangerouslySetInnerHTML={{ __html: activeQuestion.rationale || "No explanation provided for this question." }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="border-t border-slate-100 bg-white px-6 md:px-8 py-5 flex items-center justify-between">
                  <div className="flex-1">
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center hidden md:flex">
                    {!isSubmitted && (
                      activeQuestion.type === 'next-gen-cloze' ? (
                        <div className="flex items-center gap-4">
                           <span className="text-[13px] font-medium text-slate-600">
                             {Object.values(answerState || {}).filter(Boolean).length} of {Object.keys(activeQuestion.options?.blanks || {}).length} blanks completed
                           </span>
                           <div className="h-1.5 w-24 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full bg-slate-400 transition-all" style={{ width: `${(Object.values(answerState || {}).filter(Boolean).length / Object.keys(activeQuestion.options?.blanks || {}).length) * 100}%` }}></div>
                           </div>
                        </div>
                      ) : (
                        <span className="text-[13px] text-slate-400">You can change your answer before submitting.</span>
                      )
                    )}
                  </div>
                  
                  <div className="flex-1 flex justify-end">
                    {config.mode === 'review' ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate('/student/test-history')}
                          className="rounded-lg border border-slate-200 px-6 py-2.5 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Exit Review
                        </button>
                        {currentIndex < activePool.length - 1 && (
                          <button
                            onClick={handleNext}
                            className="flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-2.5 text-[15px] font-semibold text-white transition hover:bg-teal-800"
                          >
                            Next <ChevronRight weight="bold" className="size-4" />
                          </button>
                        )}
                      </div>
                    ) : !isSubmitted ? (
                      <button
                        disabled={!canSubmit || timeRemaining === 0}
                        onClick={handleSubmitAnswer}
                        className="flex items-center gap-2 rounded-lg bg-teal-700 px-6 py-2.5 text-[15px] font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit answer <ChevronRight weight="bold" className="size-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        className="flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-[15px] font-semibold text-white transition hover:bg-slate-800"
                      >
                        {currentIndex < activePool.length - 1 ? "Next Question" : "Finish Test"}
                        {currentIndex < activePool.length - 1 && <ChevronRight weight="bold" className="size-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </StudentLayout>
  );
}
