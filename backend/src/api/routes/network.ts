import { Router } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { createX402ServerFromEnv } from '../../sdk/x402/server';
import { logger } from '../../utils/logger';

const router = Router();
const x402 = createX402ServerFromEnv();

const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: process.env.NETWORK_MODEL || 'gpt-4o',
  temperature: 0.2,
});

type ApiTool = {
  id: string;
  name: string;
  category: string;
  description: string;
  endpoint: string;
  pricing: string;
  auth: string;
  callable: boolean;
  price: string;
  x402Path: string;
  params?: Record<string, string>;
  tags?: string[];
  examples?: string[];
};

type ToolPlan = {
  reasoning: string;
  selectedTools: Array<{ id: string; params: Record<string, any>; reason: string }>;
  skippedTools?: Array<{ id: string; reason: string }>;
};

type PreprocessResult = {
  normalizedQuery?: string;
  intent?: string;
  clarifyingQuestion?: string;
};

const apiTools: ApiTool[] = [
  {
    id: 'openai_chat',
    name: 'OpenAI Chat',
    category: 'AI',
    description: 'LLM completions for short tasks and summaries.',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    pricing: 'x402: 0.02 XLM',
    auth: 'x402',
    callable: true,
    price: '0.02',
    x402Path: '/api/network/tools/openai_chat',
    params: { prompt: 'string' },
    tags: ['llm', 'summaries'],
    examples: ['Summarize a report'],
  },
  {
    id: 'stripe_balance',
    name: 'Stripe Balance',
    category: 'Payments',
    description: 'Fetch Stripe account balance snapshot.',
    endpoint: 'https://api.stripe.com/v1/balance',
    pricing: 'x402: 0.02 XLM',
    auth: 'x402',
    callable: true,
    price: '0.02',
    x402Path: '/api/network/tools/stripe_balance',
    params: {},
    tags: ['payments', 'billing'],
    examples: ['Check available balances'],
  },
  {
    id: 'twilio_account',
    name: 'Twilio Account',
    category: 'Comms',
    description: 'Fetch Twilio account details.',
    endpoint: 'https://api.twilio.com/2010-04-01/Accounts/{sid}.json',
    pricing: 'x402: 0.02 XLM',
    auth: 'x402',
    callable: true,
    price: '0.02',
    x402Path: '/api/network/tools/twilio_account',
    params: {},
    tags: ['sms', 'voice'],
    examples: ['Get Twilio account status'],
  },
  {
    id: 'github_repo',
    name: 'GitHub Repo Insight',
    category: 'Dev',
    description: 'Fetch repository metadata and activity signals.',
    endpoint: 'https://api.github.com/repos/{owner}/{repo}',
    pricing: 'x402: 0.004 XLM',
    auth: 'x402',
    callable: true,
    price: '0.004',
    x402Path: '/api/network/tools/github_repo',
    params: { owner: 'string', repo: 'string' },
    tags: ['code', 'open-source'],
    examples: ['Get repo stats for vercel/next.js'],
  },
  {
    id: 'github_search',
    name: 'GitHub Search',
    category: 'Dev',
    description: 'Search repositories by keyword.',
    endpoint: 'https://api.github.com/search/repositories?q={query}',
    pricing: 'x402: 0.004 XLM',
    auth: 'x402',
    callable: true,
    price: '0.004',
    x402Path: '/api/network/tools/github_search',
    params: { query: 'string' },
    tags: ['code', 'search'],
    examples: ['Search repos about agent payments'],
  },
  {
    id: 'open_meteo',
    name: 'Open-Meteo Weather',
    category: 'Data',
    description: 'Current weather from a city name.',
    endpoint: 'https://api.open-meteo.com',
    pricing: 'x402: 0.003 XLM',
    auth: 'x402',
    callable: true,
    price: '0.003',
    x402Path: '/api/network/tools/open_meteo',
    params: { city: 'string' },
    tags: ['weather', 'forecast'],
    examples: ['Weather in Lisbon'],
  },
  {
    id: 'coingecko_price',
    name: 'CoinGecko Price',
    category: 'Market',
    description: 'Crypto spot prices by coin id.',
    endpoint: 'https://api.coingecko.com/api/v3/simple/price',
    pricing: 'x402: 0.003 XLM',
    auth: 'x402',
    callable: true,
    price: '0.003',
    x402Path: '/api/network/tools/coingecko_price',
    params: { coinId: 'string', vsCurrency: 'string' },
    tags: ['crypto', 'prices'],
    examples: ['BTC price in USD'],
  },
  {
    id: 'hn_search',
    name: 'Hacker News Search',
    category: 'News',
    description: 'Latest stories from Hacker News by topic.',
    endpoint: 'https://hn.algolia.com/api/v1/search?query={query}',
    pricing: 'x402: 0.003 XLM',
    auth: 'x402',
    callable: true,
    price: '0.003',
    x402Path: '/api/network/tools/hn_search',
    params: { query: 'string' },
    tags: ['news', 'tech'],
    examples: ['Recent stories about AI agents'],
  },
  {
    id: 'exchange_rate',
    name: 'Exchange Rates',
    category: 'Market',
    description: 'FX rates between currencies.',
    endpoint: 'https://api.exchangerate.host/latest',
    pricing: 'x402: 0.003 XLM',
    auth: 'x402',
    callable: true,
    price: '0.003',
    x402Path: '/api/network/tools/exchange_rate',
    params: { base: 'string', symbols: 'string' },
    tags: ['fx', 'rates'],
    examples: ['USD to BRL rate'],
  },
];

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

const runLlmJson = async (label: string, prompt: string): Promise<any> => {
  const response = await llm.invoke(prompt);
  const responseMeta = response?.response_metadata || response?.additional_kwargs?.response_metadata;
  const messageId = response?.id || responseMeta?.id || responseMeta?.request_id || responseMeta?.x_request_id;
  const model = responseMeta?.model || responseMeta?.model_name;
  logger.info(`[network] llm ${label} id=${messageId || 'unknown'} model=${model || 'unknown'}`);
  const content = toStringContent(response.content);
  return parseJson(content);
};

const buildPreprocessPrompt = (query: string): string => {
  return `You are a query preprocessing agent. Return ONLY valid JSON.
{
  "normalizedQuery": "short normalized query",
  "intent": "short intent label",
  "clarifyingQuestion": "short question if the request is vague"
}
User query: ${query}
Rules: If the query is clear, clarifyingQuestion should be empty. Keep normalizedQuery concise.`;
};

const buildPlanPrompt = (query: string, tools: ApiTool[], preprocess?: PreprocessResult): string => {
  return `You are a tool routing agent. Return ONLY valid JSON.
{
  "reasoning": "short reasoning",
  "selectedTools": [
    { "id": "tool_id", "params": { }, "reason": "short rationale" }
  ],
  "skippedTools": [
    { "id": "tool_id", "reason": "not needed" }
  ]
}
User query: ${query}
Preprocess: ${JSON.stringify(preprocess || {})}
Tools: ${JSON.stringify(tools.map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    params: tool.params,
    examples: tool.examples,
  })))}
Rules: select at most 2 tools, only from the list. If the query is vague, select openai_chat with a prompt that asks for clarification.`;
};

const callOpenAi = async (params: any) => {
  const prompt = params?.prompt || params?.query || params?.input;
  if (!prompt) throw new Error('prompt is required');
  return {
    response: `mocked-openai-response: ${String(prompt).slice(0, 120)}`,
    tokensEstimated: Math.min(250, String(prompt).length * 2),
  };
};

const callStripeBalance = async () => {
  return {
    object: 'balance',
    available: [{ amount: 523400, currency: 'usd' }],
    pending: [{ amount: 12800, currency: 'usd' }],
    livemode: false,
  };
};

const callTwilioAccount = async () => {
  return {
    sid: 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    status: 'active',
    type: 'full',
    name: 'Mocked Twilio Account',
  };
};

const getGithubRepo = async (params: any) => {
  const owner = params?.owner;
  const repo = params?.repo;
  if (!owner || !repo) {
    throw new Error('owner and repo are required');
  }
  return {
    full_name: `${owner}/${repo}`,
    description: 'Mocked GitHub repository description',
    stars: 4821,
    forks: 312,
    open_issues: 18,
    language: 'TypeScript',
    url: `https://github.com/${owner}/${repo}`,
    updated_at: new Date().toISOString(),
  };
};

const searchGithub = async (params: any) => {
  const query = params?.query;
  if (!query) throw new Error('query is required');
  return [
    {
      full_name: `mock/${String(query).replace(/\s+/g, '-')}-agent`,
      description: 'Mocked repo result for agent tooling',
      stars: 1842,
      url: 'https://github.com/mock/agent-tool',
    },
    {
      full_name: 'mock/stellar-x402',
      description: 'Mocked repo for stellar payments',
      stars: 921,
      url: 'https://github.com/mock/stellar-x402',
    },
  ];
};

const getWeather = async (params: any) => {
  const city = params?.city || params?.location;
  if (!city) throw new Error('city is required');
  return {
    location: {
      name: String(city),
      country: 'Mockland',
      latitude: 38.72,
      longitude: -9.13,
    },
    current: {
      temperature_2m: 21.4,
      weather_code: 2,
      wind_speed_10m: 6.1,
      time: new Date().toISOString(),
    },
  };
};

const getCryptoPrice = async (params: any) => {
  const coinId = params?.coinId || params?.coin;
  const vsCurrency = params?.vsCurrency || params?.currency || 'usd';
  if (!coinId) throw new Error('coinId is required');
  return {
    coinId,
    vsCurrency,
    price: 61234.56,
  };
};

const searchHn = async (params: any) => {
  const query = params?.query;
  if (!query) throw new Error('query is required');
  return [
    {
      title: `Mocked HN story about ${query}`,
      url: 'https://news.ycombinator.com/item?id=1',
      points: 256,
    },
    {
      title: 'Agentic payments in production',
      url: 'https://news.ycombinator.com/item?id=2',
      points: 198,
    },
  ];
};

const getExchangeRate = async (params: any) => {
  const base = params?.base || 'USD';
  const symbols = params?.symbols || 'EUR';
  return {
    base,
    rates: { [symbols]: 5.12 },
    date: new Date().toISOString().slice(0, 10),
  };
};

const executeTool = async (toolId: string, params: any) => {
  if (toolId === 'openai_chat') return callOpenAi(params);
  if (toolId === 'stripe_balance') return callStripeBalance();
  if (toolId === 'twilio_account') return callTwilioAccount();
  if (toolId === 'github_repo') return getGithubRepo(params);
  if (toolId === 'github_search') return searchGithub(params);
  if (toolId === 'open_meteo') return getWeather(params);
  if (toolId === 'coingecko_price') return getCryptoPrice(params);
  if (toolId === 'hn_search') return searchHn(params);
  if (toolId === 'exchange_rate') return getExchangeRate(params);
  throw new Error('Tool not supported');
};

router.get('/registry', (_req, res) => {
  res.json({
    success: true,
    tools: apiTools,
  });
});

router.post('/plan', async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'query is required',
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OPENAI_API_KEY not configured',
      });
    }

    const callableTools = apiTools.filter((tool) => tool.callable);
    const preprocess = (await runLlmJson(
      'preprocess',
      buildPreprocessPrompt(query)
    )) as PreprocessResult;
    const normalizedQuery = preprocess?.normalizedQuery?.trim() || query;
    const prompt = buildPlanPrompt(normalizedQuery, callableTools, preprocess);
    const plan = (await runLlmJson('plan', prompt)) as ToolPlan;

    let selectedTools = Array.isArray(plan?.selectedTools)
      ? plan.selectedTools.slice(0, 2)
      : [];

    if (selectedTools.length === 0) {
      const fallbackTool = callableTools.find((tool) => tool.id === 'openai_chat');
      if (fallbackTool) {
        const fallbackPrompt = preprocess?.clarifyingQuestion?.trim()
          ? `Ask the user: ${preprocess.clarifyingQuestion}`
          : `Ask one clarifying question about: ${normalizedQuery}`;
        selectedTools = [
          {
            id: fallbackTool.id,
            params: { prompt: fallbackPrompt },
            reason: 'Fallback for vague request',
          },
        ];
      }
    }

    return res.json({
      success: true,
      query,
      analysis: preprocess,
      plan: {
        reasoning: plan?.reasoning || '',
        selectedTools,
        skippedTools: plan?.skippedTools || [],
      },
    });
  } catch (error: any) {
    logger.error(`[network] ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

apiTools.forEach((tool) => {
  router.post(
    `/tools/${tool.id}`,
    x402.wrapEndpoint({
      price: tool.price,
      asset: 'XLM',
      description: tool.description,
      handler: async (req) => {
        if (!tool.callable) {
          throw new Error('Tool unavailable');
        }
        const params = req.body?.params || {};
        const data = await executeTool(tool.id, params);
        return {
          success: true,
          tool: { id: tool.id, name: tool.name },
          data,
        };
      },
    })
  );
});

export default router;
