const fs = require('fs');

const path = 'c:\\Users\\nublr\\Desktop\\Medline\\nurseprep-hub-main\\src\\routes\\student\\test-session.tsx';
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// 1. Add currentQuestionNumber and totalQuestions variables
const variablesToInsert = `  const progressPercent = activePool.length > 0 ? Math.round(((currentIndex + 1) / activePool.length) * 100) : 0;

  const uniqueParentIds = Array.from(new Set(activePool.map(q => q.parent_id || q.id)));
  const currentParentId = activeQuestion?.parent_id || activeQuestion?.id;
  const currentQuestionNumber = uniqueParentIds.indexOf(currentParentId) + 1;
  const totalQuestions = uniqueParentIds.length;`;

content = content.replace(
  `  const progressPercent = activePool.length > 0 ? Math.round(((currentIndex + 1) / activePool.length) * 100) : 0;`,
  variablesToInsert
);

// 2. Replace renderHeader function
const renderHeaderOld = `  const renderHeader = () => {
    let contentHTML = activeQuestion.type === "next-gen-cloze" && !activeQuestion.is_subquestion 
      ? "Complete the statement" 
      : activeQuestion.text;

    contentHTML = (contentHTML || "").replace(/{dropdown\\s*\\d*}/gi, '________');

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
  };`;

const renderHeaderNew = `  const renderHeader = () => {
    let contentHTML = "";
    if (activeQuestion.is_subquestion) {
      contentHTML = activeQuestion.parent_stem || "";
    } else {
      contentHTML = activeQuestion.type === "next-gen-cloze" 
        ? "Complete the statement" 
        : activeQuestion.text;
    }

    contentHTML = (contentHTML || "").replace(/{dropdown\\s*\\d*}/gi, '________');

    return (
      <>
        {activeQuestion.is_subquestion ? (
          <div className="mb-3 text-[13px] font-bold text-slate-800">
            Item {activeQuestion.sub_index + 1} of {activeQuestion.sub_total}
          </div>
        ) : (
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Question {(currentQuestionNumber).toString().padStart(2, '0')}</div>
        )}
        {contentHTML && (
          <div className="mb-6 flex items-start gap-3">
            <div className="mt-1 font-bold text-teal-700 text-[15px] shrink-0">Q:</div>
            <div 
              className="text-[14px] font-normal leading-relaxed text-slate-800 break-words prose prose-slate prose-sm max-w-none prose-p:my-1"
              dangerouslySetInnerHTML={{ __html: contentHTML }}
            />
          </div>
        )}
      </>
    );
  };`;

content = content.replace(renderHeaderOld, renderHeaderNew);

// 3. Replace header numbering
const topHeaderOld = `            <div className="text-[15px] font-semibold text-slate-900 hidden md:block">
              Question {currentIndex + 1} of {activePool.length}
            </div>`;

const topHeaderNew = `            <div className="text-[15px] font-semibold text-slate-900 hidden md:block">
              Question {currentQuestionNumber} of {totalQuestions}
            </div>`;

content = content.replace(topHeaderOld, topHeaderNew);

fs.writeFileSync(path, content, 'utf8');
console.log("Replaced successfully");
