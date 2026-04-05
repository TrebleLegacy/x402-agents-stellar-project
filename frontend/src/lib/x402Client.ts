import * as StellarSdk from '@stellar/stellar-sdk';

export interface X402PaymentInput {
  sourcePublicKey: string;
  receiveSigningPublicKey: string;
  destinationAddress: string;
  amount: string;
  assetContract: string;
  price: string;
  assetCode?: string;
  assetIssuer?: string;
}

export interface PaymentSignatureData {
  transaction: string;
  signed: boolean;
  publicKey: string;
  timestamp: number;
}

export class X402PaymentClient {
  private network: 'testnet' | 'mainnet';

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
  }

  private getNetworkPassphrase(): string {
    return this.network === 'testnet'
      ? StellarSdk.Networks.TESTNET
      : StellarSdk.Networks.PUBLIC;
  }

  buildUnsignedTransaction(props: X402PaymentInput): string {
    const { sourcePublicKey, destinationAddress, amount, assetCode, assetIssuer } = props;

    const account = new StellarSdk.Account(sourcePublicKey, '100');

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.getNetworkPassphrase(),
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: destinationAddress,
          amount: amount,
          asset: assetCode && assetIssuer
            ? new StellarSdk.Asset(assetCode, assetIssuer)
            : StellarSdk.Asset.native(),
        })
      )
      .setTimeout(30)
      .build();

    return transaction.toXDR();
  }

  signTransaction(xdr: string, secretKey: string): PaymentSignatureData {
    const keypair = StellarSdk.Keypair.fromSecret(secretKey);
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      xdr,
      this.getNetworkPassphrase()
    );

    transaction.sign(keypair);

    return {
      transaction: transaction.toXDR(),
      signed: true,
      publicKey: keypair.publicKey(),
      timestamp: Date.now(),
    };
  }

  buildAndSign(
    props: X402PaymentInput,
    secretKey: string
  ): PaymentSignatureData {
    const unsignedXdr = this.buildUnsignedTransaction(props);
    return this.signTransaction(unsignedXdr, secretKey);
  }

  createPaymentSignatureHeader(data: PaymentSignatureData): string {
    const headerData = JSON.stringify(data);
    return Buffer.from(headerData).toString('base64');
  }

  parsePaymentHeader(headerValue: string): PaymentSignatureData {
    const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }

  parsePaymentResponse(headerValue: string): Record<string, unknown> {
    const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }
}
