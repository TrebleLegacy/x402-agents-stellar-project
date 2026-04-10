const fs = require('fs');

const routeFile = '/home/rodrigodog/x402-agents-stellar-project/backend/src/agents/routes.ts';
let code = fs.readFileSync(routeFile, 'utf8');

// Just mirror /chat logic as /query to fix the 404, but we map query to message
code = code.replace('router.post("/chat",', 'router.post(["/chat", "/query"],');

// Since frontend sends `{ query, session_id }`, let's handle that:
code = code.replace('const { message } = req.body;', 'const message = req.body.message || req.body.query;');
code = code.replace('let { session_token } = req.body;', 'let session_token = req.body.session_token || req.body.session_id;');

fs.writeFileSync(routeFile, code);
