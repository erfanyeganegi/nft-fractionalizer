import { types } from "https://deno.land/x/clarinet@v0.33.0/index.ts"

export const CONTRACT = ".nft-fractionalizer"
export const FRACTIONAL_NFT = CONTRACT + ".fractional-nft"
export const FRACTIONS = CONTRACT + ".fractions"

export const ERR_NFT_RECIPIENT_ONLY = types.err(types.uint(101))

export const ERR_INVALID_SUPPLY_VALUE = types.err(types.uint(300))
