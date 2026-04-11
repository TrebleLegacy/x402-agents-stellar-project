import { Router } from 'express';
import { logger } from '../../utils/logger';
import { executeNetworkTool } from './network';

const router = Router();

interface SecurityFinding {
  vulnerability: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  remediation?: string;
  references?: string[];
}

export const generateLLMFindings = async (target: string, scanType: string): Promise<{ findings: SecurityFinding[]; reasoning: string }> => {
  try {
    const data = await executeNetworkTool('security_agent', { target, scanType });
    const findings = Array.isArray(data?.findings) ? data.findings : [];
    return {
      findings: findings.slice(0, 3).map((finding: any) => ({
        vulnerability: finding.vulnerability || 'Issue',
        description: finding.description || '',
        severity: finding.severity || 'MEDIUM',
        remediation: finding.remediation || 'Review and remediate configuration.',
        references: finding.references,
      })),
      reasoning: data?.reasoning || 'Data unavailable',
    };
  } catch (error) {
    logger.error(`Security Agent err: ${error}`);
    return { findings: [], reasoning: 'Data unavailable' };
  }
};
export default router;
