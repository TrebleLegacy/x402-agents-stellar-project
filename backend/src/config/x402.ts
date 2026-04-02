/**
 * x402 Configuration
 * Facilitator client setup for x402 protocol on Stellar
 */

import axios from 'axios';

const isProduction = process.env.NODE_ENV === 'production';
const facilitatorUrl = isProduction
  ? 'https://channels.openzeppelin.com/x402'
  : 'https://channels.openzeppelin.com/x402/testnet';

const apiKey = process.env.X402_API_KEY;

if (!apiKey) {
  console.warn('X402_API_KEY not set. x402 payments will not work.');
}

export const x402FacilitatorClient = {
  verify: async (payload: any) => {
    try {
      const response = await axios.post(`${facilitatorUrl}/verify`, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`x402 verification failed: ${error.message}`);
    }
  },
  
  settle: async (payload: any) => {
    try {
      const response = await axios.post(`${facilitatorUrl}/settle`, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`x402 settlement failed: ${error.message}`);
    }
  },
  
  supported: async () => {
    try {
      const response = await axios.get(`${facilitatorUrl}/supported`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`x402 supported query failed: ${error.message}`);
    }
  },
};

export const x402Config = {
  facilitatorUrl,
  network: isProduction ? 'stellar:pubnet' : 'stellar:testnet',
  scheme: 'exact-v2',
  apiKey,
};
