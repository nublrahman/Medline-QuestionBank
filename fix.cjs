const fs = require('fs');
let content = fs.readFileSync('src/routes/questions.create.tsx', 'utf8');

// Fix 1017, 1040, 1063
content = content.replace(/className="flex-1 bg-transparent text-sm outline-none px-1 min-w-0 resize-none overflow-hidden py-1 min-h-\[28px\]" `\} \/>/g, 
  'className="flex-1 bg-transparent text-sm outline-none px-1 min-w-0 resize-none overflow-hidden py-1 min-h-[28px]" />');

// Fix 1105
content = content.replace(/className="flex-1 bg-transparent text-sm outline-none px-2"\n                                `\}/g,
  'className="flex-1 bg-transparent text-sm outline-none px-2"');

// Fix 1260
content = content.replace(/className="bg-transparent text-sm outline-none px-1 font-semibold"\n                              `\}/g,
  'className="bg-transparent text-sm outline-none px-1 font-semibold"');

// Fix 2591
content = content.replace(/w-full transition-all"\n                                   C\$\{cIdx \+ 1\}`\} /g,
  'w-full transition-all"');

fs.writeFileSync('src/routes/questions.create.tsx', content);
console.log('Fixed syntax errors.');
