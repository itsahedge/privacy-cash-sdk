import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { type SolanaSignMessageResponseType } from "@privy-io/server-auth";
export interface PrivyConfig {
    appId: string;
    appSecret: string;
    authorizationPrivateKey: string;
}
/**
 * PrivyWallet adapter for Privacy Cash SDK
 * Wraps Privy server-auth wallet API for signing transactions and messages
 */
export declare class PrivyWallet {
    publicKey: PublicKey;
    private privyClient;
    private walletId;
    constructor(config: PrivyConfig, walletId: string, publicKey: string | PublicKey);
    /**
     * Get the wallet ID
     */
    getWalletId(): string;
    /**
     * Sign a transaction using Privy wallet API
     */
    signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
    /**
     * Sign multiple transactions
     */
    signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
    /**
     * Sign a message using Privy wallet API
     * @param message - Message to sign (string or Uint8Array)
     * @returns The signature response including the signature bytes
     */
    signMessage(message: string | Uint8Array): Promise<SolanaSignMessageResponseType>;
    /**
     * Sign a message and return just the signature bytes
     * @param message - Message to sign
     * @returns Uint8Array signature
     */
    signMessageBytes(message: string | Uint8Array): Promise<Uint8Array>;
}
