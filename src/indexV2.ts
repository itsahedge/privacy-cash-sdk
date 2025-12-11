import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import { deposit, depositV2 } from "./deposit.js";
import { depositSPL, depositSPLV2 } from "./depositSPL.js";
import { getBalanceFromUtxos, getUtxos, localstorageKey } from "./getUtxos.js";
import {
  getBalanceFromUtxosSPL,
  getUtxosSPL,
  localstorageKey as localstorageKeySPL,
} from "./getUtxosSPL.js";

import {
  LSK_ENCRYPTED_OUTPUTS,
  LSK_FETCH_OFFSET,
  USDC_MINT,
} from "./utils/constants.js";
import { logger, type LoggerFn, setLogger } from "./utils/logger.js";
import { EncryptionService } from "./utils/encryption.js";
import { WasmFactory } from "@lightprotocol/hasher.rs";
import { withdraw } from "./withdraw.js";
import { withdrawSPL } from "./withdrawSPL.js";
import { LocalStorage } from "node-localstorage";
import path from "node:path";
import { PrivyWallet, type PrivyConfig } from "./utils/privy-wallet.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

let storage = new LocalStorage(path.join(process.cwd(), "cache"));

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
export class PrivacyCashV2 {
  private connection: Connection;
  public publicKey: PublicKey;
  private encryptionService: EncryptionService;
  private privyWallet: PrivyWallet;
  private isRunning?: boolean = false;
  private status: string = "";

  /**
   * Private constructor - use PrivacyCashV2.create() instead
   */
  private constructor(
    connection: Connection,
    publicKey: PublicKey,
    encryptionService: EncryptionService,
    privyWallet: PrivyWallet,
    enableDebug: boolean
  ) {
    this.connection = connection;
    this.publicKey = publicKey;
    this.encryptionService = encryptionService;
    this.privyWallet = privyWallet;

    if (!enableDebug) {
      this.startStatusRender();
      this.setLogger((level, message) => {
        if (level === "info") {
          this.status = message;
        } else if (level === "error") {
          console.log("error message:", message);
        }
      });
    }
  }

  /**
   * Create a new PrivacyCashV2 instance
   *
   * This is an async factory method because deriving the encryption key
   * from a Privy wallet requires an async signature operation.
   *
   * @param config - Configuration options
   * @returns Promise resolving to a PrivacyCashV2 instance
   */
  static async create(config: PrivacyCashV2Config): Promise<PrivacyCashV2> {
    const { RPC_url, walletId, publicKey, privy, enableDebug = false } = config;

    // Create Privy wallet instance
    const privyWallet = new PrivyWallet(privy, walletId, publicKey);

    // Create connection
    const connection = new Connection(RPC_url, "confirmed");

    // Create encryption service and derive key from Privy wallet signature
    const encryptionService = new EncryptionService();
    await encryptionService.deriveEncryptionKeyFromPrivyWallet(privyWallet);

    return new PrivacyCashV2(
      connection,
      privyWallet.publicKey,
      encryptionService,
      privyWallet,
      enableDebug
    );
  }

  /**
   * Set a custom logger function
   */
  setLogger(loggerFn: LoggerFn): this {
    setLogger(loggerFn);
    return this;
  }

  /**
   * Clears the cache of UTXOs for native SOL.
   *
   * By default, downloaded UTXOs are cached in local storage. The next time you make
   * a deposit, withdraw, or getPrivateBalance call, the SDK only fetches UTXOs
   * that are not in the cache.
   *
   * This method clears the cache completely.
   */
  async clearCache(): Promise<this> {
    if (!this.publicKey) {
      return this;
    }
    storage.removeItem(LSK_FETCH_OFFSET + localstorageKey(this.publicKey));
    storage.removeItem(LSK_ENCRYPTED_OUTPUTS + localstorageKey(this.publicKey));
    return this;
  }

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
  async clearCacheSPL(mintAddress: PublicKey = USDC_MINT): Promise<this> {
    if (!this.publicKey) {
      return this;
    }
    const publicKeyAta = await getAssociatedTokenAddress(
      mintAddress,
      this.publicKey
    );
    storage.removeItem(LSK_FETCH_OFFSET + localstorageKeySPL(publicKeyAta));
    storage.removeItem(
      LSK_ENCRYPTED_OUTPUTS + localstorageKeySPL(publicKeyAta)
    );
    return this;
  }

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
  async deposit({
    lamports,
    referrer,
  }: {
    lamports: number;
    referrer?: string;
  }): Promise<{ tx: string }> {
    this.isRunning = true;
    logger.info("start depositing");

    try {
      const lightWasm = await WasmFactory.getInstance();
      const res = await deposit({
        lightWasm,
        amount_in_lamports: lamports,
        connection: this.connection,
        encryptionService: this.encryptionService,
        publicKey: this.publicKey,
        referrer,
        transactionSigner: async (tx: VersionedTransaction) => {
          // Use Privy wallet to sign the transaction
          return await this.privyWallet.signTransaction(tx);
        },
        keyBasePath: path.join(
          import.meta.dirname,
          "..",
          "circuit2",
          "transaction2"
        ),
        storage,
      });
      return res;
    } finally {
      this.isRunning = false;
    }
  }

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
  async depositV2({
    totalLamports,
    feeLamports,
    feeRecipient,
    referrer,
  }: {
    totalLamports: number;
    feeLamports: number;
    feeRecipient: string | PublicKey;
    referrer?: string;
  }): Promise<{
    tx: string;
    depositLamports: number;
    feeLamports: number;
    feeRecipient: string;
  }> {
    this.isRunning = true;
    logger.info("start depositing with fee transfer");

    try {
      const lightWasm = await WasmFactory.getInstance();
      const feeRecipientPubkey =
        typeof feeRecipient === "string"
          ? new PublicKey(feeRecipient)
          : feeRecipient;

      const res = await depositV2({
        lightWasm,
        totalLamports,
        feeLamports,
        feeRecipient: feeRecipientPubkey,
        connection: this.connection,
        encryptionService: this.encryptionService,
        publicKey: this.publicKey,
        referrer,
        transactionSigner: async (tx: VersionedTransaction) => {
          return await this.privyWallet.signTransaction(tx);
        },
        keyBasePath: path.join(
          import.meta.dirname,
          "..",
          "circuit2",
          "transaction2"
        ),
        storage,
      });

      console.log(
        `Deposit successful. Deposited ${
          res.depositLamports / LAMPORTS_PER_SOL
        } SOL, ` +
          `paid ${res.feeLamports / LAMPORTS_PER_SOL} SOL fee to ${
            res.feeRecipient
          }`
      );

      return res;
    } finally {
      this.isRunning = false;
    }
  }

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
  async withdraw({
    lamports,
    recipientAddress,
  }: {
    lamports: number;
    recipientAddress?: string;
  }): Promise<{
    isPartial: boolean;
    tx: string;
    recipient: string;
    amount_in_lamports: number;
    fee_in_lamports: number;
  }> {
    this.isRunning = true;
    logger.info("start withdrawing");

    try {
      const lightWasm = await WasmFactory.getInstance();
      const recipient = recipientAddress
        ? new PublicKey(recipientAddress)
        : this.publicKey;

      const res = await withdraw({
        lightWasm,
        amount_in_lamports: lamports,
        connection: this.connection,
        encryptionService: this.encryptionService,
        publicKey: this.publicKey,
        recipient,
        keyBasePath: path.join(
          import.meta.dirname,
          "..",
          "circuit2",
          "transaction2"
        ),
        storage,
      });

      console.log(
        `Withdraw successful. Recipient ${recipient} received ` +
          `${res.amount_in_lamports / LAMPORTS_PER_SOL} SOL, ` +
          `with ${res.fee_in_lamports / LAMPORTS_PER_SOL} SOL relayer fees`
      );

      return res;
    } finally {
      this.isRunning = false;
    }
  }

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
  async getPrivateBalance(): Promise<{ lamports: number }> {
    logger.info("getting private balance");
    this.isRunning = true;

    try {
      const utxos = await getUtxos({
        publicKey: this.publicKey,
        connection: this.connection,
        encryptionService: this.encryptionService,
        storage,
      });
      return getBalanceFromUtxos(utxos);
    } finally {
      this.isRunning = false;
    }
  }

  // ==================== SPL Token (USDC) Methods ====================

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
  async depositSPL({
    baseUnits,
    mintAddress = USDC_MINT,
    referrer,
  }: {
    baseUnits: number;
    mintAddress?: PublicKey;
    referrer?: string;
  }): Promise<{ tx: string }> {
    this.isRunning = true;
    logger.info("start depositing SPL token");

    try {
      const lightWasm = await WasmFactory.getInstance();
      const res = await depositSPL({
        lightWasm,
        base_units: baseUnits,
        connection: this.connection,
        encryptionService: this.encryptionService,
        publicKey: this.publicKey,
        mintAddress,
        referrer,
        transactionSigner: async (tx: VersionedTransaction) => {
          // Use Privy wallet to sign the transaction
          return await this.privyWallet.signTransaction(tx);
        },
        keyBasePath: path.join(
          import.meta.dirname,
          "..",
          "circuit2",
          "transaction2"
        ),
        storage,
      });
      return res;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Deposit SPL tokens (USDC) to Privacy Cash with fee transfer in the same transaction.
   *
   * This method allows you to deposit SPL tokens while also transferring a fee to a
   * specified recipient in a single atomic transaction.
   *
   * @param options.totalBaseUnits - Total amount (fee + deposit) in base units. The actual deposit will be totalBaseUnits - feeBaseUnits
   * @param options.feeBaseUnits - Fee amount to transfer to feeRecipient in base units
   * @param options.feeRecipient - Address to receive the fee (string or PublicKey)
   * @param options.mintAddress - Optional SPL token mint address. Defaults to USDC.
   * @param options.referrer - Optional referrer wallet address
   * @returns Transaction result with signature and breakdown of amounts
   *
   * @example
   * ```typescript
   * // Deposit 100 USDC with 2 USDC fee
   * // Result: 2 USDC to fee address, 98 USDC deposited privately
   * const result = await client.depositSPLV2({
   *     totalBaseUnits: 100 * 1_000_000,   // 100 USDC total
   *     feeBaseUnits: 2 * 1_000_000,       // 2 USDC fee
   *     feeRecipient: 'FeeRecipientAddress...'
   * });
   * console.log('Transaction:', result.tx);
   * console.log('Deposited:', result.depositBaseUnits / 1e6, 'USDC');
   * console.log('Fee paid:', result.feeBaseUnits / 1e6, 'USDC');
   * ```
   */
  async depositSPLV2({
    totalBaseUnits,
    feeBaseUnits,
    feeRecipient,
    mintAddress = USDC_MINT,
    referrer,
  }: {
    totalBaseUnits: number;
    feeBaseUnits: number;
    feeRecipient: string | PublicKey;
    mintAddress?: PublicKey;
    referrer?: string;
  }): Promise<{
    tx: string;
    depositBaseUnits: number;
    feeBaseUnits: number;
    feeRecipient: string;
  }> {
    this.isRunning = true;
    logger.info("start depositing SPL token with fee transfer");

    try {
      const lightWasm = await WasmFactory.getInstance();
      const feeRecipientPubkey =
        typeof feeRecipient === "string"
          ? new PublicKey(feeRecipient)
          : feeRecipient;

      const res = await depositSPLV2({
        lightWasm,
        totalBaseUnits,
        feeBaseUnits,
        feeRecipient: feeRecipientPubkey,
        connection: this.connection,
        encryptionService: this.encryptionService,
        publicKey: this.publicKey,
        mintAddress,
        referrer,
        transactionSigner: async (tx: VersionedTransaction) => {
          return await this.privyWallet.signTransaction(tx);
        },
        keyBasePath: path.join(
          import.meta.dirname,
          "..",
          "circuit2",
          "transaction2"
        ),
        storage,
      });

      // Calculate decimals for display (USDC has 6 decimals)
      const decimals = 6;
      const divisor = Math.pow(10, decimals);

      console.log(
        `SPL Deposit successful. Deposited ${
          res.depositBaseUnits / divisor
        } tokens, ` +
          `paid ${res.feeBaseUnits / divisor} tokens fee to ${res.feeRecipient}`
      );

      return res;
    } finally {
      this.isRunning = false;
    }
  }

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
  async withdrawSPL({
    baseUnits,
    mintAddress = USDC_MINT,
    recipientAddress,
  }: {
    baseUnits: number;
    mintAddress?: PublicKey;
    recipientAddress?: string;
  }): Promise<{
    isPartial: boolean;
    tx: string;
    recipient: string;
    base_units: number;
    fee_base_units: number;
  }> {
    this.isRunning = true;
    logger.info("start withdrawing SPL token");

    try {
      const lightWasm = await WasmFactory.getInstance();
      const recipient = recipientAddress
        ? new PublicKey(recipientAddress)
        : this.publicKey;

      const res = await withdrawSPL({
        lightWasm,
        base_units: baseUnits,
        connection: this.connection,
        encryptionService: this.encryptionService,
        publicKey: this.publicKey,
        mintAddress,
        recipient,
        keyBasePath: path.join(
          import.meta.dirname,
          "..",
          "circuit2",
          "transaction2"
        ),
        storage,
      });

      // Calculate decimals for display (USDC has 6 decimals)
      const decimals = 6;
      const divisor = Math.pow(10, decimals);

      console.log(
        `SPL Withdraw successful. Recipient ${recipient} received ` +
          `${res.base_units / divisor} tokens, ` +
          `with ${res.fee_base_units / divisor} tokens relayer fees`
      );

      return res;
    } finally {
      this.isRunning = false;
    }
  }

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
  async getPrivateBalanceSPL(
    mintAddress: PublicKey = USDC_MINT
  ): Promise<{ base_units: number; lamports: number }> {
    logger.info("getting private SPL balance");
    this.isRunning = true;

    try {
      const utxos = await getUtxosSPL({
        publicKey: this.publicKey,
        connection: this.connection,
        encryptionService: this.encryptionService,
        mintAddress,
        storage,
      });
      return getBalanceFromUtxosSPL(utxos);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get the underlying Privy wallet instance
   */
  getPrivyWallet(): PrivyWallet {
    return this.privyWallet;
  }

  /**
   * Check if the SDK is currently running an operation
   */
  isOperationRunning(): boolean {
    return this.isRunning ?? false;
  }

  /**
   * Returns true if running in a browser environment
   */
  isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  private async startStatusRender(): Promise<void> {
    const frames = ["-", "\\", "|", "/"];
    let i = 0;
    while (true) {
      if (this.isRunning) {
        const k = i % frames.length;
        i++;
        stdWrite(this.status, frames[k]);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

function stdWrite(status: string, frame: string): void {
  const blue = "\x1b[34m";
  const reset = "\x1b[0m";
  process.stdout.write(`${frame}status: ${blue}${status}${reset}\r`);
}

// Re-export PrivyWallet and config types for convenience
export { PrivyWallet, type PrivyConfig } from "./utils/privy-wallet.js";

// Re-export USDC_MINT for convenience
export { USDC_MINT } from "./utils/constants.js";
