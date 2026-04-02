/**
 * Main server entry point
 * Mount all routers and initialize Express app
 */

require('dotenv').config();

import express from 'express';
import paymentsRouter from './api/routes/payments';
import onboardRouter from './api/routes/onboard';
import actionsRouter from './api/routes/actions.router';
import x402TestRouter from './api/routes/x402.test';
import stellarTestRouter from './api/routes/stellar.test';
import { createAgentRoutes } from './agents/routes';
import { AgentRepository } from './agents/repository';
import { logger } from './utils/logger';

const app = express();
const port = Number(process.env.PORT) || 8000;
const openaiApiKey = process.env.OPENAI_API_KEY || '';

// Middleware
app.use(express.json());

// Logging middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (_req, res) => {
  res.json({
    message: 'x402 Agentic Payments API',
    endpoints: {
      payments: '/api/payments',
      onboarding: '/api/onboard',
      agent: '/api/agent',
      legacy: '/api/actions',
    },
    testing: {
      x402Testnet: '/api/x402/test/payment - Test x402 integration',
      stellarTestnet: '/api/stellar/test/generate-keypair - Generate test keypair',
      documentation: 'See /api/x402/test/config for setup instructions',
    },
  });
});

// Routes
app.use('/api/payments', paymentsRouter);
app.use('/api/onboard', onboardRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/x402', x402TestRouter);
app.use('/api/stellar', stellarTestRouter);

// Agent routes
const agentRepository = new AgentRepository();
app.use('/api/agent', createAgentRoutes(agentRepository, openaiApiKey));

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});