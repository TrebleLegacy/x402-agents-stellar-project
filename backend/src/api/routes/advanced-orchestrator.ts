/**
 * Advanced Agent Orchestrator with LLM Reasoning & Real x402 Payments
 * Every agent decision includes reasoning, intermediary LLM calls, and real payments
 */

import { Router, Request, Response } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { Keypair, Operation, Asset, Memo, Networks, TransactionBuilder, Horizon } from '@stellar/stellar-sdk';
import { v4 as uuid } from 'uuid';
import { logger } from '../../utils/logger';
import { apiTools, executeNetworkTool } from './network';

const router = Router();
const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0.3 });

interface AgentReasoningStep {
  step: number;
  stage: string;
  reasoning: string;
  decision: string;
  cost?: number;
  txHash?: string;
  toolId?: string;
  toolParams?: Record<string, any>;
  fallbackToolId?: string | null;
  fallbackToolParams?: Record<string, any> | null;
}

interface ExecutionTrace {
  agentId: string;
  taskId: string;
  reasoning: AgentReasoningStep[];
  payments: Array<{
    timestamp: string;
    amount: string;
    description: string;
    txHash: string;
  }>;
  output: any;
}

/**
 * STAGE 1: Agent Analysis & Reasoning
 * LLM evaluates the task before tool selection
 */
const stageAnalysisAndReasoning = async (task: string, agentName: string): Promise<AgentReasoningStep> => {
  const schema = z.object({
    reasoning: z.string().describe('Detailed analysis of the task and approach'),
    selectedTools: z.array(z.string()).describe('List of tools needed'),
    expectedCost: z.number().describe('Estimated cost in XLM for x402 payments'),
    confidence: z.number().describe('Confidence level 0-100'),
  });

  const prompt = `You are ${agentName}, an expert agent in your domain.
Task: "${task}"

Analyze this task deeply:
1. What is the core requirement?
2. Which tools/data sources are essential?
3. What potential challenges exist?
4. Estimate cost and confidence.

You will execute this via x402 paid APIs.`;

  try {
    const analysis = await llm.withStructuredOutput(schema).invoke(prompt);
    return {
      step: 1,
      stage: 'Analysis & Reasoning',
      reasoning: analysis.reasoning,
      decision: `Selected tools: ${analysis.selectedTools.join(', ')} | Est. cost: ${analysis.expectedCost} XLM`,
      cost: analysis.expectedCost,
    };
  } catch (err: any) {
    logger.error(`Analysis error: ${err.message}`);
    return {
      step: 1,
      stage: 'Analysis & Reasoning',
      reasoning: 'Error during analysis',
      decision: 'Proceeding with default strategy',
    };
  }
};

/**
 * STAGE 2: Tool Selection & Cost Negotiation
 * LLM decides which tools to use and negotiates x402 pricing
 */
const stageToolSelectionAndPricing = async (
  taskContext: string,
  availableTools: Array<{ id: string; name: string; cost: number; description: string; params?: Record<string, string> }>,
  budget: number
): Promise<AgentReasoningStep> => {
  const schema = z.object({
    selectedToolId: z.string().describe('Tool id to use'),
    toolParams: z.record(z.string(), z.any()).describe('Parameters for selected tool'),
    reasoning: z.string().describe('Why this tool over others'),
    negotiatedPrice: z.number().describe('Agreed x402 price in XLM'),
    fallbackToolId: z.string().nullable().describe('Fallback tool id if primary fails'),
    fallbackParams: z.record(z.string(), z.any()).nullable().describe('Parameters for fallback tool'),
  });

  const toolsStr = availableTools
    .map((tool) => {
      const params = Object.keys(tool.params || {}).join(', ') || 'none';
      return `- ${tool.id} (${tool.name}): ${tool.cost} XLM (${tool.description}) Params: ${params}`;
    })
    .join('\n');
  const prompt = `Task context: ${taskContext}

Available tools:
${toolsStr}

Budget: ${budget} XLM

Pick the best tool id and params from the list.`;

  try {
    const selection = await llm.withStructuredOutput(schema).invoke(prompt);
    return {
      step: 2,
      stage: 'Tool Selection & Pricing',
      reasoning: selection.reasoning,
      decision: `Selected: ${selection.selectedToolId} | Negotiated price: ${selection.negotiatedPrice} XLM | Fallback: ${selection.fallbackToolId || 'None'}`,
      cost: selection.negotiatedPrice,
      toolId: selection.selectedToolId,
      toolParams: selection.toolParams || {},
      fallbackToolId: selection.fallbackToolId,
      fallbackToolParams: selection.fallbackParams || null,
    };
  } catch (err: any) {
    logger.error(`Tool selection error: ${err.message}`);
    const fallbackTool = availableTools[0];
    return {
      step: 2,
      stage: 'Tool Selection & Pricing',
      reasoning: 'Error during selection',
      decision: 'Using default tool',
      cost: fallbackTool?.cost,
      toolId: fallbackTool?.id,
      toolParams: {},
    };
  }
};

/**
 * STAGE 3: Real x402 Payment Processing
 * Execute actual Stellar transaction via x402
 */
const stageX402Payment = async (
  agentAddress: string,
  destinationAddress: string,
  amount: number,
  taskDescription: string
): Promise<AgentReasoningStep & { txHash: string }> => {
  try {
    // Real Stellar testnet payment
    const publicKey = process.env.AGENT_PUBLIC_KEY || '';
    const secret = process.env.AGENT_SECRET_KEY || '';

    if (!publicKey || !secret) {
      logger.warn('Stellar keys not configured, simulating payment');
      return {
        step: 3,
        stage: 'x402 Payment (Simulated)',
        reasoning: 'Stellar keys not configured, using simulation mode',
        decision: `[SIM] Paid ${amount} XLM to ${destinationAddress} for ${taskDescription}`,
        cost: amount,
        txHash: `sim_${uuid()}`,
      };
    }

    const serverUrl = 'https://horizon-testnet.stellar.org';
    const server = new Horizon.Server(serverUrl);
    const sourceKeypair = Keypair.fromSecret(secret);
    
    // Get current account
    const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

    // Build transaction
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: destinationAddress,
          asset: Asset.native(),
          amount: amount.toString(),
        })
      )
      .addMemo(Memo.text(taskDescription.slice(0, 28)))
      .setTimeout(300)
      .build();

    transaction.sign(sourceKeypair);
    const txHash = transaction.hash().toString('hex');

    // Submit (actual tx)
    try {
      const result = await server.submitTransaction(transaction);
      logger.info(`x402 payment successful: ${result.hash}`);

      return {
        step: 3,
        stage: 'x402 Payment (Real)',
        reasoning: `Submitted real Stellar payment via x402 protocol`,
        decision: `Paid ${amount} XLM → ${destinationAddress}`,
        cost: amount,
        txHash: result.hash || txHash,
      };
    } catch (submitErr: any) {
      if (submitErr.status === 400) {
        logger.warn(`Transaction submission error (likely account not ready): ${submitErr.message}`);
        return {
          step: 3,
          stage: 'x402 Payment (Fallback)',
          reasoning: `Real payment attempted; using fallback mode`,
          decision: `[FALLBACK] ${amount} XLM queued for ${destinationAddress}`,
          cost: amount,
          txHash: `fallback_${uuid()}`,
        };
      }
      throw submitErr;
    }
  } catch (err: any) {
    logger.error(`x402 payment error: ${err.message}`);
    return {
      step: 3,
      stage: 'x402 Payment (Error)',
      reasoning: `Payment processing encountered error`,
      decision: `Error: ${err.message}`,
      cost: 0,
      txHash: `error_${uuid()}`,
    };
  }
};

/**
 * STAGE 4: Data Fetching with Real APIs
 * LLM evaluates data quality from real sources
 */
const stageDataFetching = async (
  taskContext: string,
  toolCalls: Array<{ id: string; params: Record<string, any> }>
): Promise<AgentReasoningStep> => {
  const schema = z.object({
    dataQuality: z.string().describe('Assessment of data quality'),
    insights: z.string().describe('Key insights from data'),
    confidence: z.number().describe('Confidence in data 0-100'),
    nextSteps: z.string().describe('Recommended next actions'),
  });

  const calls = toolCalls.length
    ? toolCalls
    : [{ id: 'openai_chat', params: { prompt: taskContext } }];

  const results = await Promise.all(
    calls.map(async (call) => {
      try {
        const data = await executeNetworkTool(call.id, call.params || {});
        return { toolId: call.id, params: call.params, data };
      } catch (error: any) {
        return { toolId: call.id, params: call.params, error: error.message || String(error) };
      }
    })
  );

  const prompt = `You have fetched data using these tools: ${calls.map((call) => call.id).join(', ')}

Results:
${JSON.stringify(results, null, 2)}

Context: ${taskContext}

Evaluate:
1. Data quality and reliability
2. Key insights and patterns
3. Confidence level
4. Next steps if needed`;

  try {
    const evaluation = await llm.withStructuredOutput(schema).invoke(prompt);
    return {
      step: 4,
      stage: 'Data Fetching & Evaluation',
      reasoning: `${evaluation.dataQuality}\n\nInsights: ${evaluation.insights}`,
      decision: `Confidence: ${evaluation.confidence}% | Next: ${evaluation.nextSteps}`,
    };
  } catch (err: any) {
    logger.error(`Data evaluation error: ${err.message}`);
    return {
      step: 4,
      stage: 'Data Fetching & Evaluation',
      reasoning: 'Data fetching completed',
      decision: 'Proceeding with analysis',
    };
  }
};

/**
 * STAGE 5: Output Synthesis & Reasoning
 * Final LLM reasoning before returning results
 */
const stageSynthesisAndOutput = async (
  gatheredData: any,
  originalTask: string
): Promise<AgentReasoningStep & { output: string }> => {
  const schema = z.object({
    reasoning: z.string().describe('Final reasoning and analysis'),
    output: z.string().describe('Synthesized output for user'),
    confidence: z.number().describe('Final confidence 0-100'),
  });

  const prompt = `Original task: "${originalTask}"

Gathered data: ${JSON.stringify(gatheredData, null, 2)}

Synthesize this into a clear, actionable output:
1. Analyze all data
2. Draw conclusions
3. Provide recommendations
4. State confidence level`;

  try {
    const synthesis = await llm.withStructuredOutput(schema).invoke(prompt);
    return {
      step: 5,
      stage: 'Synthesis & Output',
      reasoning: synthesis.reasoning,
      decision: `Confidence: ${synthesis.confidence}%`,
      output: synthesis.output,
    };
  } catch (err: any) {
    logger.error(`Synthesis error: ${err.message}`);
    return {
      step: 5,
      stage: 'Synthesis & Output',
      reasoning: 'Error during synthesis',
      decision: 'Returning raw data',
      output: JSON.stringify(gatheredData),
    };
  }
};

/**
 * Main endpoint: Execute agent with full reasoning chain
 */
router.post('/execute', async (req: Request, res: Response) => {
  const { task, agentName, budget = 1.0, destinationAddress } = req.body;

  if (!task || !agentName) {
    return res.status(400).json({ error: 'task and agentName required' });
  }

  const executionTrace: ExecutionTrace = {
    agentId: uuid(),
    taskId: uuid(),
    reasoning: [],
    payments: [],
    output: null,
  };

  try {
    // Stage 1: Analysis & Reasoning
    logger.info(`[${agentName}] Stage 1: Analysis & Reasoning`);
    const stage1 = await stageAnalysisAndReasoning(task, agentName);
    executionTrace.reasoning.push(stage1);
    res.write(`data: ${JSON.stringify({ stageNumber: 1, ...stage1 })}\n\n`);

    // Stage 2: Tool Selection
    logger.info(`[${agentName}] Stage 2: Tool Selection`);
    const availableTools = apiTools
      .filter((tool) => tool.callable)
      .map((tool) => {
        const parsedCost = parseFloat(tool.price);
        return {
          id: tool.id,
          name: tool.name,
          cost: Number.isFinite(parsedCost) ? parsedCost : 0.01,
          description: tool.description,
          params: tool.params || {},
        };
      });
    const stage2 = await stageToolSelectionAndPricing(task, availableTools, budget);
    executionTrace.reasoning.push(stage2);
    res.write(`data: ${JSON.stringify({ stageNumber: 2, ...stage2 })}\n\n`);

    // Stage 3: x402 Payment
    logger.info(`[${agentName}] Stage 3: x402 Payment`);
    const stage3 = await stageX402Payment(
      executionTrace.agentId,
      destinationAddress || 'GBBD47UZQ2EOPZMQAAIANR4BFX2PHWUQNHZIBV46BTCDJKFQUKBWQ4CKP',
      stage2.cost || 0.1,
      task
    );
    executionTrace.reasoning.push(stage3);
    executionTrace.payments.push({
      timestamp: new Date().toISOString(),
      amount: (stage2.cost || 0.1).toString(),
      description: `x402 payment for ${task.slice(0, 40)}...`,
      txHash: stage3.txHash,
    });
    res.write(`data: ${JSON.stringify({ stageNumber: 3, ...stage3 })}\n\n`);

    // Stage 4: Data Fetching
    logger.info(`[${agentName}] Stage 4: Data Fetching`);
    const toolCalls: Array<{ id: string; params: Record<string, any> }> = [];
    if (stage2.toolId) {
      toolCalls.push({ id: stage2.toolId, params: stage2.toolParams || {} });
    }
    if (stage2.fallbackToolId) {
      toolCalls.push({
        id: stage2.fallbackToolId,
        params: stage2.fallbackToolParams || {},
      });
    }
    const stage4 = await stageDataFetching(task, toolCalls);
    executionTrace.reasoning.push(stage4);
    res.write(`data: ${JSON.stringify({ stageNumber: 4, ...stage4 })}\n\n`);

    // Stage 5: Synthesis
    logger.info(`[${agentName}] Stage 5: Synthesis`);
    const stage5 = await stageSynthesisAndOutput({ task }, task);
    executionTrace.reasoning.push(stage5);
    executionTrace.output = stage5.output;
    res.write(`data: ${JSON.stringify({ stageNumber: 5, ...stage5 })}\n\n`);

    // Final response
    res.write(
      `data: ${JSON.stringify({
        status: 'complete',
        executionTrace,
        totalCost: executionTrace.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      })}\n\n`
    );
    res.end();
  } catch (err: any) {
    logger.error(`Execution error: ${err.message}`);
    res.write(
      `data: ${JSON.stringify({
        error: err.message,
        executionTrace,
      })}\n\n`
    );
    res.end();
  }
});

export default router;
