const fs = require('fs');
const apiFile = '/home/rodrigodog/x402-agents-stellar-project/frontend/src/lib/api.ts';
let code = fs.readFileSync(apiFile, 'utf8');

code = code.replace(
  'return this.normalizeAgentResponse(response.data, { trace });',
  `
      if (response.data.networkEvents && Array.isArray(response.data.networkEvents)) {
        response.data.networkEvents.forEach((ev: any) => this.emitLog(ev));
      }
      return this.normalizeAgentResponse(response.data, { trace });
  `
);

code = code.replace(
  'return this.normalizeAgentResponse(retryResponse.data, {',
  `
          if (retryResponse.data.networkEvents && Array.isArray(retryResponse.data.networkEvents)) {
            retryResponse.data.networkEvents.forEach((ev: any) => this.emitLog(ev));
          }
          return this.normalizeAgentResponse(retryResponse.data, {
  `
);

fs.writeFileSync(apiFile, code);
