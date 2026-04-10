const fs = require('fs');
const filepath = '/home/rodrigodog/x402-agents-stellar-project/frontend/src/app/page.tsx';
let txt = fs.readFileSync(filepath, 'utf8');

txt = txt.replace("source: 'client',", "source: 'network',");
txt = txt.replace("source: 'system',", "source: 'forge',");

fs.writeFileSync(filepath, txt);
