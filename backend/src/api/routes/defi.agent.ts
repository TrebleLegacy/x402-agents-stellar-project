import { Router } from 'express';
import { logger } from '../utils/logger';
import { x402Service } from '../services/x402Service';
import { requirePayment } from '../api/middlewares/requirePayment';

const router = Router();

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
  };
  error?: string;
}

const MOCK_DEFI_DATA = {
  aave: {
    tvl: '10500000000',
    volume: '2500000000',
    users: '1200000',
    fees: '15000000',
  },
  compound: {
    tvl: '3200000000',
    volume: '800000000',
    users: '450000',
    fees: '4500000',
  },
  uniswap: {
    tvl: '8900000000',
    volume: '125000000000',
    users: '5600000',
    fees: '890000000',
  },
};

router.post(
  '/query',
  requirePayment({
    requiredAmount: '0.15',
    asset: 'USDC',
    description: 'DeFi Data Query - Real-time protocol metrics',
  }),
  async (req, res) => {
    try {
      const { query, publicKey } = req.body as { query: DeFiQuery; publicKey: string };

      logger.info(`[DeFiAgent] Processing query for: ${query.protocol} - ${query.metric}`);

      if (!query.protocol || !query.metric) {
        return res.status(400).json({
          success: false,
          error: 'Missing protocol or metric in query',
        } as DeFiResponse);
      }

      const protocolData =
        MOCK_DEFI_DATA[query.protocol as keyof typeof MOCK_DEFI_DATA];

      if (!protocolData) {
        return res.status(400).json({
          success: false,
          error: `Protocol ${query.protocol} not found`,
        } as DeFiResponse);
      }

      const value =
        protocolData[query.metric as keyof typeof protocolData] || '0';

      const response: DeFiResponse = {
        success: true,
        data: {
          protocol: query.protocol,
          metric: query.metric,
          value,
          timestamp: Date.now(),
          source: 'DeFi Data Agent',
        },
      };

      logger.info(`[DeFiAgent] Response sent to: ${publicKey}`);
      res.json(response);
    } catch (error) {
      logger.error('[DeFiAgent] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as DeFiResponse);
    }
  }
);

export default router;
