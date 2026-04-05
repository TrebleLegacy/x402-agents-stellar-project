import axios, { AxiosInstance } from 'axios';
import { Request, Response } from 'express';
import { Asset, Networks, TransactionBuilder } from '@stellar/stellar-sdk';

export type X402Network = 'stellar:testnet' | 'stellar:pubnet';
export type X402Asset = 'XLM' | { code: string; issuer?: string };

export interface X402ServerConfig {
  payTo: string;
  network?: X402Network;
  facilitatorUrl?: string;
  apiKey?: string;
  scheme?: string;
  strictFacilitator?: boolean;
  replayTtlMs?: number;
  maxReplayEntries?: number;
}

export interface WrapEndpointOptions<T = any> {
  price: string;
  asset?: X402Asset;
  memo?: string;
  description?: string;
  destination?: string;
  handler: (req: Request, res: Response) => Promise<T> | T;
}

interface PaymentInstructions {
  scheme: string;
  price: string;
  network: X402Network;
  payTo: string;
  asset?: string;
  assetIssuer?: string;
  memo?: string;
  facilitatorUrl?: string;
  description?: string;
}

interface SignatureData {
  transaction: string;
  signed: boolean;
  publicKey: string;
  timestamp?: string | number;
}

interface PaymentContext {
  transactionHash: string;
  payerPublicKey: string;
  amount: string;
  asset: X402Asset;
}

const replayCache = new Map<string, number>();

const toStroops = (amount: string): bigint | null => {
  if (!amount) return null;
  const normalized = amount.trim().replace('$', '');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const padded = (fraction + '0000000').slice(0, 7);
  return BigInt(whole || '0') * 10000000n + BigInt(padded || '0');
};

const amountsMatch = (expected: string, actual: string): boolean => {
  const expectedStroops = toStroops(expected);
  const actualStroops = toStroops(actual);
  if (expectedStroops === null || actualStroops === null) {
    return expected === actual;
  }
  return expectedStroops === actualStroops;
};

const resolveNetworkPassphrase = (network: X402Network): string => {
  return network === 'stellar:pubnet' ? Networks.PUBLIC : Networks.TESTNET;
};

const resolveFacilitatorUrl = (network: X402Network, configured?: string): string => {
  if (configured) return configured;
  return network === 'stellar:pubnet'
    ? 'https://channels.openzeppelin.com/x402'
    : 'https://channels.openzeppelin.com/x402/testnet';
};

const normalizeAsset = (asset?: X402Asset): X402Asset => {
  return asset || 'XLM';
};

const extractAssetCode = (asset: X402Asset): string => {
  if (asset === 'XLM') return 'XLM';
  return asset.code;
};

const isNativeAsset = (asset: X402Asset): boolean => asset === 'XLM';

const assetMatches = (asset: X402Asset, opAsset: Asset): boolean => {
  if (asset === 'XLM') return opAsset.isNative();
  if (opAsset.isNative()) return false;
  const codeMatches = opAsset.getCode() === asset.code;
  if (!asset.issuer) return codeMatches;
  return codeMatches && opAsset.getIssuer() === asset.issuer;
};

const pruneReplayCache = (ttlMs: number, maxEntries: number) => {
  if (replayCache.size <= maxEntries) {
    const now = Date.now();
    for (const [hash, timestamp] of replayCache) {
      if (now - timestamp > ttlMs) {
        replayCache.delete(hash);
      }
    }
    return;
  }
  const entries = Array.from(replayCache.entries()).sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < entries.length - maxEntries; i += 1) {
    replayCache.delete(entries[i][0]);
  }
};

const parsePaymentSignature = (headerValue: string): SignatureData | null => {
  try {
    const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (!parsed?.transaction || !parsed?.signed || !parsed?.publicKey) return null;
    return parsed as SignatureData;
  } catch {
    return null;
  }
};

const findPaymentOperation = (
  transaction: any,
  destination: string,
  asset: X402Asset
): { amount: string } | null => {
  const operations = transaction.operations || [];
  for (const op of operations) {
    if (op.type !== 'payment') continue;
    if (op.destination !== destination) continue;
    if (!assetMatches(asset, op.asset)) continue;
    return { amount: op.amount };
  }
  return null;
};

class FacilitatorClient {
  private client: AxiosInstance | null;

  constructor(private url: string, private apiKey?: string) {
    if (!apiKey) {
      this.client = null;
      return;
    }
    this.client = axios.create({
      baseURL: url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async verify(payload: any): Promise<any> {
    if (!this.client) return { success: false, skipped: true };
    const response = await this.client.post('/verify', payload);
    return response.data;
  }

  async settle(payload: any): Promise<any> {
    if (!this.client) return { success: false, skipped: true };
    const response = await this.client.post('/settle', payload);
    return response.data;
  }
}

export const createX402Server = (config: X402ServerConfig) => {
  const network = config.network || 'stellar:testnet';
  const scheme = config.scheme || 'exact-v2';
  const facilitatorUrl = resolveFacilitatorUrl(network, config.facilitatorUrl);
  const facilitatorClient = new FacilitatorClient(facilitatorUrl, config.apiKey);
  const ttlMs = config.replayTtlMs || 10 * 60 * 1000;
  const maxEntries = config.maxReplayEntries || 10000;

  const wrapEndpoint = <T = any>(options: WrapEndpointOptions<T>) => {
    const asset = normalizeAsset(options.asset);
    const payTo = options.destination || config.payTo;

    return async (req: Request, res: Response) => {
      if (!payTo) {
        return res.status(500).json({
          success: false,
          error: 'Server payment destination not configured',
        });
      }

      const paymentSignature = req.headers['payment-signature'] as string | undefined;

      if (!paymentSignature) {
        const instructions: PaymentInstructions = {
          scheme,
          price: options.price,
          network,
          payTo,
          asset: extractAssetCode(asset),
          assetIssuer: asset === 'XLM' ? undefined : asset.issuer,
          memo: options.memo,
          facilitatorUrl,
          description: options.description,
        };
        return res.status(402).json({
          status: 'payment_required',
          instructions,
        });
      }

      const signatureData = parsePaymentSignature(paymentSignature);
      if (!signatureData) {
        return res.status(402).json({
          success: false,
          error: 'Invalid Payment-Signature header',
        });
      }

      const networkPassphrase = resolveNetworkPassphrase(network);
      let parsedTx;
      try {
        parsedTx = TransactionBuilder.fromXDR(signatureData.transaction, networkPassphrase);
      } catch {
        return res.status(402).json({
          success: false,
          error: 'Invalid signed transaction',
        });
      }

      if (!parsedTx.signatures || parsedTx.signatures.length === 0) {
        return res.status(402).json({
          success: false,
          error: 'Signed transaction is missing signatures',
        });
      }

      const paymentOp = findPaymentOperation(parsedTx, payTo, asset);
      if (!paymentOp) {
        return res.status(402).json({
          success: false,
          error: 'Payment operation not found for destination',
        });
      }

      if (!amountsMatch(options.price, paymentOp.amount)) {
        return res.status(402).json({
          success: false,
          error: 'Payment amount does not match price',
        });
      }

      const txHash = parsedTx.hash().toString('hex');
      pruneReplayCache(ttlMs, maxEntries);
      if (replayCache.has(txHash)) {
        return res.status(402).json({
          success: false,
          error: 'Payment already used',
        });
      }

      let settlementHash = txHash;
      if (config.apiKey) {
        try {
          const verifyPayload = {
            transactionXdr: signatureData.transaction,
            network,
            scheme,
            payTo,
            price: options.price,
          };
          const verifyResult = await facilitatorClient.verify(verifyPayload);
          const verified =
            verifyResult?.verified ??
            verifyResult?.valid ??
            verifyResult?.success ??
            false;
          if (!verified && config.strictFacilitator) {
            return res.status(402).json({
              success: false,
              error: 'Payment verification failed',
              details: verifyResult?.reason || verifyResult?.error,
            });
          }

          const settlePayload = {
            transactionXdr: signatureData.transaction,
            network,
            scheme,
          };
          const settleResult = await facilitatorClient.settle(settlePayload);
          const settled =
            settleResult?.settled ??
            settleResult?.success ??
            Boolean(settleResult?.transactionHash);
          if (!settled && config.strictFacilitator) {
            return res.status(500).json({
              success: false,
              error: 'Payment settlement failed',
              details: settleResult?.reason || settleResult?.error,
            });
          }
          settlementHash = settleResult?.transactionHash || settlementHash;
        } catch (error: any) {
          if (config.strictFacilitator) {
            return res.status(500).json({
              success: false,
              error: 'Facilitator request failed',
              details: error.message,
            });
          }
        }
      }

      replayCache.set(txHash, Date.now());
      const paymentContext: PaymentContext = {
        transactionHash: settlementHash,
        payerPublicKey: signatureData.publicKey,
        amount: paymentOp.amount,
        asset,
      };
      (req as any).x402Payment = paymentContext;

      res.setHeader(
        'payment-response',
        Buffer.from(
          JSON.stringify({
            status: 'settled',
            hash: settlementHash,
            timestamp: new Date().toISOString(),
          })
        ).toString('base64')
      );

      const result = await options.handler(req, res);
      if (res.headersSent) return;
      if (result === undefined) return res.end();
      return res.json(result);
    };
  };

  return { wrapEndpoint };
};

export const createX402ServerFromEnv = () => {
  return createX402Server({
    payTo: process.env.X402_PAY_TO || process.env.SERVER_STELLAR_ADDRESS || '',
    network: (process.env.X402_NETWORK || 'stellar:testnet') as X402Network,
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
    apiKey: process.env.X402_API_KEY,
    scheme: process.env.X402_SCHEME || 'exact-v2',
    strictFacilitator: process.env.X402_STRICT_FACILITATOR === 'true',
  });
};
