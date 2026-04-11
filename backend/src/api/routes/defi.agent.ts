import { Router } from 'express';
import { logger } from '../../utils/logger';
import { executeNetworkTool } from './network';

const router = Router();

interface DeFiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const generateLLMDeFiData = async (
  protocol: string,
  metric: string
): Promise<{ protocol: string; metric: string; value: string; reasoning: string }> => {
  try {
    const data = await executeNetworkTool('defi_agent', { protocol, metric });
    const value = data?.value !== undefined ? String(data.value) : '0';
    return {
      protocol: data?.protocol || protocol,
      metric: data?.metric || metric,
      value,
      reasoning: data?.reasoning || 'Data retrieved successfully.',
    };
  } catch (error) {
    logger.error(`DeFi err: ${error}`);
    return { protocol, metric, value: '0', reasoning: 'Data unavailable' };
  }
};
export default router;
