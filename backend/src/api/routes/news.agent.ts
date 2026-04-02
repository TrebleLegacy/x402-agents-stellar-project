import { Router } from 'express';
import { logger } from '../utils/logger';
import { x402Service } from '../services/x402Service';
import { requirePayment } from '../api/middlewares/requirePayment';

const router = Router();

interface NewsQuery {
  category?: string;
  limit?: number;
}

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  timestamp: number;
  relevanceScore: number;
}

interface NewsResponse {
  success: boolean;
  data?: {
    category: string;
    articles: NewsArticle[];
    timestamp: number;
  };
  error?: string;
}

const MOCK_NEWS = {
  blockchain: [
    {
      id: '1',
      title: 'Stellar Network Achieves 1M TPS Milestone',
      description:
        'The Stellar network has successfully processed 1 million transactions per second',
      source: 'CryptoNews Daily',
      relevanceScore: 0.95,
    },
    {
      id: '2',
      title: 'Major DeFi Protocol Launches on Stellar',
      description:
        'Leading DeFi protocol announces integration with Stellar blockchain',
      source: 'DeFi Times',
      relevanceScore: 0.88,
    },
    {
      id: '3',
      title: 'Stellar Foundation Grants $5M for Development',
      description: 'New grants program to support Stellar ecosystem development',
      source: 'Stellar Blog',
      relevanceScore: 0.92,
    },
  ],
  defi: [
    {
      id: '4',
      title: 'DeFi TVL Reaches New All-Time High',
      description: 'Total Value Locked in DeFi protocols exceeds $100 billion',
      source: 'DeFi Pulse',
      relevanceScore: 0.90,
    },
    {
      id: '5',
      title: 'New Yield Farming Strategy Shows 50% APY',
      description: 'Innovative farming strategy deployed on multiple protocols',
      source: 'Yield Optimizers',
      relevanceScore: 0.82,
    },
    {
      id: '6',
      title: 'Security Audit Reveals Minor Vulnerabilities',
      description: 'Popular DeFi protocol undergoes successful security review',
      source: 'Security Audits Weekly',
      relevanceScore: 0.85,
    },
  ],
  payments: [
    {
      id: '7',
      title: 'X402 Standard Adoption Accelerates',
      description: 'More payment providers integrate X402 payment protocol',
      source: 'Payment Tech News',
      relevanceScore: 0.91,
    },
    {
      id: '8',
      title: 'Cross-Border Payments See 40% Reduction in Costs',
      description: 'Blockchain-based payments now cheaper than traditional methods',
      source: 'Financial Times',
      relevanceScore: 0.87,
    },
  ],
};

router.post(
  '/feed',
  requirePayment({
    requiredAmount: '0.03',
    asset: 'USDC',
    description: 'News Feed - Curated News & Articles',
  }),
  async (req, res) => {
    try {
      const { query, publicKey } = req.body as {
        query: NewsQuery;
        publicKey: string;
      };

      logger.info(
        `[NewsAgent] Processing news feed request for: ${query.category}`
      );

      const category = (query.category || 'blockchain') as keyof typeof MOCK_NEWS;
      const articles = MOCK_NEWS[category] || MOCK_NEWS.blockchain;
      const limit = query.limit || 5;

      const filteredArticles = articles
        .slice(0, limit)
        .map((article) => ({
          ...article,
          timestamp: Date.now(),
        }));

      const response: NewsResponse = {
        success: true,
        data: {
          category: query.category || 'blockchain',
          articles: filteredArticles,
          timestamp: Date.now(),
        },
      };

      logger.info(`[NewsAgent] Feed sent to: ${publicKey}`);
      res.json(response);
    } catch (error) {
      logger.error('[NewsAgent] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as NewsResponse);
    }
  }
);

export default router;
