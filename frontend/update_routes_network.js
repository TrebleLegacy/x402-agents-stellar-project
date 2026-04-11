const fs = require('fs');

const routeFile = '/home/rodrigodog/x402-agents-stellar-project/backend/src/agents/routes.ts';
let code = fs.readFileSync(routeFile, 'utf8');

if (!code.includes('networkEvents: resultState.networkEvents')) {
  // Update the response JSON
  code = code.replace(
    'success: resultState.success,',
    'success: resultState.success,\n        networkEvents: resultState.networkEvents,'
  );

  // We should also replace the root level so that the frontend catches it easily?
  // Frontend api.ts looks for response.data.networkEvents
  code = code.replace(
    'return res.json({',
    `return res.json({
      networkEvents: resultState.networkEvents,`
  );
  fs.writeFileSync(routeFile, code);
}
