import { Router } from 'express';
import { logger } from '../../utils/logger';
import { executeNetworkTool } from './network';

const router = Router();

interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  confidence: number;
  url?: string;
  publishedAt: string;
}

export const generateLLMArticles = async (category: string, limit: number): Promise<{ articles: NewsArticle[]; reasoning: string }> => {
  try {
    const data = await executeNetworkTool('news_agent', { category, limit });
    const articles = Array.isArray(data?.articles) ? data.articles : [];
    return {
      articles: articles.slice(0, limit).map((article: any) => ({
        title: article.title || 'News Article',
        summary: article.summary || article.description || '',
        source: article.source || 'News',
        confidence: Number.isFinite(Number(article.confidence)) ? Number(article.confidence) : 0,
        url: article.url,
        publishedAt: article.publishedAt || new Date().toISOString(),
      })),
      reasoning: data?.reasoning || 'Analyzed market intel.',
    };
  } catch (error) {
    logger.error(`News Agent Error: ${error}`);
    return { articles: [], reasoning: 'Data unavailable' };
  }
};
export default router;
