import { Keypair, PublicKey } from "@solana/web3.js";
import { type LoggerFn } from "./utils/logger.js";
export { PrivacyCashV2, PrivyWallet, USDC_MINT, type PrivyConfig, type PrivacyCashV2Config, } from "./indexV2.js";
export declare class PrivacyCash {
    private connection;
    publicKey: PublicKey;
    private encryptionService;
    private keypair;
    private isRuning?;
    private status;
    constructor({ RPC_url, owner, enableDebug, }: {
        RPC_url: string;
        owner: string | number[] | Uint8Array | Keypair;
        enableDebug?: boolean;
    });
    setLogger(loger: LoggerFn): this;
    /**
     * Clears the cache of utxos.
     *
     * By default, downloaded utxos will be cached in the local storage. Thus the next time when you makes another
     * deposit or withdraw or getPrivateBalance, the SDK only fetches the utxos that are not in the cache.
     *
     * This method clears the cache of utxos.
     */
    clearCache(): Promise<this>;
    /**
     * Deposit SOL to the Privacy Cash.
     *
     * Lamports is the amount of SOL in lamports. e.g. if you want to deposit 0.01 SOL (10000000 lamports), call deposit({ lamports: 10000000 })
     */
    deposit({ lamports }: {
        lamports: number;
    }): Promise<{
        tx: string;
    }>;
    /**
     * Withdraw SOL from the Privacy Cash.
     *
     * Lamports is the amount of SOL in lamports. e.g. if you want to withdraw 0.01 SOL (10000000 lamports), call withdraw({ lamports: 10000000 })
     */
    withdraw({ lamports, recipientAddress, }: {
        lamports: number;
        recipientAddress?: string;
    }): Promise<{
        isPartial: boolean;
        tx: string;
        recipient: string;
        amount_in_lamports: number;
        fee_in_lamports: number;
    }>;
    /**
     * Returns the amount of lamports current wallet has in Privacy Cash.
     */
    getPrivateBalance(): Promise<{
        lamports: number;
    }>;
    /**
     * Returns true if the code is running in a browser.
     */
    isBrowser(): boolean;
    startStatusRender(): Promise<void>;
}
