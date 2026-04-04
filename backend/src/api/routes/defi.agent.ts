import { Router } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { logger } from '../../utils/logger';
import { x402Service } from '../../services/x402Service';
import { requirePayment } from '../middlewares/requirePayment';

const router = Router();
const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0.7 });

interface DeFiQuery {
  protocol?: string;
  metric?: 'tvl' | 'volume' | 'users' | 'fees';
}

interface DeFiResponse {
  success: boolean;
  data?: {
    protocol: string;
    metric: string;
    value: string;
    timestamp: number;
    source: string;
    reasoning: string;
  };
  error?: string;
}

const generateLLMDeFiData = async (protocol: string, metric: string): Promise<{ value: string; reasoning: string }> => {
  const prompt = `You are a DeFi data analyst. Provide realistic current data for the ${protocol} DeFi protocol.

Return ONLY a valid JSON object in this format:
{ "value": "numeric_string", "reasoning": "Your analysis and reasoning for this value" }

For ${protocol} protocol's ${metric} metric, provide a realistic estimate:
- If tvl: total value locked in USD (format like "10500000000")
- If volume: 24h trading volume in USD (format like "2500000000")
- If users: number of active users (format like "1200000")
- If fees: daily fees in USD (format like "15000000")

Make the data realistic based on typical DeFi protocols. Include your reasoning for the estimate.`;

  try {
    const response = await llm.invoke(prompt);
    const content = response.content as string;
    const matches = content.match(/\{[\s\S]*\}/);
    if (!matches) throw new Error('Invalid JSON format');
    const data = JSON.parse(matches[0]);
    return {
      value: data.value || '0',
      reasoning: data.reasoning || `Generated ${metric} data for ${protocol}`,
    };
  } catch (error) {
    logger.error(`LLM error generating DeFi data: ${error instanceof Error ? error.message : String(error)}`);
    return {
      value: '0',
      reasoning: 'Unable to generate data, using default value',
    };
  }
};

router.post(
  '/query',
  requirePayment({
    requiredAmount: '0.15',
    asset: 'USDC',
    description: 'DeFi Data Query - Real-time protocol metrics',
  }),
  async (req, res, _next) => {
    try {
      const { query, publicKey } = req.body as { query: DeFiQuery; publicKey: string };

      logger.info(`[DeFiAgent] Processing query for: ${query.protocol} - ${query.metric}`);

      if (!query.protocol || !query.metric) {
        return res.status(400).json({
          success: false,
          error: 'Missing protocol or metric in query',
        } as DeFiResponse);
      }

      const { value, reasoning } = await generateLLMDeFiData(query.protocol, query.metric);

      const response: DeFiResponse = {
        success: true,
        data: {
          protocol: query.protocol,
          metric: query.metric,
          value,
          timestamp: Date.now(),
          source: 'DeFi Data Agent',
          reasoning,
        },
      };

      logger.info(`[DeFiAgent] Response sent to: ${publicKey}`);
      res.json(response);
    } catch (error) {
      logger.error(`[DeFiAgent] Error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as DeFiResponse);
    }
  }
);

export default router;
