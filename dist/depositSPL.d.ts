import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import * as hasher from '@lightprotocol/hasher.rs';
import { EncryptionService } from './utils/encryption.js';
type DepositParams = {
    mintAddress: PublicKey;
    publicKey: PublicKey;
    connection: Connection;
    base_units: number;
    storage: Storage;
    encryptionService: EncryptionService;
    keyBasePath: string;
    lightWasm: hasher.LightWasm;
    referrer?: string;
    transactionSigner: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
};
export declare function depositSPL({ lightWasm, storage, keyBasePath, publicKey, connection, base_units, encryptionService, transactionSigner, referrer, mintAddress }: DepositParams): Promise<{
    tx: string;
}>;
/**
 * Deposit SPL tokens v2 - with fee transfer in same transaction.
 *
 * @param options.totalBaseUnits - Total amount to commit (fee + actual deposit) in base units
 * @param options.feeBaseUnits - Fee amount to transfer to feeRecipient in base units
 * @param options.feeRecipient - Address to receive the fee (will use their ATA for the mint)
 * @param options.mintAddress - SPL token mint address (e.g., USDC)
 * @param options.referrer - Optional referrer wallet address
 * @returns Transaction result with signature
 *
 * @example
 * ```typescript
 * // Deposit 100 USDC with 2 USDC fee
 * // Result: 2 USDC to fee address, 98 USDC deposited
 * const result = await client.depositSPLV2({
 *     totalBaseUnits: 100 * 1_000_000,  // 100 USDC
 *     feeBaseUnits: 2 * 1_000_000,      // 2 USDC fee
 *     feeRecipient: new PublicKey('FeeRecipientAddress...'),
 *     mintAddress: USDC_MINT
 * });
 * ```
 */
type DepositSPLV2Params = {
    mintAddress: PublicKey;
    publicKey: PublicKey;
    connection: Connection;
    /** Total amount: fee + deposit amount. The actual deposit will be totalBaseUnits - feeBaseUnits */
    totalBaseUnits: number;
    /** Fee amount to transfer to feeRecipient */
    feeBaseUnits: number;
    /** Address to receive the fee */
    feeRecipient: PublicKey;
    storage: Storage;
    encryptionService: EncryptionService;
    keyBasePath: string;
    lightWasm: hasher.LightWasm;
    referrer?: string;
    transactionSigner: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
};
export declare function depositSPLV2({ lightWasm, storage, keyBasePath, publicKey, connection, totalBaseUnits, feeBaseUnits, feeRecipient, encryptionService, transactionSigner, referrer, mintAddress }: DepositSPLV2Params): Promise<{
    tx: string;
    depositBaseUnits: number;
    feeBaseUnits: number;
    feeRecipient: string;
}>;
export {};
