import { Horizon } from '@stellar/stellar-sdk';

const TESTNET_URL = 'https://horizon-testnet.stellar.org';
const MAINNET_URL = 'https://horizon.stellar.org';

const network = process.env.STELLAR_NETWORK || 'testnet';
const serverUrl = network === 'mainnet' ? MAINNET_URL : TESTNET_URL;

export const server = new Horizon.Server(serverUrl);
