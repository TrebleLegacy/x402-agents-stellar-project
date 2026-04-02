import { Router } from 'express';
import { logger } from '../utils/logger';
import { x402Service } from '../services/x402Service';
import { requirePayment } from '../api/middlewares/requirePayment';

const router = Router();

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
  };
  error?: string;
}

const generateMockFindings = (scanType: string): SecurityFinding[] => {
  const findings: SecurityFinding[] = [];

  if (scanType === 'quick' || scanType === 'deep' || scanType === 'comprehensive') {
    findings.push({
      id: '1',
      severity: 'medium',
      title: 'Outdated Dependencies',
      description: 'Found 3 outdated npm packages with known vulnerabilities',
    });
  }

  if (scanType === 'deep' || scanType === 'comprehensive') {
    findings.push({
      id: '2',
      severity: 'high',
      title: 'Weak Encryption',
      description: 'Database connection uses legacy encryption standard',
    });
    findings.push({
      id: '3',
      severity: 'low',
      title: 'API Rate Limiting',
      description: 'API endpoints lack proper rate limiting configuration',
    });
  }

  if (scanType === 'comprehensive') {
    findings.push({
      id: '4',
      severity: 'critical',
      title: 'Exposed API Keys',
      description: 'Found 2 exposed API keys in git history',
    });
    findings.push({
      id: '5',
      severity: 'high',
      title: 'SQL Injection Risk',
      description: 'User input not properly sanitized in 1 endpoint',
    });
  }

  return findings;
};

router.post(
  '/scan',
  requirePayment({
    requiredAmount: '0.20',
    asset: 'USDC',
    description: 'Security Scan - Incident Detection & Analysis',
  }),
  async (req, res) => {
    try {
      const { query, publicKey } = req.body as {
        query: SecurityQuery;
        publicKey: string;
      };

      logger.info(
        `[SecurityAgent] Processing scan for: ${query.target} - ${query.scanType}`
      );

      if (!query.target || !query.scanType) {
        return res.status(400).json({
          success: false,
          error: 'Missing target or scanType in query',
        } as SecurityResponse);
      }

      const findings = generateMockFindings(query.scanType);
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
        },
      };

      logger.info(`[SecurityAgent] Scan complete for: ${publicKey}`);
      res.json(response);
    } catch (error) {
      logger.error('[SecurityAgent] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SecurityResponse);
    }
  }
);

export default router;
