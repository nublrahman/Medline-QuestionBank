const fs = require('fs');

const path = 'c:\\Users\\nublr\\Desktop\\Medline\\nurseprep-hub-main\\src\\routes\\questions.create.tsx';
let content = fs.readFileSync(path, 'utf8');

const fullStartStr = `                  {includeTabs && tabs.length > 0 ? (`;
const fullEndStr = `                  <div className="mt-5 rounded-xl bg-muted p-4 text-sm overflow-hidden">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</div>
                    <div className="prose prose-sm dark:prose-invert max-w-none mt-2 break-all" dangerouslySetInnerHTML={{ __html: rationale }} />
                  </div>`;

const startIndex = content.indexOf(fullStartStr);
const endIndex = content.indexOf(fullEndStr) + fullEndStr.length;

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find the block to replace");
    process.exit(1);
}

const replacement = `                  <div className={cn("flex flex-col gap-6", includeTabs && tabs.length > 0 && "md:flex-row")}>
                    {includeTabs && tabs.length > 0 && (
                      <div className="w-full md:w-1/2">
                        <ScenarioTabsPreview tabs={tabs} />
                      </div>
                    )}
                    <div className={cn("w-full flex flex-col", includeTabs && tabs.length > 0 && "md:w-1/2")}>
                      {(group === "grouped" ? subQuestions : [{ type, stem, options, bowtieConfig, clozeBlanks, highlightConfig, rationale }]).map((q: any, idx: number, arr: any[]) => (
                        <div key={idx} className={cn("w-full", arr.length > 1 && "mb-8 pb-8 border-b border-border last:mb-0 last:pb-0 last:border-0")}>
                          {arr.length > 1 && <div className="mb-4 text-sm font-bold text-primary">Sub-question {idx + 1} <span className="text-muted-foreground font-normal ml-2">({q.type})</span></div>}
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: q.type === "next-gen-cloze" ? (q.stem || "").replace(/{(?:dropdown\\s+)?[0-9]+}/g, "_________") : (q.stem || "") }} />
                          <div className="mt-4 space-y-2">
                            {q.type?.startsWith("mcq") ? (q.options || []).map((o: any) => (
                              <div key={o.letter} className={cn("flex items-center gap-3 rounded-xl border p-3 text-sm", o.correct ? "border-success/40 bg-success/5" : "border-border")}>
                                <div className="grid size-7 place-items-center rounded-lg bg-secondary text-xs font-semibold shrink-0">{o.letter}</div>
                                <span className="flex-1 break-words min-w-0">{o.text}</span>
                                {o.correct && <Check className="ml-auto size-4 text-success-foreground" />}
                              </div>
                            )) : q.type === "bowtie" ? (
                              <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
                                <div className="font-semibold text-primary mb-2">Advanced Bow-Tie Configured</div>
                                <p className="text-muted-foreground">Causes/Assessments: {q.bowtieConfig?.actions?.filter((w: any)=>!isEmpty(w.text)).length || 0} | Core Condition: {q.bowtieConfig?.conditions?.filter((w: any)=>!isEmpty(w.text)).length || 0} | Treatments/Effects: {q.bowtieConfig?.parameters?.filter((w: any)=>!isEmpty(w.text)).length || 0}</p>
                              </div>
                            ) : q.type === "next-gen-cloze" ? (
                              <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
                                <div className="font-semibold text-primary mb-2">Fill in the Blank Configured</div>
                                <p className="text-muted-foreground">Configured Blanks: {Object.keys(q.clozeBlanks || {}).length}</p>
                              </div>
                            ) : q.type === "next-gen-highlight" && (
                              <div className="rounded-xl border border-border p-4 text-sm bg-muted/20 space-y-4">
                                <div>
                                  <div className="font-semibold text-primary mb-1">Click to Highlight Configured</div>
                                  <p className="text-muted-foreground text-xs">Layout: <span className="capitalize">{q.highlightConfig?.layout || "paragraph"}</span> | Sentences/Phrases: {q.highlightConfig?.layout === "table" ? (q.highlightConfig?.tables || []).reduce((acc: any, t: any) => acc + t.rows.reduce((rAcc: any, r: any) => rAcc + r.sentences.length, 0), 0) : q.highlightConfig?.sentences?.length || 0} | Correct Highlights: {q.highlightConfig?.correctHighlights?.length || 0}</p>
                                </div>
                                {q.highlightConfig?.layout === "table" && q.highlightConfig?.tables && q.highlightConfig.tables.some((t: any) => t.rows.some((r: any) => r.sentences.length > 0)) && (
                                  <div className="mt-4 bg-background rounded-lg overflow-hidden border border-border shadow-sm">
                                    <div className="flex border-b border-border gap-1 overflow-x-auto bg-muted/30">
                                      {q.highlightConfig.tables.map((t: any, idx2: number) => (
                                        <button
                                          key={t.id}
                                          type="button"
                                          onClick={(e) => { e.preventDefault(); setActiveHighlightTab(idx2); }}
                                          className={cn(
                                            "px-4 py-2 text-[12px] font-bold rounded-t-md relative z-10 transition-colors border border-b-0",
                                            activeHighlightTab === idx2
                                              ? "text-foreground bg-card border-border -mb-[1px]"
                                              : "text-muted-foreground bg-transparent border-transparent hover:bg-muted"
                                          )}
                                        >
                                          {t.tabName || "Unnamed Tab"}
                                        </button>
                                      ))}
                                    </div>
                                    {q.highlightConfig.tables[activeHighlightTab] && (
                                      <div className="overflow-x-auto bg-card">
                                        <table className="w-full text-left text-[12px]">
                                          <thead className="bg-[#eaf3fa] text-slate-900 border-b border-border">
                                            <tr>
                                              <th className="p-3 font-bold w-[30%]">{q.highlightConfig.tables[activeHighlightTab].headers?.col1 || "Body System"}</th>
                                              <th className="p-3 font-bold">{q.highlightConfig.tables[activeHighlightTab].headers?.col2 || "Findings"}</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-border">
                                            {q.highlightConfig.tables[activeHighlightTab].rows?.map((row: any, rIndex: number) => (
                                              <tr key={row.id} className={rIndex % 2 === 0 ? "bg-slate-50/70" : "bg-card"}>
                                                <td className="p-3 font-bold text-slate-800 align-top">{row.label}</td>
                                                <td className="p-3 leading-relaxed align-top">
                                                  {row.sentences?.map((s: any, i: number) => {
                                                    const isCorrect = (q.highlightConfig.correctHighlights || []).includes(s.id);
                                                    return (
                                                      <span key={s.id}>
                                                        <span className={cn("transition-all rounded-sm py-0.5", isCorrect ? "bg-success/30 border-b-2 border-success font-semibold" : "bg-transparent")}>
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
                                )}
                                {(!q.highlightConfig?.layout || q.highlightConfig?.layout === "paragraph") && q.highlightConfig?.sentences && q.highlightConfig.sentences.length > 0 && (
                                  <div className="mt-4 bg-background p-4 rounded-lg border border-border shadow-sm leading-relaxed text-[13px]">
                                    {q.highlightConfig.sentences.map((sentence: any) => {
                                      if (!sentence.isClickable) return <span key={sentence.id}>{sentence.text}</span>;
                                      const isCorrect = (q.highlightConfig.correctHighlights || []).includes(sentence.id);
                                      return (
                                        <span key={sentence.id} className={cn("transition-all rounded-sm py-0.5", isCorrect ? "bg-success/30 border-b-2 border-success font-semibold" : "bg-transparent")}>
                                          {sentence.text}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="mt-5 rounded-xl bg-muted p-4 text-sm overflow-hidden">
                            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</div>
                            <div className="prose prose-sm dark:prose-invert max-w-none mt-2 break-all" dangerouslySetInnerHTML={{ __html: q.rationale || "" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(path, content, 'utf8');
console.log("Replaced successfully!");
