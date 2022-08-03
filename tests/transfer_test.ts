import { Chain, Clarinet, Tx, types } from "https://deno.land/x/clarinet@v0.33.0/index.ts"
import { assertEquals } from "https://deno.land/std@0.125.0/testing/asserts.ts"

/** constants */
import {
  CONTRACT,
  FRACTIONAL_NFT,
  FRACTIONS,
  ERR_NFT_OWNER_ONLY,
  ERR_UNALLOWED_RECIPIENT,
  ERR_INSUFFICIENT_BALANCE,
} from "./nft-fractionalizer-constants.ts"

const DEPLOYER_WALLET = "deployer"
const SENDER_WALLET = "sender"
const RECIPIENT_WALLET = "recipient"

const mint = (chain: Chain, recipient: string, supply: number, uri: string) => {
  return chain.mineBlock([
    Tx.contractCall(
      "nft-fractionalizer",
      "mint",
      [types.principal(recipient), types.uint(supply), types.ascii(uri)],
      recipient
    ),
  ])
}

Clarinet.test({
  name: "transfer: ensure that sender must be tx-sender",
  fn(chain, accounts) {
    const sender = accounts.get(SENDER_WALLET)!
    const recipient = accounts.get(RECIPIENT_WALLET)!

    const supply = 100
    const uri = "98a9d5cefa45be0b7e1d5eae8bff86e5e4bfda9075ece57b007dc404e74d16ea"
    const amount = 20

    mint(chain, sender.address, supply, uri)

    const block = chain.mineBlock([
      Tx.contractCall(
        "nft-fractionalizer",
        "transfer",
        [
          types.uint(1),
          types.uint(amount),
          types.principal(sender.address),
          types.principal(recipient.address),
        ],
        recipient.address
      ),
    ])

    assertEquals(block.receipts[0].result, ERR_NFT_OWNER_ONLY)

    const assets = chain.getAssetsMaps().assets
    assertEquals(assets[FRACTIONS][sender.address], supply)
    assertEquals(assets[FRACTIONS][recipient.address], undefined)
  },
})

Clarinet.test({
  name: "transfer: ensure that sender can not be recipient",
  fn(chain, accounts) {
    const sender = accounts.get(SENDER_WALLET)!
    const recipient = accounts.get(RECIPIENT_WALLET)!

    const supply = 100
    const uri = "98a9d5cefa45be0b7e1d5eae8bff86e5e4bfda9075ece57b007dc404e74d16ea"
    const amount = 20

    mint(chain, sender.address, supply, uri)

    const block = chain.mineBlock([
      Tx.contractCall(
        "nft-fractionalizer",
        "transfer",
        [
          types.uint(1),
          types.uint(amount),
          types.principal(sender.address),
          types.principal(sender.address),
        ],
        sender.address
      ),
    ])

    assertEquals(block.receipts[0].result, ERR_UNALLOWED_RECIPIENT)

    const assets = chain.getAssetsMaps().assets
    assertEquals(assets[FRACTIONS][sender.address], supply)
    assertEquals(assets[FRACTIONS][recipient.address], undefined)
  },
})

Clarinet.test({
  name: "transfer: ensure that sender has enough amount of fractions",
  fn(chain, accounts) {
    const sender = accounts.get(SENDER_WALLET)!
    const recipient = accounts.get(RECIPIENT_WALLET)!

    const supply = 100
    const uri = "98a9d5cefa45be0b7e1d5eae8bff86e5e4bfda9075ece57b007dc404e74d16ea"
    const amount = 120

    mint(chain, sender.address, supply, uri)

    const block = chain.mineBlock([
      Tx.contractCall(
        "nft-fractionalizer",
        "transfer",
        [
          types.uint(1),
          types.uint(amount),
          types.principal(sender.address),
          types.principal(recipient.address),
        ],
        sender.address
      ),
    ])

    assertEquals(block.receipts[0].result, ERR_INSUFFICIENT_BALANCE)

    const assets = chain.getAssetsMaps().assets
    assertEquals(assets[FRACTIONS][sender.address], supply)
    assertEquals(assets[FRACTIONS][recipient.address], undefined)
  },
})

Clarinet.test({
  name: "transfer: ensure that sender can not transfer 0 fractions",
  fn(chain, accounts) {
    const sender = accounts.get(SENDER_WALLET)!
    const recipient = accounts.get(RECIPIENT_WALLET)!

    const supply = 100
    const uri = "98a9d5cefa45be0b7e1d5eae8bff86e5e4bfda9075ece57b007dc404e74d16ea"
    const amount = 0

    mint(chain, sender.address, supply, uri)

    const block = chain.mineBlock([
      Tx.contractCall(
        "nft-fractionalizer",
        "transfer",
        [
          types.uint(1),
          types.uint(amount),
          types.principal(sender.address),
          types.principal(recipient.address),
        ],
        sender.address
      ),
    ])

    assertEquals(block.receipts[0].result, types.err(types.uint(3)))

    const assets = chain.getAssetsMaps().assets
    assertEquals(assets[FRACTIONS][sender.address], supply)
    assertEquals(assets[FRACTIONS][recipient.address], undefined)
  },
})

Clarinet.test({
  name: "transfer: ensure that transfer is successful and data maps are updated",
  fn(chain, accounts) {
    const deployer = accounts.get(DEPLOYER_WALLET)!
    const sender = accounts.get(SENDER_WALLET)!
    const recipient = accounts.get(RECIPIENT_WALLET)!

    const supply = 100
    const uri = "98a9d5cefa45be0b7e1d5eae8bff86e5e4bfda9075ece57b007dc404e74d16ea"
    const amount = 20

    mint(chain, sender.address, supply, uri)

    const block = chain.mineBlock([
      Tx.contractCall(
        "nft-fractionalizer",
        "transfer",
        [
          types.uint(1),
          types.uint(amount),
          types.principal(sender.address),
          types.principal(recipient.address),
        ],
        sender.address
      ),
      Tx.contractCall(
        "nft-fractionalizer",
        "get-balance",
        [types.uint(1), types.principal(sender.address)],
        deployer.address
      ),
      Tx.contractCall(
        "nft-fractionalizer",
        "get-balance",
        [types.uint(1), types.principal(recipient.address)],
        deployer.address
      ),
    ])

    assertEquals(block.receipts[0].result, types.ok(types.bool(true)))

    const assets = chain.getAssetsMaps().assets
    assertEquals(assets[FRACTIONS][sender.address], supply - amount)
    assertEquals(assets[FRACTIONS][recipient.address], amount)

    assertEquals(block.receipts[1].result, types.ok(types.uint(supply - amount)))
    assertEquals(block.receipts[2].result, types.ok(types.uint(amount)))
  },
})
