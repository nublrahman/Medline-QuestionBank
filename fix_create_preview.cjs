const fs = require('fs');
const path = 'c:\\Users\\nublr\\Desktop\\Medline\\nurseprep-hub-main\\src\\routes\\questions.create.tsx';
let content = fs.readFileSync(path, 'utf8');

const lines = content.split(/\r?\n/);

// Find the start of the Preview section
const previewStart = lines.findIndex(l => l.includes('<Section title="Preview" desc="Exactly what students will see">'));
const previewEnd = lines.findIndex((l, i) => i > previewStart && l.includes('</Section>'));

if (previewStart === -1 || previewEnd === -1) {
    console.error("Could not find preview block");
    process.exit(1);
}

const replacement = `              <Section title="Preview" desc="Exactly what students will see">
                <div className={cn("rounded-2xl border border-border bg-background p-6 flex flex-col gap-6", (group === "grouped" ? parentIncludeTabs : includeTabs) && tabs.length > 0 && "md:flex-row")}>
                  
                  {((group === "grouped" ? parentIncludeTabs : includeTabs) && tabs.length > 0) && (
                    <div className="w-full md:w-1/2 flex flex-col gap-4">
                      {group === "grouped" && !isEmpty(parentStem) && (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[14.5px] leading-[1.6]" dangerouslySetInnerHTML={{ __html: parentStem }} />
                      )}
                      
                      <div className="flex overflow-x-auto gap-2 z-10 relative px-0 -mb-[1px]">
                        {tabs.map((tab, i) => (
                           <div key={i} className="px-5 py-2 text-[13.5px] whitespace-nowrap border rounded-none bg-white font-bold text-slate-900 border-slate-400 border-b-white z-20">
                             {tab.title}
                           </div>
                        ))}
                      </div>
                      <div className="bg-white border border-slate-400 rounded-none p-5 relative z-10 overflow-hidden">
                        <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: tabs[0]?.content || "" }} />
                      </div>
                    </div>
                  )}

                  <div className={cn("w-full flex flex-col gap-8", (group === "grouped" ? parentIncludeTabs : includeTabs) && tabs.length > 0 && "md:w-1/2")}>
                    {(group === "grouped" ? subQuestions : [{ type, stem, options, bowtieConfig, clozeBlanks, highlightConfig, rationale, category, subcategory }]).map((q: any, idx: number, arr: any[]) => (
                      <div key={idx} className={cn("w-full", arr.length > 1 && "pb-8 border-b border-border last:pb-0 last:border-0")}>
                        <div className="mb-3 flex items-center gap-2 text-xs">
                          <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">{group === "grouped" ? \`Item \${idx + 1}\` : "Ungrouped"}</span>
                          <span className="rounded-full bg-info/15 px-2.5 py-1 font-semibold text-info-foreground">{q.type === "bowtie" ? "BOW-TIE" : (q.type||"").replace(/-/g, " ").toUpperCase()}</span>
                          <span className="text-muted-foreground">{category} • {subcategory}</span>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: q.type === "next-gen-cloze" ? (q.stem||"").replace(/{(?:dropdown\\s+)?[0-9]+}/g, "_________") : (q.stem||"") }} />
                        
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
                            </div>
                          ) : q.type === "next-gen-cloze" ? (
                            <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
                              <div className="font-semibold text-primary mb-2">Fill in the Blank Configured</div>
                            </div>
                          ) : q.type === "next-gen-highlight" && (
                            <div className="rounded-xl border border-border p-4 text-sm bg-muted/20">
                              <div className="font-semibold text-primary mb-2">Highlight Configured</div>
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
                </div>
              </Section>`;

lines.splice(previewStart, previewEnd - previewStart + 1, replacement);
fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log("Replaced successfully!");
