export const questionTypes = {
  traditional: [
    { id: "mcq-single", name: "MCQ Single Answer", desc: "One correct answer." },
    { id: "mcq-multi", name: "MCQ Multiple Answer", desc: "SATA — multiple correct." },
  ],
  ngn: [
    { id: "bowtie", name: "Bow-Tie", desc: "Cause & effect diagram." },
    { id: "next-gen-cloze", name: "Fill in the Blank", desc: "Cascading dropdowns." },
    { id: "table", name: "Table-Type Question", desc: "Row/column selections." },
    { id: "highlight", name: "Click to Highlight", desc: "Highlight key text." },
    { id: "dnd-order", name: "Drag & Drop Ordering", desc: "Arrange in order." },
    { id: "dnd-fib", name: "Drag & Drop Fill in Blank", desc: "Drag tokens to blanks." },
  ],
};
