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

const toStringContent = (content: any): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
      .join('');
  }
  if (content === undefined || content === null) return '';
  return JSON.stringify(content);
};

const parseJson = (content: string): any => {
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Empty JSON response');
  try {
    return JSON.parse(trimmed);
  } catch {}
  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    return JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
  }
  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    return JSON.parse(trimmed.slice(arrayStart, arrayEnd + 1));
  }
  throw new Error('Invalid JSON response');
};

const logLlmTrace = (label: string, response: any) => {
  const responseMeta = response?.response_metadata || response?.additional_kwargs?.response_metadata;
  const messageId = response?.id || responseMeta?.id || responseMeta?.request_id || responseMeta?.x_request_id;
  const model = responseMeta?.model || responseMeta?.model_name;
  logger.info(`[forge] llm ${label} id=${messageId || 'unknown'} model=${model || 'unknown'}`);
};

const runLlmJson = async (label: string, prompt: string): Promise<any> => {
  const response = await llm.invoke(prompt);
  logLlmTrace(label, response);
  const content = toStringContent(response.content);
  try {
    return parseJson(content);
  } catch (error) {
    const repairPrompt = `You are a JSON repair agent. Return ONLY valid JSON.\n${content}`;
    const repairResponse = await llm.invoke(repairPrompt);
    logLlmTrace(`${label}:repair`, repairResponse);
    const repairedContent = toStringContent(repairResponse.content);
    return parseJson(repairedContent);
  }
};

const toNumber = (value: any, fallback: number): number => {
  if (value === undefined || value === null) return fallback;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const getPriceAmount = (instructions: any): number | null => {
  if (!instructions) return null;
  const price = instructions.price;
  if (!price) return null;
  if (typeof price === 'string') {
    const normalized = price.replace('$', '').trim();
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof price === 'object' && price.amount) {
    const parsed = parseFloat(String(price.amount));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const evaluatePaymentDecision = (decision: any, instructions: any): { allowed: boolean; reason?: string; price?: number; maxPrice?: number } => {
  const shouldPay = decision?.shouldPay === true;
  const rawMaxPrice = typeof decision?.maxPrice === 'string'
    ? decision.maxPrice.replace('$', '').trim()
    : decision?.maxPrice;
  const maxPrice = toNumber(rawMaxPrice, NaN);
  const price = getPriceAmount(instructions);
  const normalizedPrice = price === null ? undefined : price;
  if (!shouldPay) {
    return { allowed: false, reason: decision?.reason, price: normalizedPrice, maxPrice };
  }
  if (Number.isFinite(maxPrice) && price !== null && price > maxPrice) {
    return { allowed: false, reason: 'price exceeds maxPrice', price: normalizedPrice, maxPrice };
  }
  return { allowed: true, reason: decision?.reason, price: normalizedPrice, maxPrice };
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

const rankBidsPrompt = (context: any, bids: any[]) => {
  return `You are a market ranking agent. Return ONLY valid JSON.
{
  "ranked": [
    { "agentId": "alpha", "score": 0.9, "reason": "short rationale" }
  ],
  "auditTargets": ["alpha", "beta"],
  "notes": "short rationale"
}
Task: ${JSON.stringify(context)}
Bids: ${JSON.stringify(bids)}
Rules: ranked must include all bid agentId values. auditTargets must contain 1 or 2 agentId values from bids.`;
};

const selectWinnerPrompt = (context: any, bids: any[], audits: any[]) => {
  return `You are a selection agent. Return ONLY valid JSON.
{
  "selectedAgent": "alpha",
  "finalRanking": [
    { "agentId": "alpha", "score": 0.92, "reason": "short rationale" }
  ],
  "notes": "short rationale"
}
Task: ${JSON.stringify(context)}
Bids: ${JSON.stringify(bids)}
Audits: ${JSON.stringify(audits)}
Rules: selectedAgent must be in bids. finalRanking must include all bid agentId values.`;
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
      const bid = await runLlmJson(`bid:${agentId}`, prompt);
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
      const audit = await runLlmJson(`audit:${agentId}`, prompt);
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
      const risk = await runLlmJson(`risk:${agentId}`, prompt);
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
      const route = await runLlmJson(`route:${agentId}`, prompt);
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
      const execution = await runLlmJson(`execute:${agentId}`, prompt);
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

        const decision = await runLlmJson(
          `decision:conversion:${agentId}`,
          shouldPayPrompt(`conversion/${agentId}`, instructionResult.instructions, { amount, from, to })
        );
        const decisionGate = evaluatePaymentDecision(decision, instructionResult.instructions);
        if (!decisionGate.allowed) {
          return {
            agentId,
            skipped: true,
            decision,
            reason: decisionGate.reason,
            instructions: instructionResult.instructions,
          };
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

    const paidBids = bidResults.filter((bid) => !bid.skipped && bid.bid);
    if (paidBids.length < 2) {
      throw new Error('Not enough bids after payment decisions');
    }

    const ranking = await runLlmJson(
      'rank-bids',
      rankBidsPrompt({ amount, from, to }, paidBids.map((bid) => ({
        agentId: bid.agentId,
        bid: bid.bid,
        decision: bid.decision,
      })))
    );

    const ranked = Array.isArray(ranking?.ranked) ? ranking.ranked : [];
    const rankedIds = ranked.map((item: any) => item?.agentId).filter(Boolean);
    const paidIds = paidBids.map((bid) => bid.agentId);
    const missingRanked = paidIds.filter((id) => !rankedIds.includes(id));
    if (missingRanked.length > 0) {
      throw new Error('Ranking missing bid agents');
    }

    const auditTargets = Array.isArray(ranking?.auditTargets)
      ? ranking.auditTargets.filter((id: string) => paidIds.includes(id))
      : [];
    if (auditTargets.length === 0) {
      throw new Error('Ranking missing auditTargets');
    }
    if (auditTargets.length > 2) {
      throw new Error('Ranking auditTargets exceeds limit');
    }

    const auditAgents = ['audit-1', 'audit-2'];
    const auditResults = await Promise.all(
      auditTargets.map(async (targetAgent: string, index: number) => {
        const auditAgent = auditAgents[index % auditAgents.length];
        const instructionResult = await client.requestPaymentInstructions({
          method: 'post',
          path: `/api/forge/agents/audit/${auditAgent}/score`,
          data: { targetAgent, bid: paidBids.find((bid) => bid.agentId === targetAgent)?.bid },
        });

        if (!instructionResult) {
          throw new Error('Expected payment instructions');
        }

        const decision = await runLlmJson(
          `decision:audit:${auditAgent}`,
          shouldPayPrompt(`audit/${auditAgent}`, instructionResult.instructions, { targetAgent })
        );
        const decisionGate = evaluatePaymentDecision(decision, instructionResult.instructions);
        if (!decisionGate.allowed) {
          return {
            agentId: auditAgent,
            targetAgent,
            skipped: true,
            decision,
            reason: decisionGate.reason,
            instructions: instructionResult.instructions,
          };
        }

        const result = await client.payWithInstructions(
          {
            method: 'post',
            path: `/api/forge/agents/audit/${auditAgent}/score`,
            data: { targetAgent, bid: paidBids.find((bid) => bid.agentId === targetAgent)?.bid },
          },
          instructionResult.instructions
        );

        return {
          agentId: auditAgent,
          targetAgent,
          audit: result.data?.audit || result.data,
          payment: result.paymentResponse,
          decision,
        };
      })
    );

    const completedAudits = auditResults.filter((audit) => !audit.skipped && audit.audit);
    if (completedAudits.length < 1) {
      throw new Error('No audits completed');
    }

    const selection = await runLlmJson(
      'select-winner',
      selectWinnerPrompt({ amount, from, to }, paidBids, auditResults)
    );
    const selectedAgentId = selection?.selectedAgent;
    const selected = paidBids.find((bid) => bid.agentId === selectedAgentId);
    if (!selected) {
      throw new Error('Selected agent not found in bids');
    }

    const riskInstructions = await client.requestPaymentInstructions({
      method: 'post',
      path: `/api/forge/agents/risk/risk-1/analyze`,
      data: { amount, from, to },
    });
    if (!riskInstructions) {
      throw new Error('Expected payment instructions');
    }
    const riskDecision = await runLlmJson(
      'decision:risk:risk-1',
      shouldPayPrompt('risk/risk-1', riskInstructions.instructions, { amount, from, to })
    );
    const riskGate = evaluatePaymentDecision(riskDecision, riskInstructions.instructions);
    let riskResult: any = null;
    let riskSkipped = false;
    if (!riskGate.allowed) {
      riskSkipped = true;
    } else {
      riskResult = await client.payWithInstructions(
        {
          method: 'post',
          path: `/api/forge/agents/risk/risk-1/analyze`,
          data: { amount, from, to },
        },
        riskInstructions.instructions
      );
    }

    const routeInstructions = await client.requestPaymentInstructions({
      method: 'post',
      path: `/api/forge/agents/route/route-1/plan`,
      data: { amount, from, to },
    });
    if (!routeInstructions) {
      throw new Error('Expected payment instructions');
    }
    const routeDecision = await runLlmJson(
      'decision:route:route-1',
      shouldPayPrompt('route/route-1', routeInstructions.instructions, { amount, from, to })
    );
    const routeGate = evaluatePaymentDecision(routeDecision, routeInstructions.instructions);
    let routeResult: any = null;
    let routeSkipped = false;
    if (!routeGate.allowed) {
      routeSkipped = true;
    } else {
      routeResult = await client.payWithInstructions(
        {
          method: 'post',
          path: `/api/forge/agents/route/route-1/plan`,
          data: { amount, from, to },
        },
        routeInstructions.instructions
      );
    }

    const routePayload = routeResult?.data?.route || routeResult?.data || null;

    const executeInstructions = await client.requestPaymentInstructions({
      method: 'post',
      path: `/api/forge/agents/execute/${selected.agentId}/execute`,
      data: { amount, from, to, route: routePayload },
    });
    if (!executeInstructions) {
      throw new Error('Expected payment instructions');
    }
    const executeDecision = await runLlmJson(
      `decision:execute:${selected.agentId}`,
      shouldPayPrompt(`execute/${selected.agentId}`, executeInstructions.instructions, { amount, from, to })
    );
    const executeGate = evaluatePaymentDecision(executeDecision, executeInstructions.instructions);
    if (!executeGate.allowed) {
      throw new Error(`Payment rejected by decision engine: ${executeGate.reason || 'payment denied'}`);
    }
    const executeResult = await client.payWithInstructions(
      {
        method: 'post',
        path: `/api/forge/agents/execute/${selected.agentId}/execute`,
        data: { amount, from, to, route: routePayload },
      },
      executeInstructions.instructions
    );

    return res.json({
      success: true,
      request: { amount, from, to },
      bids: bidResults,
      ranking,
      audits: auditResults,
      decision: {
        selectedAgent: selected.agentId,
        selection,
        bid: selected.bid,
        audit: auditResults.find((item) => item.targetAgent === selected.agentId),
      },
      graph: {
        risk: riskSkipped
          ? { skipped: true, decision: riskDecision }
          : {
              data: riskResult.data?.risk || riskResult.data,
              payment: riskResult.paymentResponse,
              decision: riskDecision,
            },
        route: routeSkipped
          ? { skipped: true, decision: routeDecision }
          : {
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
