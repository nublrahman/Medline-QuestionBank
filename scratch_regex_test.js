const html = "<p>{dropdown 1} {dropdown 2} {dropdown 3}</p>";
const matches = Array.from(html.matchAll(/{(?:dropdown\s+)?([0-9]+)}/g));
console.log(matches.map(m => m[1]));
