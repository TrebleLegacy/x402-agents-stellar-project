import { Router } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { createX402ServerFromEnv } from '../../sdk/x402/server';
import { X402Client } from '../../sdk/x402/client';
import { logger } from '../../utils/logger';

const router = Router();
const x402 = createX402ServerFromEnv();
const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: process.env.FORGE_MODEL || 'gpt-4o',
  temperature: 0.4,
});

const parseJson = (content: string): any => {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Invalid JSON response');
  }
  return JSON.parse(match[0]);
};

const runLlm = async (prompt: string, fallback: any): Promise<any> => {
  try {
    const response = await llm.invoke(prompt);
    return parseJson(response.content as string);
  } catch {
    return fallback;
  }
};

const toNumber = (value: any, fallback: number): number => {
  if (value === undefined || value === null) return fallback;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const scoreBid = (bid: any): number => {
  const price = toNumber(bid.price, 999);
  const latency = toNumber(bid.latencyMs, 999);
  const reliability = toNumber(bid.reliability, 0);
  return reliability * 100 - price * 10 - latency * 0.05;
};

const shouldPayPrompt = (label: string, instructions: any, context: any) => {
  return `You are an economic decision agent. Return ONLY valid JSON.
{
  "shouldPay": true,
  "reason": "short rationale",
  "maxPrice": "0.05"
}
Context: ${label}
Instructions: ${JSON.stringify(instructions)}
Task: ${JSON.stringify(context)}.`;
};

router.post(
  '/agents/conversion/:agentId/bid',
  x402.wrapEndpoint({
    price: '0.01',
    asset: 'XLM',
    description: 'Conversion agent bid',
    handler: async (req) => {
      const { amount, from, to } = req.body || {};
      const agentId = req.params.agentId;
      const prompt = `You are a conversion agent bidder on Stellar. Return ONLY valid JSON.
{
  "price": "0.05",
  "latencyMs": 180,
  "reliability": 0.86,
  "notes": "short rationale"
}
Task: convert ${amount} ${from} to ${to}.
Agent id: ${agentId}.`;
      const bid = await runLlm(prompt, {
        price: '0.05',
        latencyMs: 180,
        reliability: 0.85,
        notes: 'default bid',
      });
      return {
        success: true,
        agentId,
        bid,
      };
    },
  })
);

router.post(
  '/agents/audit/:agentId/score',
  x402.wrapEndpoint({
    price: '0.01',
    asset: 'XLM',
    description: 'Audit agent score',
    handler: async (req) => {
      const { targetAgent, bid } = req.body || {};
      const agentId = req.params.agentId;
      const prompt = `You are an audit agent. Return ONLY valid JSON.
{
  "trustScore": 0.8,
  "uptime": 0.97,
  "latencyMs": 160,
  "reliability": 0.84,
  "notes": "short rationale"
}
Target agent: ${targetAgent}. Bid: ${JSON.stringify(bid)}.`;
      const audit = await runLlm(prompt, {
        trustScore: 0.75,
        uptime: 0.95,
        latencyMs: 160,
        reliability: 0.8,
        notes: 'default audit',
      });
      return {
        success: true,
        agentId,
        audit,
      };
    },
  })
);

router.post(
  '/agents/risk/:agentId/analyze',
  x402.wrapEndpoint({
    price: '0.01',
    asset: 'XLM',
    description: 'Risk agent analysis',
    handler: async (req) => {
      const { amount, from, to } = req.body || {};
      const agentId = req.params.agentId;
      const prompt = `You are a risk agent for FX conversion. Return ONLY valid JSON.
{
  "riskLevel": "low|medium|high",
  "volatility": "0.02",
  "recommendation": "short guidance"
}
Task: convert ${amount} ${from} to ${to}.`;
      const risk = await runLlm(prompt, {
        riskLevel: 'medium',
        volatility: '0.03',
        recommendation: 'default risk signal',
      });
      return {
        success: true,
        agentId,
        risk,
      };
    },
  })
);

router.post(
  '/agents/route/:agentId/plan',
  x402.wrapEndpoint({
    price: '0.01',
    asset: 'XLM',
    description: 'Route agent plan',
    handler: async (req) => {
      const { amount, from, to } = req.body || {};
      const agentId = req.params.agentId;
      const prompt = `You are a routing agent. Return ONLY valid JSON.
{
  "steps": ["BRL->USDC via anchor"],
  "expectedRate": "0.198",
  "estimatedFees": "0.003",
  "notes": "short rationale"
}
Task: convert ${amount} ${from} to ${to}.`;
      const route = await runLlm(prompt, {
        steps: ['BRL->USDC via anchor'],
        expectedRate: '0.198',
        estimatedFees: '0.003',
        notes: 'default route',
      });
      return {
        success: true,
        agentId,
        route,
      };
    },
  })
);

router.post(
  '/agents/execute/:agentId/execute',
  x402.wrapEndpoint({
    price: '0.02',
    asset: 'XLM',
    description: 'Execution agent',
    handler: async (req) => {
      const { amount, from, to, route } = req.body || {};
      const agentId = req.params.agentId;
      const prompt = `You are an execution agent. Return ONLY valid JSON.
{
  "status": "executed",
  "txPreview": "stellar://tx/placeholder",
  "result": "short confirmation",
  "settled": true
}
Task: convert ${amount} ${from} to ${to}. Route: ${JSON.stringify(route)}.`;
      const execution = await runLlm(prompt, {
        status: 'executed',
        txPreview: 'stellar://tx/placeholder',
        result: 'default execution',
        settled: true,
      });
      return {
        success: true,
        agentId,
        execution,
      };
    },
  })
);

router.post('/execute', async (req, res) => {
  try {
    const { amount, from, to } = req.body || {};
    if (!amount || !from || !to) {
      return res.status(400).json({
        success: false,
        error: 'amount, from, and to are required',
      });
    }

    const payerPublicKey = process.env.FORGE_PAYER_PUBLIC_KEY || '';
    const payerSecretKey = process.env.FORGE_PAYER_SECRET_KEY || '';
    if (!payerPublicKey || !payerSecretKey) {
      return res.status(500).json({
        success: false,
        error: 'Forge payer keys not configured',
      });
    }

    const baseURL = process.env.FORGE_BASE_URL || `http://localhost:${process.env.PORT || 8000}`;
    const client = new X402Client({
      baseURL,
      publicKey: payerPublicKey,
      secretKey: payerSecretKey,
      network: (process.env.X402_NETWORK || 'stellar:testnet') as any,
    });

    const conversionAgents = ['alpha', 'beta', 'gamma'];
    const bidResults = await Promise.all(
      conversionAgents.map(async (agentId) => {
        const instructionResult = await client.requestPaymentInstructions({
          method: 'post',
          path: `/api/forge/agents/conversion/${agentId}/bid`,
          data: { amount, from, to },
        });

        if (!instructionResult) {
          throw new Error('Expected payment instructions');
        }

        const decision = await runLlm(
          shouldPayPrompt(`conversion/${agentId}`, instructionResult.instructions, { amount, from, to }),
          { shouldPay: true, reason: 'default pay', maxPrice: '0.05' }
        );

        if (!decision.shouldPay) {
          throw new Error(`Payment rejected by decision engine: ${decision.reason}`);
        }

        const result = await client.payWithInstructions(
          {
            method: 'post',
            path: `/api/forge/agents/conversion/${agentId}/bid`,
            data: { amount, from, to },
          },
          instructionResult.instructions
        );

        return {
          agentId,
          bid: result.data?.bid || result.data,
          payment: result.paymentResponse,
          decision,
        };
      })
    );

    const scoredBids = bidResults.map((bid) => ({
      ...bid,
      score: scoreBid(bid.bid || {}),
    }));
    const sortedBids = [...scoredBids].sort((a, b) => b.score - a.score);
    const topBids = sortedBids.slice(0, 2);

    const auditAgents = ['audit-1', 'audit-2'];
    const auditResults = await Promise.all(
      topBids.map(async (bid, index) => {
        const auditAgent = auditAgents[index % auditAgents.length];
        const instructionResult = await client.requestPaymentInstructions({
          method: 'post',
          path: `/api/forge/agents/audit/${auditAgent}/score`,
          data: { targetAgent: bid.agentId, bid: bid.bid },
        });

        if (!instructionResult) {
          throw new Error('Expected payment instructions');
        }

        const decision = await runLlm(
          shouldPayPrompt(`audit/${auditAgent}`, instructionResult.instructions, { targetAgent: bid.agentId, bid: bid.bid }),
          { shouldPay: true, reason: 'default pay', maxPrice: '0.05' }
        );

        if (!decision.shouldPay) {
          throw new Error(`Payment rejected by decision engine: ${decision.reason}`);
        }

        const result = await client.payWithInstructions(
          {
            method: 'post',
            path: `/api/forge/agents/audit/${auditAgent}/score`,
            data: { targetAgent: bid.agentId, bid: bid.bid },
          },
          instructionResult.instructions
        );

        return {
          agentId: auditAgent,
          targetAgent: bid.agentId,
          audit: result.data?.audit || result.data,
          payment: result.paymentResponse,
          decision,
        };
      })
    );

    const combined = topBids.map((bid) => {
      const audit = auditResults.find((item) => item.targetAgent === bid.agentId);
      const trustScore = toNumber(audit?.audit?.trustScore, 0);
      const combinedScore = bid.score + trustScore * 50;
      return {
        ...bid,
        audit,
        combinedScore,
      };
    });

    const selected = combined.sort((a, b) => b.combinedScore - a.combinedScore)[0];
    if (!selected) {
      return res.status(500).json({
        success: false,
        error: 'No bids available',
      });
    }

    const riskInstructions = await client.requestPaymentInstructions({
      method: 'post',
      path: `/api/forge/agents/risk/risk-1/analyze`,
      data: { amount, from, to },
    });
    if (!riskInstructions) {
      throw new Error('Expected payment instructions');
    }
    const riskDecision = await runLlm(
      shouldPayPrompt('risk/risk-1', riskInstructions.instructions, { amount, from, to }),
      { shouldPay: true, reason: 'default pay', maxPrice: '0.05' }
    );
    if (!riskDecision.shouldPay) {
      throw new Error(`Payment rejected by decision engine: ${riskDecision.reason}`);
    }
    const riskResult = await client.payWithInstructions(
      {
        method: 'post',
        path: `/api/forge/agents/risk/risk-1/analyze`,
        data: { amount, from, to },
      },
      riskInstructions.instructions
    );

    const routeInstructions = await client.requestPaymentInstructions({
      method: 'post',
      path: `/api/forge/agents/route/route-1/plan`,
      data: { amount, from, to },
    });
    if (!routeInstructions) {
      throw new Error('Expected payment instructions');
    }
    const routeDecision = await runLlm(
      shouldPayPrompt('route/route-1', routeInstructions.instructions, { amount, from, to }),
      { shouldPay: true, reason: 'default pay', maxPrice: '0.05' }
    );
    if (!routeDecision.shouldPay) {
      throw new Error(`Payment rejected by decision engine: ${routeDecision.reason}`);
    }
    const routeResult = await client.payWithInstructions(
      {
        method: 'post',
        path: `/api/forge/agents/route/route-1/plan`,
        data: { amount, from, to },
      },
      routeInstructions.instructions
    );

    const executeInstructions = await client.requestPaymentInstructions({
      method: 'post',
      path: `/api/forge/agents/execute/${selected.agentId}/execute`,
      data: { amount, from, to, route: routeResult.data?.route || routeResult.data },
    });
    if (!executeInstructions) {
      throw new Error('Expected payment instructions');
    }
    const executeDecision = await runLlm(
      shouldPayPrompt(`execute/${selected.agentId}`, executeInstructions.instructions, { amount, from, to }),
      { shouldPay: true, reason: 'default pay', maxPrice: '0.05' }
    );
    if (!executeDecision.shouldPay) {
      throw new Error(`Payment rejected by decision engine: ${executeDecision.reason}`);
    }
    const executeResult = await client.payWithInstructions(
      {
        method: 'post',
        path: `/api/forge/agents/execute/${selected.agentId}/execute`,
        data: { amount, from, to, route: routeResult.data?.route || routeResult.data },
      },
      executeInstructions.instructions
    );

    return res.json({
      success: true,
      request: { amount, from, to },
      bids: scoredBids,
      audits: auditResults,
      decision: {
        selectedAgent: selected.agentId,
        score: selected.combinedScore,
        bid: selected.bid,
        audit: selected.audit,
      },
      graph: {
        risk: {
          data: riskResult.data?.risk || riskResult.data,
          payment: riskResult.paymentResponse,
          decision: riskDecision,
        },
        route: {
          data: routeResult.data?.route || routeResult.data,
          payment: routeResult.paymentResponse,
          decision: routeDecision,
        },
      },
      execution: {
        data: executeResult.data?.execution || executeResult.data,
        payment: executeResult.paymentResponse,
        decision: executeDecision,
      },
    });
  } catch (error: any) {
    logger.error(`[forge] ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
