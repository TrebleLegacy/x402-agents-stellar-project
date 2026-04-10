require('dotenv').config({ path: '.env' });
import fs from 'fs';
import path from 'path';
import { AgentRepository } from '../agents/repository';
import { AgentGraph } from '../agents/graph';

async function runAllToolTests() {
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const resultsFile = path.join(resultsDir, `all_tools_tests_${timestamp}.log`);

  const writeLog = (msg: string) => {
    fs.appendFileSync(resultsFile, msg + '\n');
    console.log(msg);
  };

  writeLog(`=== Starting Comprehensive Tool Tests FORGE v3 at ${new Date().toISOString()} ===\n`);

  try {
    const repo = new AgentRepository();
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) throw new Error('No OPENAI_API_KEY available.');
    
    const agent = new AgentGraph(repo, apiKey);
    const session_id = 'test_forge_v3_session';
    const baseState = {
      session_id,
      detected_intent: 'general' as any,
      action_type: 'none' as any,
      session_data: { session_token: '123', user_id: 'test_user_v3', email: 'test@example.com', created_at: '', last_activity: '' },
      messages: [],
      response_message: "",
      action_params: {},
      current_input: "",
      success: false,
    };

    const prompts = [
      "Quais as ultimas noticias de tecnologia?", // News
      "Faça uma analise de segurança no dominio google.com com scan vulnerability", // Security
      "Qual o TVL da Uniswap?", // DeFi
    ];

    for (const prompt of prompts) {
      writeLog(`\n[Agent] Trying prompt: "${prompt}"`);
      const response = await agent.processInput({ ...baseState, current_input: prompt });
      writeLog(`Response:\n${response.response_message}`);
    }

  } catch (e: any) {
    writeLog(`[Error]: ${e.message}\n`);
  }

  writeLog(`=== Tests Completed ===\nResults saved to ${resultsFile}`);
}

runAllToolTests().catch(console.error);
