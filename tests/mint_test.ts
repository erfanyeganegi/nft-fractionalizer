import { Clarinet, Tx, types } from "https://deno.land/x/clarinet@v0.33.0/index.ts"
import { assertEquals } from "https://deno.land/std@0.125.0/testing/asserts.ts"

/** constants */
import {
  CONTRACT,
  FRACTIONAL_NFT,
  FRACTIONS,
  ERR_NFT_RECIPIENT_ONLY,
  ERR_INVALID_SUPPLY_VALUE,
} from "./nft-fractionalizer-constants.ts"

const DEPLOYER_WALLET = "deployer"
const SENDER_WALLET = "sender"
const RECIPIENT_WALLET = "recipient"

Clarinet.test({
  name: "mint: ensure that recipient must be tx-sender",
  fn(chain, accounts) {
    const sender = accounts.get(SENDER_WALLET)!
    const recipient = accounts.get(RECIPIENT_WALLET)!

    const supply = 0
    const uri = "98a9d5cefa45be0b7e1d5eae8bff86e5e4bfda9075ece57b007dc404e74d16ea"

    const block = chain.mineBlock([
      Tx.contractCall(
        "nft-fractionalizer",
        "mint",
        [types.principal(recipient.address), types.uint(supply), types.ascii(uri)],
        sender.address
      ),
    ])

    assertEquals(block.receipts[0].result, ERR_NFT_RECIPIENT_ONLY)
  },
})

Clarinet.test({
  name: "mint: ensure that supply value must be non-zero",
  fn(chain, accounts) {
    const recipient = accounts.get(RECIPIENT_WALLET)!

    const supply = 0
    const uri = "98a9d5cefa45be0b7e1d5eae8bff86e5e4bfda9075ece57b007dc404e74d16ea"

    const block = chain.mineBlock([
      Tx.contractCall(
        "nft-fractionalizer",
        "mint",
        [types.principal(recipient.address), types.uint(supply), types.ascii(uri)],
        recipient.address
      ),
    ])

    assertEquals(block.receipts[0].result, ERR_INVALID_SUPPLY_VALUE)
  },
})

Clarinet.test({
  name: "mint: ensure that nft and ft are minted and data maps are updated",
  fn(chain, accounts) {
    const deployer = accounts.get(DEPLOYER_WALLET)!
    const recipient = accounts.get(RECIPIENT_WALLET)!

    const supply = 100
    const uri = "98a9d5cefa45be0b7e1d5eae8bff86e5e4bfda9075ece57b007dc404e74d16ea"

    const block = chain.mineBlock([
      Tx.contractCall(
        "nft-fractionalizer",
        "mint",
        [types.principal(recipient.address), types.uint(supply), types.ascii(uri)],
        recipient.address
      ),
      Tx.contractCall(
        "nft-fractionalizer",
        "get-total-supply",
        [types.uint(1)],
        deployer.address
      ),
      Tx.contractCall(
        "nft-fractionalizer",
        "get-balance",
        [types.uint(1), types.principal(recipient.address)],
        deployer.address
      ),
      Tx.contractCall(
        "nft-fractionalizer",
        "get-token-uri",
        [types.uint(1)],
        deployer.address
      ),
    ])

    assertEquals(block.receipts[0].result, types.ok(types.uint(1)))

    const assets = chain.getAssetsMaps().assets
    assertEquals(assets[FRACTIONAL_NFT][deployer.address + CONTRACT], 1)
    assertEquals(assets[FRACTIONS][recipient.address], supply)

    assertEquals(block.receipts[1].result, types.ok(types.uint(100)))
    assertEquals(block.receipts[2].result, types.ok(types.uint(100)))
    assertEquals(block.receipts[3].result, types.ok(types.some(types.ascii(uri))))
  },
})
