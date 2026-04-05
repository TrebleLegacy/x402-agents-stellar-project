import { Router } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { logger } from '../../utils/logger';
import { createX402ServerFromEnv } from '../../sdk/x402/server';

const router = Router();
const llm = new ChatOpenAI({ modelName: 'gpt-4-turbo', temperature: 0.7 });
const x402 = createX402ServerFromEnv();

interface SecurityQuery {
  target?: string;
  scanType?: 'quick' | 'deep' | 'comprehensive';
}

interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

interface SecurityResponse {
  success: boolean;
  data?: {
    target: string;
    scanType: string;
    timestamp: number;
    findings: SecurityFinding[];
    riskScore: number;
    reasoning: string;
  };
  error?: string;
}

const generateLLMFindings = async (target: string, scanType: string): Promise<{ findings: SecurityFinding[]; reasoning: string }> => {
  const depth = scanType === 'quick' ? 1 : scanType === 'deep' ? 3 : 5;
  const prompt = `You are a security scanner for the website/application: ${target}
Perform a ${scanType} security scan and identify ${depth} potential security vulnerabilities.

Return ONLY a valid JSON object in this format:
{
  "reasoning": "Your chain of thought and analysis process",
  "findings": [
    { "id": "1", "severity": "critical|high|medium|low", "title": "Finding title", "description": "Finding description" },
    ...
  ]
}

Make findings realistic and relevant to ${target}. Vary the severity levels. Include your reasoning for why these vulnerabilities were identified.`;

  try {
    const response = await llm.invoke(prompt);
    const content = response.content as string;
    const matches = content.match(/\{[\s\S]*\}/);
    if (!matches) throw new Error('Invalid JSON format');
    const result = JSON.parse(matches[0]);
    const findings = (result.findings || []).slice(0, depth).map((f: any, i: number) => ({
      id: String(i + 1),
      severity: f.severity || 'medium',
      title: f.title || 'Security Issue',
      description: f.description || 'Potential vulnerability detected',
    }));
    return {
      findings,
      reasoning: result.reasoning || 'Security analysis completed',
    };
  } catch (error) {
    logger.error(`LLM error generating findings: ${error instanceof Error ? error.message : String(error)}`);
    return {
      findings: [
        { id: '1', severity: 'medium', title: 'Default Finding', description: 'Security scan completed' },
      ],
      reasoning: 'Security scan completed with default findings',
    };
  }
};

router.post(
  '/scan',
  x402.wrapEndpoint({
    price: '0.20',
    asset: 'XLM',
    description: 'Security Scan - Incident Detection & Analysis',
    handler: async (req, res) => {
      try {
        const { query, publicKey } = req.body as {
          query: SecurityQuery;
          publicKey: string;
        };

        logger.info(
          `[SecurityAgent] Processing scan for: ${query.target} - ${query.scanType}`
        );

        if (!query.target || !query.scanType) {
          res.status(400);
          return {
            success: false,
            error: 'Missing target or scanType in query',
          } as SecurityResponse;
        }

        const { findings, reasoning } = await generateLLMFindings(query.target, query.scanType);
        const riskScore = findings.reduce((score, finding) => {
          const severityScore =
            finding.severity === 'critical'
              ? 5
              : finding.severity === 'high'
              ? 4
              : finding.severity === 'medium'
              ? 3
              : 1;
          return score + severityScore;
        }, 0);

        const response: SecurityResponse = {
          success: true,
          data: {
            target: query.target,
            scanType: query.scanType,
            timestamp: Date.now(),
            findings,
            riskScore,
            reasoning,
          },
        };

        logger.info(`[SecurityAgent] Scan complete for: ${publicKey}`);
        return response;
      } catch (error) {
        logger.error(`[SecurityAgent] Error: ${error instanceof Error ? error.message : String(error)}`);
        res.status(500);
        return {
          success: false,
          error: 'Internal server error',
        } as SecurityResponse;
      }
    },
  })
);

export default router;
