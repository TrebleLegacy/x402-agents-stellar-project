import { Router } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { logger } from '../../utils/logger';
import { createX402ServerFromEnv } from '../../sdk/x402/server';

const router = Router();
const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0.7 });
const x402 = createX402ServerFromEnv();

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
    reasoning: string;
  };
  error?: string;
}

const generateLLMArticles = async (category: string, limit: number): Promise<{ articles: NewsArticle[]; reasoning: string }> => {
  const prompt = `You are a crypto news curator. Generate ${limit} relevant news articles about ${category} in the crypto/blockchain space.

Return ONLY a valid JSON object in this format:
{
  "reasoning": "Your selection criteria and reasoning for these articles",
  "articles": [
    { "title": "Article headline", "description": "Article summary", "source": "News Source Name", "relevanceScore": 0.95 },
    ...
  ]
}

Make the articles realistic, current, and relevant to ${category}. Relevance scores should be between 0.8 and 1.0. Include your reasoning for why these articles are relevant.`;

  try {
    const response = await llm.invoke(prompt);
    const content = response.content as string;
    const matches = content.match(/\{[\s\S]*\}/);
    if (!matches) throw new Error('Invalid JSON format');
    const result = JSON.parse(matches[0]);
    const articles = (result.articles || []).slice(0, limit).map((article: any, i: number) => ({
      id: String(i + 1),
      title: article.title || 'News Article',
      description: article.description || 'Article summary unavailable',
      source: article.source || 'Crypto News',
      timestamp: Date.now(),
      relevanceScore: article.relevanceScore || 0.85,
    }));
    return {
      articles,
      reasoning: result.reasoning || `Generated ${limit} relevant articles for ${category}`,
    };
  } catch (error) {
    logger.error(`LLM error generating articles: ${error instanceof Error ? error.message : String(error)}`);
    return {
      articles: [
        {
          id: '1',
          title: `Latest ${category} News`,
          description: 'Stay updated with the latest developments',
          source: 'Crypto News Feed',
          timestamp: Date.now(),
          relevanceScore: 0.85,
        },
      ],
      reasoning: 'News feed generated with default articles',
    };
  }
};

router.post(
  '/feed',
  x402.wrapEndpoint({
    price: '0.03',
    asset: 'XLM',
    description: 'News Feed - Curated News & Articles',
    handler: async (req, res) => {
      try {
        const { query, publicKey } = req.body as {
          query: NewsQuery;
          publicKey: string;
        };

        logger.info(
          `[NewsAgent] Processing news feed request for: ${query.category}`
        );

        const category = query.category || 'blockchain';
        const limit = Math.min(query.limit || 5, 10);

        const { articles, reasoning } = await generateLLMArticles(category, limit);

        const response: NewsResponse = {
          success: true,
          data: {
            category: query.category || 'blockchain',
            articles,
            timestamp: Date.now(),
            reasoning,
          },
        };

        logger.info(`[NewsAgent] Feed sent to: ${publicKey}`);
        return response;
      } catch (error) {
        logger.error(`[NewsAgent] Error: ${error instanceof Error ? error.message : String(error)}`);
        res.status(500);
        return {
          success: false,
          error: 'Internal server error',
        } as NewsResponse;
      }
    },
  })
);

export default router;
