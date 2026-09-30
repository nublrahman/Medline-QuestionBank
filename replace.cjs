const fs = require('fs');
let content = fs.readFileSync('src/routes/questions.create.tsx', 'utf8');

// Replace string placeholders
content = content.replace(/placeholder="[^"]*"/g, '');
content = content.replace(/placeholder='[^']*'/g, '');

// Replace expression placeholders
content = content.replace(/placeholder=\{[^}]*\}/g, '');

fs.writeFileSync('src/routes/questions.create.tsx', content);
console.log('Placeholders removed.');
