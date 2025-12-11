import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  PrivyClient,
  type SolanaSignMessageResponseType,
} from "@privy-io/server-auth";

export interface PrivyConfig {
  appId: string;
  appSecret: string;
  authorizationPrivateKey: string;
}

/**
 * PrivyWallet adapter for Privacy Cash SDK
 * Wraps Privy server-auth wallet API for signing transactions and messages
 */
export class PrivyWallet {
  public publicKey: PublicKey;
  private privyClient: PrivyClient;
  private walletId: string;

  constructor(
    config: PrivyConfig,
    walletId: string,
    publicKey: string | PublicKey
  ) {
    this.walletId = walletId;
    this.publicKey =
      typeof publicKey === "string" ? new PublicKey(publicKey) : publicKey;
    this.privyClient = new PrivyClient(config.appId, config.appSecret);
    this.privyClient.walletApi.updateAuthorizationKey(
      config.authorizationPrivateKey
    );
  }

  /**
   * Get the wallet ID
   */
  getWalletId(): string {
    return this.walletId;
  }

  /**
   * Sign a transaction using Privy wallet API
   */
  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    const signedTx = await this.privyClient.walletApi.solana.signTransaction({
      walletId: this.walletId,
      transaction: tx,
    });
    return signedTx.signedTransaction as T;
  }

  /**
   * Sign multiple transactions
   */
  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    const signedTxs = await Promise.all(
      txs.map((tx) => this.signTransaction(tx))
    );
    return signedTxs;
  }

  /**
   * Sign a message using Privy wallet API
   * @param message - Message to sign (string or Uint8Array)
   * @returns The signature response including the signature bytes
   */
  async signMessage(
    message: string | Uint8Array
  ): Promise<SolanaSignMessageResponseType> {
    const messageBuffer =
      typeof message === "string" ? Buffer.from(message) : Buffer.from(message);

    const result = await this.privyClient.walletApi.solana.signMessage({
      walletId: this.walletId,
      message: messageBuffer,
    });
    return result;
  }

  /**
   * Sign a message and return just the signature bytes
   * @param message - Message to sign
   * @returns Uint8Array signature
   */
  async signMessageBytes(message: string | Uint8Array): Promise<Uint8Array> {
    const result = await this.signMessage(message);
    return result.signature;
  }
}
