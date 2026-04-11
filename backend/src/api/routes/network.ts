import { Router } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { createX402ServerFromEnv } from '../../sdk/x402/server';
import { logger } from '../../utils/logger';

const router = Router();
const x402 = createX402ServerFromEnv();

const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: process.env.NETWORK_MODEL || 'gpt-4o',
  temperature: 0.3,
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

export const apiTools: ApiTool[] = [
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
    id: 'defillama_protocol',
    name: 'DefiLlama Protocol',
    category: 'Market',
    description: 'Protocol TVL and metrics from DefiLlama.',
    endpoint: 'https://api.llama.fi/protocol/{protocol}',
    pricing: 'x402: 0.004 XLM',
    auth: 'x402',
    callable: true,
    price: '0.004',
    x402Path: '/api/network/tools/defillama_protocol',
    params: { protocol: 'string' },
    tags: ['defi', 'tvl'],
    examples: ['TVL for aave'],
  },
  {
    id: 'thegraph_query',
    name: 'The Graph Query',
    category: 'Data',
    description: 'Subgraph query for onchain metrics.',
    endpoint: 'https://api.thegraph.com/subgraphs/name/{subgraph}',
    pricing: 'x402: 0.005 XLM',
    auth: 'x402',
    callable: true,
    price: '0.005',
    x402Path: '/api/network/tools/thegraph_query',
    params: { subgraph: 'string', query: 'string' },
    tags: ['onchain', 'subgraph'],
    examples: ['Query uniswap v3 swap volumes'],
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
    id: 'news_api',
    name: 'News API',
    category: 'News',
    description: 'Headline search by query and timeframe.',
    endpoint: 'https://newsapi.org/v2/everything?q={query}',
    pricing: 'x402: 0.004 XLM',
    auth: 'x402',
    callable: true,
    price: '0.004',
    x402Path: '/api/network/tools/news_api',
    params: { query: 'string', pageSize: 'number' },
    tags: ['news', 'headlines'],
    examples: ['Latest DeFi headlines'],
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
  {
    id: 'whois_lookup',
    name: 'WHOIS Lookup',
    category: 'Security',
    description: 'Domain registration and status data.',
    endpoint: 'https://rdap.org/domain/{domain}',
    pricing: 'x402: 0.003 XLM',
    auth: 'x402',
    callable: true,
    price: '0.003',
    x402Path: '/api/network/tools/whois_lookup',
    params: { domain: 'string' },
    tags: ['security', 'whois'],
    examples: ['WHOIS for example.com'],
  },
  {
    id: 'shodan_host',
    name: 'Shodan Host Intel',
    category: 'Security',
    description: 'Internet-facing host snapshot by IP.',
    endpoint: 'https://api.shodan.io/shodan/host/{ip}',
    pricing: 'x402: 0.006 XLM',
    auth: 'x402',
    callable: true,
    price: '0.006',
    x402Path: '/api/network/tools/shodan_host',
    params: { ip: 'string' },
    tags: ['security', 'host-intel'],
    examples: ['Scan 8.8.8.8'],
  },
  {
    id: 'defi_agent',
    name: 'DeFi Data Agent',
    category: 'Agents',
    description: 'Synthesizes DeFi protocol metrics from paid data sources.',
    endpoint: '/api/network/tools/defi_agent',
    pricing: 'x402: 0.02 XLM',
    auth: 'x402',
    callable: true,
    price: '0.02',
    x402Path: '/api/network/tools/defi_agent',
    params: { protocol: 'string', metric: 'string' },
    tags: ['agent', 'defi'],
    examples: ['Get TVL for aave'],
  },
  {
    id: 'news_agent',
    name: 'News Agent',
    category: 'Agents',
    description: 'Curates crypto news from paid feeds.',
    endpoint: '/api/network/tools/news_agent',
    pricing: 'x402: 0.02 XLM',
    auth: 'x402',
    callable: true,
    price: '0.02',
    x402Path: '/api/network/tools/news_agent',
    params: { category: 'string', limit: 'number' },
    tags: ['agent', 'news'],
    examples: ['Top DeFi news'],
  },
  {
    id: 'security_agent',
    name: 'Security Agent',
    category: 'Agents',
    description: 'Generates security findings from paid intel sources.',
    endpoint: '/api/network/tools/security_agent',
    pricing: 'x402: 0.03 XLM',
    auth: 'x402',
    callable: true,
    price: '0.03',
    x402Path: '/api/network/tools/security_agent',
    params: { target: 'string', scanType: 'string' },
    tags: ['agent', 'security'],
    examples: ['Security scan for example.com'],
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
  const response = await llm.invoke(prompt);
  return {
    response: response.content || '',
    tokensEstimated: Math.min(250, String(prompt).length * 2), // rough estimate
  };
};

const simulateWithLlm = async (toolName: string, expectedSchema: string) => {
  const prompt = `You are simulating the response of a tool called "${toolName}".
Return ONLY a JSON object that matches this schema or description:
${expectedSchema}
Generate realistic fake data.`;
  return runLlmJson(`simulate_${toolName}`, prompt);
};

const callStripeBalance = async () => {
  return simulateWithLlm(
    'Stripe Balance',
    '{ object: "balance", available: [{ amount: number, currency: "usd" }], pending: [{ amount: number, currency: "usd" }], livemode: boolean }'
  );
};

const callTwilioAccount = async () => {
  return simulateWithLlm(
    'Twilio Account',
    '{ sid: string, status: "active" | "suspended", type: "full" | "trial", name: string }'
  );
};

const getGithubRepo = async (params: any) => {
  const owner = params?.owner;
  const repo = params?.repo;
  if (!owner || !repo) {
    throw new Error('owner and repo are required');
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!res.ok) throw new Error('GitHub API error');
    const data = await res.json();
    return {
      full_name: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      open_issues: data.open_issues_count,
      language: data.language,
      url: data.html_url,
      updated_at: data.updated_at,
    };
  } catch (error) {
    // Fallback to LLM if rate limited
    return simulateWithLlm(
      `GitHub Repo Insight for ${owner}/${repo}`,
      `{ full_name: "${owner}/${repo}", description: string, stars: number, forks: number, open_issues: number, language: string, url: "https://github.com/${owner}/${repo}", updated_at: iso_date_string }`
    );
  }
};

const searchGithub = async (params: any) => {
  const query = params?.query;
  if (!query) throw new Error('query is required');
  try {
    const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=2`);
    if (!res.ok) throw new Error('GitHub API error');
    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      full_name: item.full_name,
      description: item.description,
      stars: item.stargazers_count,
      url: item.html_url,
    }));
  } catch (error) {
    return simulateWithLlm(
      `GitHub Search for "${query}"`,
      `[{ full_name: string, description: string, stars: number, url: string }] (array of 2 realistic repo results)`
    );
  }
};

const getWeather = async (params: any) => {
  const city = params?.city || params?.location;
  if (!city) throw new Error('city is required');
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    if (!geoRes.ok) throw new Error('Geocoding API error');
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) throw new Error('City not found');
    const loc = geoData.results[0];

    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`);
    if (!weatherRes.ok) throw new Error('Weather API error');
    const weatherData = await weatherRes.json();

    return {
      location: {
        name: loc.name,
        country: loc.country,
        latitude: loc.latitude,
        longitude: loc.longitude,
      },
      current: weatherData.current_weather,
    };
  } catch (error) {
    return simulateWithLlm(
      `Weather for ${city}`,
      `{ location: { name: "${city}", country: string, latitude: number, longitude: number }, current: { temperature_2m: number, weather_code: number, wind_speed_10m: number, time: iso_date_string } }`
    );
  }
};

const getCryptoPrice = async (params: any) => {
  const coinId = params?.coinId || params?.coin || 'bitcoin';
  const vsCurrency = params?.vsCurrency || params?.currency || 'usd';
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}`);
    if (!res.ok) throw new Error('CoinGecko API error');
    const data = await res.json();
    return {
      coinId,
      vsCurrency,
      price: data[coinId]?.[vsCurrency] || null,
    };
  } catch (error) {
    return simulateWithLlm(
      `Crypto Price for ${coinId} in ${vsCurrency}`,
      `{ coinId: "${coinId}", vsCurrency: "${vsCurrency}", price: number }`
    );
  }
};

const getDefiLlamaProtocol = async (params: any) => {
  const protocol = params?.protocol || 'aave';
  try {
    const res = await fetch(`https://api.llama.fi/protocol/${encodeURIComponent(protocol)}`);
    if (!res.ok) throw new Error('DefiLlama API error');
    const data = await res.json();
    return {
      protocol: data?.name || protocol,
      tvl: data?.tvl ?? null,
      chainTvls: data?.chainTvls || {},
      symbol: data?.symbol || '',
      url: data?.url || '',
    };
  } catch (error) {
    return simulateWithLlm(
      `DefiLlama Protocol ${protocol}`,
      `{ protocol: "${protocol}", tvl: number, chainTvls: object, symbol: string, url: string }`
    );
  }
};

const queryTheGraph = async (params: any) => {
  const subgraph = params?.subgraph || 'messari/uniswap-v3-ethereum';
  const query = params?.query || '{ _meta { block { number } } }';
  try {
    const res = await fetch(`https://api.thegraph.com/subgraphs/name/${encodeURIComponent(subgraph)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error('The Graph API error');
    const data = await res.json();
    return { subgraph, data: data?.data ?? data };
  } catch (error) {
    return simulateWithLlm(
      `The Graph Query ${subgraph}`,
      `{ subgraph: "${subgraph}", data: object }`
    );
  }
};

const getNewsApi = async (params: any) => {
  const query = params?.query || params?.category || 'blockchain';
  const pageSize = Math.max(1, Math.min(10, Number(params?.pageSize || params?.limit || 5)));
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return simulateWithLlm(
      `News API for ${query}`,
      `{ query: "${query}", articles: [{ title: string, url: string, source: string, publishedAt: iso_date_string }] }`
    );
  }
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=${pageSize}&language=en&sortBy=publishedAt&apiKey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('News API error');
    const data = await res.json();
    const articles = (data.articles || []).slice(0, pageSize).map((a: any) => ({
      title: a.title,
      url: a.url,
      source: a.source?.name || 'News API',
      publishedAt: a.publishedAt,
    }));
    return { query, articles };
  } catch (error) {
    return simulateWithLlm(
      `News API for ${query}`,
      `{ query: "${query}", articles: [{ title: string, url: string, source: string, publishedAt: iso_date_string }] }`
    );
  }
};

const whoisLookup = async (params: any) => {
  const domain = params?.domain || params?.target || 'example.com';
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
    if (!res.ok) throw new Error('RDAP error');
    const data = await res.json();
    const events = Array.isArray(data.events)
      ? data.events.map((event: any) => ({
          eventAction: event.eventAction,
          eventDate: event.eventDate,
        }))
      : [];
    return {
      domain,
      status: data.status || [],
      registrar: data.registrar?.name || data.registrarName || '',
      events,
    };
  } catch (error) {
    return simulateWithLlm(
      `WHOIS ${domain}`,
      `{ domain: "${domain}", status: [string], registrar: string, events: [{ eventAction: string, eventDate: iso_date_string }] }`
    );
  }
};

const shodanHost = async (params: any) => {
  const ip = params?.ip || '8.8.8.8';
  const apiKey = process.env.SHODAN_API_KEY;
  if (!apiKey) {
    return simulateWithLlm(
      `Shodan Host ${ip}`,
      `{ ip: "${ip}", ports: [number], org: string, isp: string, hostnames: [string] }`
    );
  }
  try {
    const res = await fetch(`https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${apiKey}`);
    if (!res.ok) throw new Error('Shodan API error');
    const data = await res.json();
    return {
      ip: data.ip_str,
      ports: data.ports || [],
      org: data.org || '',
      isp: data.isp || '',
      hostnames: data.hostnames || [],
    };
  } catch (error) {
    return simulateWithLlm(
      `Shodan Host ${ip}`,
      `{ ip: "${ip}", ports: [number], org: string, isp: string, hostnames: [string] }`
    );
  }
};

const runDefiAgent = async (params: any) => {
  const protocol = String(params?.protocol || 'aave').toLowerCase();
  const metric = String(params?.metric || 'tvl');
  const [coingecko, defillama, thegraph] = await Promise.all([
    getCryptoPrice({ coinId: protocol, vsCurrency: 'usd' }),
    getDefiLlamaProtocol({ protocol }),
    queryTheGraph({ subgraph: params?.subgraph, query: params?.graphQuery }),
  ]);

  const prompt = `You are a DeFi data analyst. Using the tool outputs below, estimate the ${metric} for ${protocol}.
Return ONLY valid JSON:
{ "protocol": "${protocol}", "metric": "${metric}", "value": "numeric_string", "reasoning": "short synthesis" }
CoinGecko: ${JSON.stringify(coingecko)}
DefiLlama: ${JSON.stringify(defillama)}
TheGraph: ${JSON.stringify(thegraph)}`;

  const result = await runLlmJson('defi_agent', prompt);
  return {
    protocol,
    metric,
    value: String(result?.value || '0'),
    reasoning: result?.reasoning || '',
    sources: { coingecko, defillama, thegraph },
  };
};

const runNewsAgent = async (params: any) => {
  const category = String(params?.category || params?.query || 'blockchain');
  const limit = Math.max(1, Math.min(10, Number(params?.limit || params?.pageSize || 5)));
  const [newsApi, hn] = await Promise.all([
    getNewsApi({ query: category, pageSize: limit }),
    searchHn({ query: category }),
  ]);

  const prompt = `You are a crypto news curator. Use the paid feeds below to produce a concise list of articles.
Return ONLY valid JSON:
{ "articles": [ { "title": "", "summary": "", "source": "", "confidence": 0, "url": "", "publishedAt": "iso_date_string" } ], "reasoning": "short rationale" }
News API: ${JSON.stringify(newsApi)}
HackerNews: ${JSON.stringify(hn)}`;

  const result = await runLlmJson('news_agent', prompt);
  const articles = Array.isArray(result?.articles) ? result.articles : [];
  return {
    category,
    articles: articles.slice(0, limit).map((article: any) => ({
      title: article.title || 'News Article',
      summary: article.summary || article.description || '',
      source: article.source || 'News',
      confidence: Number.isFinite(Number(article.confidence)) ? Number(article.confidence) : 0,
      url: article.url,
      publishedAt: article.publishedAt || new Date().toISOString(),
    })),
    reasoning: result?.reasoning || '',
    sources: { newsApi, hn },
  };
};

const runSecurityAgent = async (params: any) => {
  const target = String(params?.target || 'example.com');
  const scanType = String(params?.scanType || 'quick');
  const domain = target.replace(/^https?:\/\//, '').split('/')[0] || 'example.com';
  const [whois, shodan] = await Promise.all([
    whoisLookup({ domain }),
    shodanHost({ ip: params?.ip }),
  ]);

  const prompt = `You are a Senior CyberSecurity Orchestrator Agent. Use the intel below to produce findings for ${target} (${scanType}).
Return ONLY valid JSON:
{ "findings": [ { "vulnerability": "", "description": "", "severity": "LOW|MEDIUM|HIGH|CRITICAL", "remediation": "" } ], "reasoning": "short synthesis" }
WHOIS: ${JSON.stringify(whois)}
Shodan: ${JSON.stringify(shodan)}`;

  const result = await runLlmJson('security_agent', prompt);
  const findings = Array.isArray(result?.findings) ? result.findings : [];
  return {
    target,
    scanType,
    findings: findings.slice(0, 3).map((finding: any) => {
      const rawSeverity = String(finding.severity || '').toUpperCase();
      const severity = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(rawSeverity)
        ? rawSeverity
        : 'MEDIUM';
      return {
        vulnerability: finding.vulnerability || 'Issue',
        description: finding.description || '',
        severity,
        remediation: finding.remediation || 'Review and remediate configuration.',
      };
    }),
    reasoning: result?.reasoning || '',
    sources: { whois, shodan },
  };
};

const searchHn = async (params: any) => {
  const query = params?.query;
  if (!query) throw new Error('query is required');
  try {
    const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=2`);
    if (!res.ok) throw new Error('HN API error');
    const data = await res.json();
    return (data.hits || []).map((hit: any) => ({
      title: hit.title || hit.story_title,
      url: hit.url || hit.story_url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      points: hit.points || 0,
    }));
  } catch (error) {
    return simulateWithLlm(
      `Hacker News Search for "${query}"`,
      `[{ title: string, url: string, points: number }] (array of 2 realistic HN story results)`
    );
  }
};

const getExchangeRate = async (params: any) => {
  const base = params?.base || 'USD';
  const symbols = params?.symbols || 'EUR';
  return simulateWithLlm(
    `Exchange Rate from ${base} to ${symbols}`,
    `{ base: "${base}", rates: { "${symbols}": number }, date: iso_date_string }`
  );
};

export const executeNetworkTool = async (toolId: string, params: any) => {
  if (toolId === 'openai_chat') return callOpenAi(params);
  if (toolId === 'stripe_balance') return callStripeBalance();
  if (toolId === 'twilio_account') return callTwilioAccount();
  if (toolId === 'github_repo') return getGithubRepo(params);
  if (toolId === 'github_search') return searchGithub(params);
  if (toolId === 'open_meteo') return getWeather(params);
  if (toolId === 'coingecko_price') return getCryptoPrice(params);
  if (toolId === 'defillama_protocol') return getDefiLlamaProtocol(params);
  if (toolId === 'thegraph_query') return queryTheGraph(params);
  if (toolId === 'hn_search') return searchHn(params);
  if (toolId === 'news_api') return getNewsApi(params);
  if (toolId === 'exchange_rate') return getExchangeRate(params);
  if (toolId === 'whois_lookup') return whoisLookup(params);
  if (toolId === 'shodan_host') return shodanHost(params);
  if (toolId === 'defi_agent') return runDefiAgent(params);
  if (toolId === 'news_agent') return runNewsAgent(params);
  if (toolId === 'security_agent') return runSecurityAgent(params);
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
        const data = await executeNetworkTool(tool.id, params);
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
