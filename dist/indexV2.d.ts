import { PublicKey } from "@solana/web3.js";
import { type LoggerFn } from "./utils/logger.js";
import { PrivyWallet, type PrivyConfig } from "./utils/privy-wallet.js";
export interface PrivacyCashV2Config {
    /** Solana RPC URL */
    RPC_url: string;
    /** Privy wallet ID */
    walletId: string;
    /** Solana public key of the wallet (base58 string or PublicKey) */
    publicKey: string | PublicKey;
    /** Privy configuration */
    privy: PrivyConfig;
    /** Enable debug logging (default: false) */
    enableDebug?: boolean;
}
/**
 * PrivacyCashV2 - Privacy Cash SDK using Privy wallet for signing
 *
 * This version uses Privy's server-auth wallet API for all signing operations,
 * instead of requiring direct access to a Solana keypair.
 *
 * @example
 * ```typescript
 * const client = await PrivacyCashV2.create({
 *     RPC_url: 'https://api.mainnet-beta.solana.com',
 *     walletId: 'your-privy-wallet-id',
 *     publicKey: 'your-solana-public-key',
 *     privy: {
 *         appId: process.env.PRIVY_APP_ID!,
 *         appSecret: process.env.PRIVY_APP_SECRET!,
 *         authorizationPrivateKey: process.env.PRIVY_PRIVATE_KEY!,
 *     }
 * });
 *
 * // Deposit SOL
 * await client.deposit({ lamports: 0.01 * 1_000_000_000 });
 *
 * // Check balance
 * const balance = await client.getPrivateBalance();
 *
 * // Withdraw SOL
 * await client.withdraw({ lamports: 0.005 * 1_000_000_000 });
 * ```
 */
export declare class PrivacyCashV2 {
    private connection;
    publicKey: PublicKey;
    private encryptionService;
    private privyWallet;
    private isRunning?;
    private status;
    /**
     * Private constructor - use PrivacyCashV2.create() instead
     */
    private constructor();
    /**
     * Create a new PrivacyCashV2 instance
     *
     * This is an async factory method because deriving the encryption key
     * from a Privy wallet requires an async signature operation.
     *
     * @param config - Configuration options
     * @returns Promise resolving to a PrivacyCashV2 instance
     */
    static create(config: PrivacyCashV2Config): Promise<PrivacyCashV2>;
    /**
     * Set a custom logger function
     */
    setLogger(loggerFn: LoggerFn): this;
    /**
     * Clears the cache of UTXOs for native SOL.
     *
     * By default, downloaded UTXOs are cached in local storage. The next time you make
     * a deposit, withdraw, or getPrivateBalance call, the SDK only fetches UTXOs
     * that are not in the cache.
     *
     * This method clears the cache completely.
     */
    clearCache(): Promise<this>;
    /**
     * Clears the cache of UTXOs for SPL tokens (USDC).
     *
     * By default, downloaded UTXOs are cached in local storage. The next time you make
     * a depositSPL, withdrawSPL, or getPrivateBalanceSPL call, the SDK only fetches UTXOs
     * that are not in the cache.
     *
     * This method clears the SPL token cache completely.
     *
     * @param mintAddress - Optional SPL token mint address. Defaults to USDC.
     */
    clearCacheSPL(mintAddress?: PublicKey): Promise<this>;
    /**
     * Deposit SOL to Privacy Cash.
     *
     * @param options.lamports - Amount of SOL in lamports (e.g., 0.01 SOL = 10_000_000 lamports)
     * @param options.referrer - Optional referrer wallet address
     * @returns Transaction result with signature
     *
     * @example
     * ```typescript
     * // Deposit 0.02 SOL
     * const result = await client.deposit({ lamports: 0.02 * 1_000_000_000 });
     * console.log('Transaction:', result.tx);
     * ```
     */
    deposit({ lamports, referrer, }: {
        lamports: number;
        referrer?: string;
    }): Promise<{
        tx: string;
    }>;
    /**
     * Deposit SOL to Privacy Cash with fee transfer in the same transaction.
     *
     * This method allows you to deposit SOL while also transferring a fee to a
     * specified recipient in a single atomic transaction.
     *
     * @param options.totalLamports - Total amount (fee + deposit). The actual deposit will be totalLamports - feeLamports
     * @param options.feeLamports - Fee amount to transfer to feeRecipient
     * @param options.feeRecipient - Address to receive the fee (string or PublicKey)
     * @param options.referrer - Optional referrer wallet address
     * @returns Transaction result with signature and breakdown of amounts
     *
     * @example
     * ```typescript
     * // Deposit 1 SOL with 0.02 SOL fee
     * // Result: 0.02 SOL to fee address, 0.98 SOL deposited privately
     * const result = await client.depositV2({
     *     totalLamports: 1 * 1_000_000_000,
     *     feeLamports: 0.02 * 1_000_000_000,
     *     feeRecipient: 'FeeRecipientAddress...'
     * });
     * console.log('Transaction:', result.tx);
     * console.log('Deposited:', result.depositLamports / 1e9, 'SOL');
     * console.log('Fee paid:', result.feeLamports / 1e9, 'SOL');
     * ```
     */
    depositV2({ totalLamports, feeLamports, feeRecipient, referrer, }: {
        totalLamports: number;
        feeLamports: number;
        feeRecipient: string | PublicKey;
        referrer?: string;
    }): Promise<{
        tx: string;
        depositLamports: number;
        feeLamports: number;
        feeRecipient: string;
    }>;
    /**
     * Withdraw SOL from Privacy Cash.
     *
     * @param options.lamports - Amount of SOL in lamports to withdraw
     * @param options.recipientAddress - Optional recipient address (defaults to this wallet)
     * @returns Transaction result with signature, amounts, and fee info
     *
     * @example
     * ```typescript
     * // Withdraw 0.01 SOL to yourself
     * const result = await client.withdraw({ lamports: 0.01 * 1_000_000_000 });
     *
     * // Withdraw to another address
     * const result = await client.withdraw({
     *     lamports: 0.01 * 1_000_000_000,
     *     recipientAddress: 'SomeOtherAddress...'
     * });
     * ```
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
     * Returns the private balance in lamports for the current wallet.
     *
     * @returns Object with lamports balance
     *
     * @example
     * ```typescript
     * const balance = await client.getPrivateBalance();
     * console.log(`Balance: ${balance.lamports / 1_000_000_000} SOL`);
     * ```
     */
    getPrivateBalance(): Promise<{
        lamports: number;
    }>;
    /**
     * Deposit SPL tokens (USDC) to Privacy Cash.
     *
     * @param options.baseUnits - Amount in base units (e.g., 1 USDC = 1_000_000 base units)
     * @param options.mintAddress - Optional SPL token mint address. Defaults to USDC.
     * @param options.referrer - Optional referrer wallet address
     * @returns Transaction result with signature
     *
     * @example
     * ```typescript
     * // Deposit 10 USDC
     * const result = await client.depositSPL({ baseUnits: 10 * 1_000_000 });
     * console.log('Transaction:', result.tx);
     * ```
     */
    depositSPL({ baseUnits, mintAddress, referrer, }: {
        baseUnits: number;
        mintAddress?: PublicKey;
        referrer?: string;
    }): Promise<{
        tx: string;
    }>;
    /**
     * Withdraw SPL tokens (USDC) from Privacy Cash.
     *
     * @param options.baseUnits - Amount in base units to withdraw (e.g., 1 USDC = 1_000_000 base units)
     * @param options.mintAddress - Optional SPL token mint address. Defaults to USDC.
     * @param options.recipientAddress - Optional recipient address (defaults to this wallet)
     * @returns Transaction result with signature, amounts, and fee info
     *
     * @example
     * ```typescript
     * // Withdraw 5 USDC to yourself
     * const result = await client.withdrawSPL({ baseUnits: 5 * 1_000_000 });
     *
     * // Withdraw to another address
     * const result = await client.withdrawSPL({
     *     baseUnits: 5 * 1_000_000,
     *     recipientAddress: 'SomeOtherAddress...'
     * });
     * ```
     */
    withdrawSPL({ baseUnits, mintAddress, recipientAddress, }: {
        baseUnits: number;
        mintAddress?: PublicKey;
        recipientAddress?: string;
    }): Promise<{
        isPartial: boolean;
        tx: string;
        recipient: string;
        base_units: number;
        fee_base_units: number;
    }>;
    /**
     * Returns the private SPL token balance in base units for the current wallet.
     *
     * @param mintAddress - Optional SPL token mint address. Defaults to USDC.
     * @returns Object with base_units balance
     *
     * @example
     * ```typescript
     * const balance = await client.getPrivateBalanceSPL();
     * console.log(`USDC Balance: ${balance.base_units / 1_000_000} USDC`);
     * ```
     */
    getPrivateBalanceSPL(mintAddress?: PublicKey): Promise<{
        base_units: number;
        lamports: number;
    }>;
    /**
     * Get the underlying Privy wallet instance
     */
    getPrivyWallet(): PrivyWallet;
    /**
     * Check if the SDK is currently running an operation
     */
    isOperationRunning(): boolean;
    /**
     * Returns true if running in a browser environment
     */
    isBrowser(): boolean;
    private startStatusRender;
}
export { PrivyWallet, type PrivyConfig } from "./utils/privy-wallet.js";
export { USDC_MINT } from "./utils/constants.js";
