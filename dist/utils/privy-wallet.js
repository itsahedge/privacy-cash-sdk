import { PublicKey } from "@solana/web3.js";
import { PrivyClient, } from "@privy-io/server-auth";
/**
 * PrivyWallet adapter for Privacy Cash SDK
 * Wraps Privy server-auth wallet API for signing transactions and messages
 */
export class PrivyWallet {
    publicKey;
    privyClient;
    walletId;
    constructor(config, walletId, publicKey) {
        this.walletId = walletId;
        this.publicKey =
            typeof publicKey === "string" ? new PublicKey(publicKey) : publicKey;
        this.privyClient = new PrivyClient(config.appId, config.appSecret);
        this.privyClient.walletApi.updateAuthorizationKey(config.authorizationPrivateKey);
    }
    /**
     * Get the wallet ID
     */
    getWalletId() {
        return this.walletId;
    }
    /**
     * Sign a transaction using Privy wallet API
     */
    async signTransaction(tx) {
        const signedTx = await this.privyClient.walletApi.solana.signTransaction({
            walletId: this.walletId,
            transaction: tx,
        });
        return signedTx.signedTransaction;
    }
    /**
     * Sign multiple transactions
     */
    async signAllTransactions(txs) {
        const signedTxs = await Promise.all(txs.map((tx) => this.signTransaction(tx)));
        return signedTxs;
    }
    /**
     * Sign a message using Privy wallet API
     * @param message - Message to sign (string or Uint8Array)
     * @returns The signature response including the signature bytes
     */
    async signMessage(message) {
        const messageBuffer = typeof message === "string" ? Buffer.from(message) : Buffer.from(message);
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
    async signMessageBytes(message) {
        const result = await this.signMessage(message);
        return result.signature;
    }
}
