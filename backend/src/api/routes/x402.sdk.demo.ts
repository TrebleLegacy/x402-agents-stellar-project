import { Router } from 'express';
import { createX402ServerFromEnv } from '../../sdk/x402/server';

const router = Router();
const x402 = createX402ServerFromEnv();

router.post(
  '/demo/echo',
  x402.wrapEndpoint({
    price: '0.01',
    asset: 'XLM',
    description: 'SDK demo endpoint',
    handler: async (req) => {
      return {
        success: true,
        echo: req.body,
        timestamp: Date.now(),
      };
    },
  })
);

export default router;
