import { StudentLayout } from "@/components/layout/StudentLayout";
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter } from "@dnd-kit/core";
import { X, CaretLeft as ChevronLeft, CaretRight as ChevronRight, CheckCircle as CheckCircle2, XCircle, DotsSixVertical as GripVertical, BookOpen, Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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
        {activeQuestion.options?.map((option) => {
          const isSelected = answerState === option.id;
          const showCorrect = isSubmitted && option.id === activeQuestion.correctId;
          const showIncorrect = isSubmitted && isSelected && !isCorrect;

          return (
            <button
              key={option.id}
              disabled={isSubmitted}
              onClick={() => setAnswerState(option.id)}
              className={cn(
                "group relative flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all",
                !isSubmitted && isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/40",
                showCorrect && "border-success bg-success/10 ring-1 ring-success/20",
                showIncorrect && "border-destructive bg-destructive/10 ring-1 ring-destructive/20"
              )}
            >
              <div className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border text-sm font-bold transition-all",
                !isSubmitted && isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground group-hover:border-primary/40",
                showCorrect && "border-success bg-success text-success-foreground",
                showIncorrect && "border-destructive bg-destructive text-destructive-foreground"
              )}>
                {showCorrect ? <CheckCircle2 className="size-4" /> : showIncorrect ? <XCircle className="size-4" /> : option.id}
              </div>
              <div className={cn("flex-1 text-lg break-words min-w-0", (showCorrect || (isSelected && !isSubmitted)) ? "font-medium text-foreground" : "text-muted-foreground")}>
                {option.text}
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
                  
                  if (activeQuestion.options?.clozeDependentMode) {
                    const blankKeys = Object.keys(activeQuestion.options?.blanks || {});
                    const combos = activeQuestion.options?.clozeCombinations || [];
                    const b1 = answers[blankKeys[0]];
                    
                    if (blankId === blankKeys[1]) {
                      if (b1) {
                        // Check if combos use new grouped format or old flat format
                        const isNewFormat = combos.length > 0 && Array.isArray(combos[0].connectedOptions);
                        
                        let validBlank2Options: string[] = [];
                        if (isNewFormat) {
                          const group = combos.find((c: any) => c.blank1 === b1);
                          validBlank2Options = group?.connectedOptions || [];
                        } else {
                          validBlank2Options = combos.filter((c: any) => c.blank1 === b1).map((c: any) => c.blank2);
                        }
                        
                        availableOptions = blank.options.filter((opt: string) => validBlank2Options.includes(opt));
                      } else {
                        availableOptions = [];
                      }
                    }
                  }
                  
                  return (
                    <span key={i} className="inline-block px-1">
                      <select
                        disabled={isSubmitted || availableOptions.length === 0}
                        value={answers[blankId] || ""}
                        onChange={(e) => {
                          const newAns = { ...answers, [blankId]: e.target.value };
                          // If we just changed blank 1, clear blank 2 to force re-selection from the new filtered list
                          if (activeQuestion.options?.clozeDependentMode && blankId === Object.keys(activeQuestion.options?.blanks || {})[0]) {
                            const b2Key = Object.keys(activeQuestion.options?.blanks || {})[1];
                            if (b2Key) newAns[b2Key] = "";
                          }
                          setAnswerState(newAns);
                        }}
                        className={cn(
                          "h-8 cursor-pointer appearance-none rounded-lg border bg-card px-3 pr-7 text-sm font-medium outline-none transition-all",
                          !isSubmitted && "border-border hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20",
                          isSubmitted && isAnsweredCorrectly && "border-success bg-success/10 text-success font-semibold",
                          isSubmitted && !isAnsweredCorrectly && "border-destructive bg-destructive/10 text-destructive font-semibold",
                          availableOptions.length === 0 && "opacity-50 cursor-not-allowed"
                        )}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1em",
                        }}
                      >
                        <option value="" disabled>{availableOptions.length === 0 ? "Select previous blank first" : "Select..."}</option>
                        {availableOptions.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
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
      <div className="leading-loose text-lg text-foreground prose prose-sm max-w-none dark:prose-invert">
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
      const sourceType = active.data.current?.typeId; // e.g. "bank-actions" or "actions-0"
      const targetSlot = over.id; // e.g. "bank-actions" or "actions-1" or "condition"

      if (!word) return;

      const newState = { actions: [...(state.actions || [])], condition: state.condition, parameters: [...(state.parameters || [])] } as any;

      // Remove from old slot if it was in one
      ["actions", "parameters"].forEach(key => {
        const idx = newState[key].indexOf(word);
        if (idx > -1) newState[key][idx] = null;
      });
      if (newState.condition === word) newState.condition = null;

      if (targetSlot.startsWith("bank-")) {
        setAnswerState(newState);
        return;
      }

      if (targetSlot === "condition") {
        if (sourceType !== "bank-conditions" && sourceType !== "condition") {
          setAnswerState(newState);
          return;
        }
        newState.condition = word;
        setAnswerState(newState);
        return;
      }

      const [targetType, idxStr] = targetSlot.split("-");
      if (!["actions", "parameters"].includes(targetType)) {
        setAnswerState(newState);
        return;
      }

      // Restrict dropping into wrong type
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
      const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : undefined;
      
      return (
        <button
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={cn(
            "rounded-2xl border border-white/40 bg-white/90 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 max-w-full break-words text-wrap touch-none relative overflow-hidden group",
            !typeId.startsWith("bank-") && "w-full",
            isDragging && "opacity-80 ring-4 ring-primary/20 scale-105 shadow-xl rotate-1",
            isSubmitted && "opacity-60 cursor-default hover:transform-none hover:shadow-sm"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none rounded-2xl"></div>
          <span className="relative z-10 tracking-tight">{word}</span>
        </button>
      );
    };

    const DroppableSlot = ({ label, id, value, isExpected }: any) => {
      const { isOver, setNodeRef } = useDroppable({ id });
      
      let uiClass = "bg-slate-100/50 border border-slate-200 shadow-inner text-slate-400 hover:bg-slate-100";
      
      if (isOver) uiClass = "bg-primary/5 border border-primary/40 ring-4 ring-primary/10 text-primary font-semibold shadow-inner scale-[1.02]";
      else if (value) uiClass = "border-transparent bg-transparent";

      if (isSubmitted && value) {
        if (isExpected(value)) uiClass = "bg-success/10 border-success/30 text-success-foreground font-bold";
        else uiClass = "bg-destructive/10 border-destructive/30 text-destructive-foreground font-bold";
      } else if (isSubmitted && !value) {
        uiClass = "bg-destructive/5 text-destructive border border-dashed border-destructive/50";
      }

      return (
        <div 
          ref={setNodeRef}
          className={cn("flex min-h-[3.25rem] h-auto w-full flex-col items-center justify-center rounded-xl px-2 py-1.5 transition-all duration-300 ease-out cursor-pointer relative", uiClass)}
        >
          {value ? (
            <div className="flex w-full h-full items-center justify-center font-semibold animate-in fade-in zoom-in-95 duration-200">
               <DraggableWord word={value} typeId={id} />
            </div>
          ) : <span className="text-xs uppercase tracking-[0.15em] font-medium text-center px-4">{label}</span>}
        </div>
      );
    };

    const DroppableWordBank = ({ children, id, className }: any) => {
      const { setNodeRef, isOver } = useDroppable({ id });
      return (
        <div 
          ref={setNodeRef} 
          className={cn(
            "flex min-h-[80px] rounded-[1.5rem] border border-white p-4 transition-all duration-300 bg-slate-50/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]", 
            isOver ? "bg-white border-primary/30 ring-4 ring-primary/5 scale-[1.01]" : "", 
            className || "flex-col gap-2"
          )}
        >
          {children}
        </div>
      );
    };

    return (
      <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <div className="space-y-4 select-none relative z-0">
          <div className="flex flex-col md:flex-row items-stretch justify-center gap-2 rounded-[2rem] border-0 bg-slate-50/40 p-2 md:p-4 shadow-[inset_0_2px_20px_rgba(0,0,0,0.02)] overflow-x-auto relative min-h-[160px]">
            
            {/* Background connection lines using SVG for Bow-Tie shape */}
            <div className="absolute inset-0 top-10 z-0 hidden md:block pointer-events-none opacity-40">
               <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 {correctActions.map((_, i) => {
                    const total = correctActions.length;
                    const spread = Math.min(60, total * 20);
                    const startY = 50 - spread/2;
                    const y = total === 1 ? 50 : startY + (spread * i / (total - 1));
                    return <path key={`left-${i}`} d={`M 31 ${y} C 36 ${y}, 36 50, 45 50`} fill="none" stroke="currentColor" strokeWidth="0.8" className="text-primary/70" strokeLinecap="round" strokeDasharray="3 3" />;
                 })}
                 {correctParameters.map((_, i) => {
                    const total = correctParameters.length;
                    const spread = Math.min(60, total * 20);
                    const startY = 50 - spread/2;
                    const y = total === 1 ? 50 : startY + (spread * i / (total - 1));
                    return <path key={`right-${i}`} d={`M 55 50 C 64 50, 64 ${y}, 69 ${y}`} fill="none" stroke="currentColor" strokeWidth="0.8" className="text-primary/70" strokeLinecap="round" strokeDasharray="3 3" />;
                 })}
               </svg>
            </div>

            {/* Actions Left */}
            <div className="relative z-10 w-full min-w-[220px] flex-1 space-y-2.5 px-2 py-2 flex flex-col justify-center">
              <h3 className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Causes/Assessments</h3>
              {correctActions.map((_, i: number) => (
                <DroppableSlot key={i} label={`Cause/Assessment ${i+1}`} id={`actions-${i}`} value={state.actions?.[i]} isExpected={(v: string) => correctActions.some((c: any) => c.text === v)} />
              ))}
            </div>

            {/* Condition Center */}
            <div className="relative z-10 w-full min-w-[240px] flex-1 px-2 py-4 flex flex-col items-center justify-center">
              <h3 className="mb-4 text-center text-[13px] font-extrabold uppercase tracking-[0.25em] text-primary">Core Condition</h3>
              <div className="w-full max-w-[320px]">
                <div className="flex min-h-[4.5rem] h-auto w-full flex-col items-center justify-center rounded-[1.5rem] px-3 py-2 transition-all bg-gradient-to-br from-primary to-primary/80 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.15)] border border-primary/20 relative group">
                  <div className="absolute inset-0 bg-white/10 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center justify-center font-bold text-center w-full z-10">
                     <div className="rounded-[1.25rem] border border-white/40 bg-white/95 backdrop-blur-md px-6 py-3.5 text-[15px] font-bold text-slate-800 shadow-sm w-full break-words text-wrap relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-white opacity-60"></div>
                       <span className="relative z-10 tracking-tight">{correctConditions[0]?.text || "Unknown Condition"}</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Parameters Right */}
            <div className="relative z-10 w-full min-w-[220px] flex-1 space-y-2.5 px-2 py-2 flex flex-col justify-center">
              <h3 className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Treatments/Effects</h3>
              {correctParameters.map((_, i: number) => (
                <DroppableSlot key={i} label={`Treatment/Effect ${i+1}`} id={`parameters-${i}`} value={state.parameters?.[i]} isExpected={(v: string) => correctParameters.some((c: any) => c.text === v)} />
              ))}
            </div>
          </div>

          {/* Options Columns */}
          <div className="pt-4 w-full relative z-10">
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="flex items-center justify-center">
                <h3 className="rounded-full bg-slate-800 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-lg">Word Bank</h3>
              </div>
              <DroppableWordBank id="bank-options" className="flex-row flex-wrap justify-center gap-4 items-center">
                {(() => {
                  const allOptions = [
                    ...(config.actions || []),
                    ...(config.parameters || [])
                  ].filter(item => item.text).sort((a, b) => a.text.localeCompare(b.text));

                  return allOptions.map((item: any, idx: number) => {
                    const isUsed = state.actions?.includes(item.text) || state.parameters?.includes(item.text);
                    // Use a fallback div to preserve space so the layout doesn't jump
                    if (isUsed) return <div key={`${item.text}-${idx}`} className="h-[38px] w-auto px-4 py-2 opacity-0 pointer-events-none">{item.text}</div>;
                    return <DraggableWord key={`${item.text}-${idx}`} word={item.text} typeId="bank-options" />;
                  });
                })()}
              </DroppableWordBank>
            </div>
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
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">Case Study</h2>
          {renderCloze()}
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
      <div className="flex h-full flex-col bg-background rounded-[1.5rem] overflow-hidden">
        
        {/* Distraction-Free Header */}
        <header className="sticky top-0 z-20 flex flex-col gap-2 border-b border-border bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:flex-row md:items-center md:justify-between transform-gpu">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/student/create-test")}
              className="grid size-7 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-3.5" weight="regular" />
            </button>
            <div className="h-4 w-px bg-border" />
            <div className="text-sm font-semibold text-muted-foreground">
              Question {currentIndex + 1} of {activePool.length}
              <span className="ml-3 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {activeQuestion.type.replace("-", " ").toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {timeRemaining !== null && config.mode !== 'review' && (
              <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 font-mono text-sm font-semibold", timeRemaining === 0 ? "bg-destructive text-destructive-foreground animate-bounce" : timeRemaining < 60 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted text-foreground")}>
                <Clock className="size-4" />
                {timeRemaining === 0 ? "Time's Up!" : formatTime(timeRemaining)}
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-xs font-semibold text-primary">{progressPercent}%</div>
            </div>
            
            <button 
              onClick={() => config.mode === 'review' ? navigate('/student/test-history') : handleEndSession()}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {config.mode === 'review' ? "Exit Review" : "End Session"}
            </button>
          </div>
        </header>

        {/* Question Area */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-4">
          <div className="mx-auto max-w-5xl">
            
            {timeRemaining === 0 ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-12 text-center animate-in fade-in zoom-in duration-500">
                <div className="grid size-20 place-items-center rounded-full bg-destructive/20 text-destructive">
                  <Clock className="size-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-destructive">Time's Up!</h2>
                  <p className="text-lg text-muted-foreground">Your test session has ended because the time ran out.</p>
                  <p className="text-sm text-muted-foreground mt-2">All your previously submitted answers have been saved.</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEndSession}
                  className="mt-8 rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90"
                >
                  End Session & View Results
                </motion.button>
              </div>
            ) : (
              <>
                <div className="mb-2 flex gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{activeQuestion.category}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{activeQuestion.subcategory}</span>
                </div>

                {!isSubmitted ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div 
                      className="mb-3 text-sm font-medium leading-relaxed text-foreground"
                      dangerouslySetInnerHTML={{ __html: activeQuestion.type === "next-gen-cloze" ? activeQuestion.text.replace(/{[0-9]+}/g, "_________") : activeQuestion.text }}
                    />
                    {renderContent()}
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-500">
                    <div className={cn(
                      "overflow-hidden rounded-2xl border bg-card shadow-sm",
                      isCorrect ? "border-t-4 border-t-success" : "border-t-4 border-t-destructive"
                    )}>

                      <div className="p-5">
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Question Review</h3>
                        <div 
                          className="mb-4 text-base font-medium leading-relaxed text-foreground"
                          dangerouslySetInnerHTML={{ __html: activeQuestion.type === "next-gen-cloze" ? activeQuestion.text.replace(/{[0-9]+}/g, "_________") : activeQuestion.text }}
                        />
                        
                        <div className={cn("grid grid-cols-1 gap-6 items-start", activeQuestion.type.startsWith("mcq") && "lg:grid-cols-2")}>
                          {/* Graded UI */}
                          <div className={cn("opacity-95", !activeQuestion.type.startsWith("mcq") && "w-full overflow-x-auto")}>
                            {renderContent()}
                          </div>
                          
                          <div className="rounded-xl border border-border bg-card p-4 shadow-sm overflow-hidden">
                            <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
                              <BookOpen className="size-4 text-primary" />
                              Detailed Explanation
                            </h3>
                            <div 
                              className="text-sm leading-relaxed text-muted-foreground break-words"
                              dangerouslySetInnerHTML={{ __html: activeQuestion.rationale }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Footer Actions (moved inside main scroll area) */}
            {timeRemaining !== 0 && (
              <footer className="w-full mt-8 pb-6 px-2">
                <div className="flex items-center justify-end">
                  
                  {config.mode === 'review' ? (
                    <div className="flex items-center gap-4">
                      {currentIndex < activePool.length - 1 && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleNext}
                          className="flex items-center gap-2 rounded-full bg-foreground px-8 py-3 text-sm font-bold text-background shadow-lg transition"
                        >
                          Next Question <ChevronRight className="size-4" />
                        </motion.button>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/student/test-history')}
                        className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition"
                      >
                        Exit Review
                      </motion.button>
                    </div>
                  ) : !isSubmitted ? (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      disabled={!canSubmit || timeRemaining === 0}
                      onClick={handleSubmitAnswer}
                      className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition disabled:opacity-50"
                    >
                      Submit Answer
                    </motion.button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleNext}
                      className="flex items-center gap-2 rounded-full bg-foreground px-8 py-3 text-sm font-bold text-background shadow-lg transition"
                    >
                      {currentIndex < activePool.length - 1 ? "Next Question" : "End Session"}
                      {currentIndex < activePool.length - 1 && <ChevronRight className="size-4" />}
                    </motion.button>
                  )}
                </div>
              </footer>
            )}

          </div>
        </main>
      </div>
    </StudentLayout>
  );
}
