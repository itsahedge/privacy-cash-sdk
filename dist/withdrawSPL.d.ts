import { Connection, PublicKey } from '@solana/web3.js';
import * as hasher from '@lightprotocol/hasher.rs';
import { EncryptionService } from './utils/encryption.js';
type WithdrawParams = {
    publicKey: PublicKey;
    connection: Connection;
    base_units: number;
    keyBasePath: string;
    encryptionService: EncryptionService;
    lightWasm: hasher.LightWasm;
    recipient: PublicKey;
    mintAddress: PublicKey;
    storage: Storage;
};
export declare function withdrawSPL({ recipient, lightWasm, storage, publicKey, connection, base_units, encryptionService, keyBasePath, mintAddress }: WithdrawParams): Promise<{
    isPartial: boolean;
    tx: string;
    recipient: string;
    base_units: number;
    fee_base_units: number;
}>;
export {};
