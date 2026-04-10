const fs = require('fs');
const typesFile = '/home/rodrigodog/x402-agents-stellar-project/backend/src/agents/types.ts';
let code = fs.readFileSync(typesFile, 'utf8');

if (!code.includes('networkEvents?: any[];')) {
  code = code.replace(
    'success: boolean;',
    'success: boolean;\n  networkEvents?: any[];'
  );
  fs.writeFileSync(typesFile, code);
}
