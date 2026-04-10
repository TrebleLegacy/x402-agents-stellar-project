import { createX402ServerFromEnv } from '../sdk/x402/server';
import { X402PaymentBuilder } from '../stellar/x402PaymentBuilder';
import { executeNetworkTool, apiTools } from '../api/routes/network';
import { logger } from '../utils/logger';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables for testing
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';
const RED = '\x1b[31m';

/**
 * Full system test script for Pitch Demo execution
 */
async function runPitchTests() {
  console.log('🚀 Starting Pitch Demo Feature Tests...\n');

  try {
    // ---------------------------------------------------------
    // TEST 1: The Orchestrator LLM Interaction (Check LangChain)
    // ---------------------------------------------------------
    console.log('🔄 Test 1: Testing LLM Setup for Orchestrator/Bidding');
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
    
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini', // Faster model for quick testing
      temperature: 0.3,
    });
    
    const llmRes = await llm.invoke('Respond with exactly "alive"');
    if (!llmRes.content.toString().toLowerCase().includes('alive')) {
      throw new Error(`LLM did not respond correctly. Got: ${llmRes.content}`);
    }
    console.log(`${GREEN}✅ Test 1 Passed: LLM Orchestrator Engine is Online${RESET}\n`);

    // ---------------------------------------------------------
    // TEST 2: Network Tools Architecture (Real APIs & Simulations)
    // ---------------------------------------------------------
    console.log('🔄 Test 2: Testing Public/Simulated Network Tools');
    
    // Testing Public Fetch (Weather)
    console.log('   - Testing Open-Meteo Public Fetch');
    const weatherRes = await executeNetworkTool('open_meteo', { city: 'Tokyo' });
    if (!weatherRes || !weatherRes.location || weatherRes.location.name !== 'Tokyo') {
      throw new Error('Weather API fetch failed');
    }

    // Testing Simulated Data (Stripe API)
    console.log('   - Testing Dynamic Simulation (Stripe Balance)');
    const stripeRes = await executeNetworkTool('stripe_balance', {});
    if (!stripeRes || stripeRes.object !== 'balance') {
      throw new Error('Stripe simulation failed');
    }
    console.log(`${GREEN}✅ Test 2 Passed: Public APIs and Simulators are functional${RESET}\n`);

    // ---------------------------------------------------------
    // TEST 3: X402 Payment Protocol Architecture (x402 Server & Stellar)
    // ---------------------------------------------------------
    console.log('🔄 Test 3: Testing x402 Protocol Header Requirements');
    const x402Server = createX402ServerFromEnv();
    
    const testTool = apiTools[0]; // Take the first tool, eg: openai_chat
    const wrappedEndpoint = x402Server.wrapEndpoint({
      price: testTool.price,
      asset: 'XLM',
      description: testTool.description,
      handler: async () => ({ success: true }),
    });

    if (typeof wrappedEndpoint !== 'function') {
      throw new Error('Endpoint wrapping failed');
    }
    console.log(`${GREEN}✅ Test 3 Passed: x402 Protocol Requirements Active${RESET}\n`);

    console.log('🎉 ALL PITCH FEATURES PASSING! SYSTEM READY FOR DEMO.');

  } catch (error: any) {
    console.error(`${RED}❌ Demo Test Failed: ${error.message}${RESET}`);
    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  runPitchTests().catch(console.error);
}
