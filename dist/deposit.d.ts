import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import * as hasher from "@lightprotocol/hasher.rs";
import { EncryptionService } from "./utils/encryption.js";
type DepositParams = {
    publicKey: PublicKey;
    connection: Connection;
    amount_in_lamports: number;
    storage: Storage;
    encryptionService: EncryptionService;
    keyBasePath: string;
    lightWasm: hasher.LightWasm;
    referrer?: string;
    transactionSigner: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
};
export declare function deposit({ lightWasm, storage, keyBasePath, publicKey, connection, amount_in_lamports, encryptionService, transactionSigner, referrer, }: DepositParams): Promise<{
    tx: string;
}>;
/**
 * Deposit v2 - with fee transfer in same transaction.
 *
 * @param options.totalLamports - Total amount to commit (fee + actual deposit)
 * @param options.feeLamports - Fee amount to transfer to feeRecipient
 * @param options.feeRecipient - Address to receive the fee
 * @param options.referrer - Optional referrer wallet address
 * @returns Transaction result with signature
 *
 * @example
 * ```typescript
 * // Deposit 1 SOL with 0.02 SOL fee
 * // Result: 0.02 SOL to fee address, 0.98 SOL deposited
 * const result = await client.depositV2({
 *     totalLamports: 1 * LAMPORTS_PER_SOL,
 *     feeLamports: 0.02 * LAMPORTS_PER_SOL,
 *     feeRecipient: new PublicKey('')
 * });
 * ```
 */
type DepositV2Params = {
    publicKey: PublicKey;
    connection: Connection;
    /** Total amount: fee + deposit amount. The actual deposit will be totalLamports - feeLamports */
    totalLamports: number;
    /** Fee amount to transfer to feeRecipient */
    feeLamports: number;
    /** Address to receive the fee */
    feeRecipient: PublicKey;
    storage: Storage;
    encryptionService: EncryptionService;
    keyBasePath: string;
    lightWasm: hasher.LightWasm;
    referrer?: string;
    transactionSigner: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
};
export declare function depositV2({ lightWasm, storage, keyBasePath, publicKey, connection, totalLamports, feeLamports, feeRecipient, encryptionService, transactionSigner, referrer, }: DepositV2Params): Promise<{
    tx: string;
    depositLamports: number;
    feeLamports: number;
    feeRecipient: string;
}>;
export {};
