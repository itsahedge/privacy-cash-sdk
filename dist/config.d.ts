type Config = {
    withdraw_fee_rate: number;
    withdraw_rent_fee: number;
    deposit_fee_rate: number;
    usdc_withdraw_rent_fee: number;
};
export declare function getConfig<K extends keyof Config>(key: K): Promise<Config[K]>;
export {};
