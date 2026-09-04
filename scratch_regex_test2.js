const val = "<p>{dropdown&nbsp;2}</p>";
const matches = Array.from(val.matchAll(/{(?:dropdown\s+)?([0-9]+)}/g));
console.log("matches:", matches.length);
