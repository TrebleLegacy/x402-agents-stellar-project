require('dotenv').config({ path: '.env' });
import fs from 'fs';
import path from 'path';
import { AgentRepository } from '../agents/repository';
import { AgentGraph } from '../agents/graph';
import { generateLLMDeFiData } from '../api/routes/defi.agent';
import { generateLLMArticles } from '../api/routes/news.agent';
import { generateLLMFindings } from '../api/routes/security.agent';
import { AgentState, IntentType, ActionType } from '../agents/types';

async function runTests() {
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const resultsFile = path.join(resultsDir, `agent_tests_${timestamp}.log`);

  const writeLog = (msg: string) => {
    fs.appendFileSync(resultsFile, msg + '\n');
  };
  
  const log = (msg: string) => {
    console.log(msg);
    writeLog(msg);
  };

  log(`=== Starting Agent Tests at ${new Date().toISOString()} ===\n`);

  // Test Specialized Agents
  log('--- Testing DeFi Agent ---');
  try {
    const defiResult = await generateLLMDeFiData('Uniswap', 'tvl');
    log(`[DeFi] Success:\n${JSON.stringify(defiResult, null, 2)}\n`);
  } catch (e: any) {
    log(`[DeFi] Error: ${e.message}\n`);
  }

  log('--- Testing News Agent ---');
  try {
    const newsResult = await generateLLMArticles('Bitcoin', 2);
    log(`[News] Success:\n${JSON.stringify(newsResult, null, 2)}\n`);
  } catch (e: any) {
    log(`[News] Error: ${e.message}\n`);
  }

  log('--- Testing Security Agent ---');
  try {
    const securityResult = await generateLLMFindings('https://example.com', 'quick');
    log(`[Security] Success:\n${JSON.stringify(securityResult, null, 2)}\n`);
  } catch (e: any) {
    log(`[Security] Error: ${e.message}\n`);
  }

  // Test Main Agent (AgentGraph with Tools)
  log('--- Testing Main Orchestrator Agent (AgentGraph) ---');
  try {
    const repo = new AgentRepository();
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) throw new Error('No OPENAI_API_KEY available. Skipping Main Agent.');
    
    const agent = new AgentGraph(repo, apiKey);
    const session_id = 'test_session_tools_123';

    const state: AgentState = {
      session_id,
      current_input: 'Traga um resumo dos indicadores de mercado globais, focando em métricas essenciais como cripto',
      detected_intent: IntentType.GENERAL,
      action_type: ActionType.NONE,
      session_data: { session_token: '123', user_id: 'test', email: 'test@example.com', created_at: '', last_activity: '' },
      messages: [],
      response_message: "",
      action_params: {},
      success: false,
    };

    log(`[Main Agent] Trying prompt: "Traga um resumo dos indicadores de mercado globais, focando em métricas essenciais como cripto"`);
    const toolResponse = await agent.processInput(state);
    
    log(`[Main Agent] Resulting State keys: ${Object.keys(toolResponse).join(', ')}`);
    log(`[Main Agent] Response Message:\n${toolResponse.response_message}\n`);
    log(`[Main Agent] Final Intent: ${toolResponse.detected_intent}`);
    
  } catch (e: any) {
    log(`[Main Agent] Error: ${e.message}\n`);
  }

  log(`=== Tests Completed ===\nResults saved to ${resultsFile}`);
}

runTests().catch(console.error);
