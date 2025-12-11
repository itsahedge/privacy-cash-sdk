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
export {};
