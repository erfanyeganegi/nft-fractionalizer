(impl-trait .sft-trait.sft-trait)

(use-trait nft-trait .nft-trait.nft-trait)
(use-trait ft-trait .ft-trait.ft-trait)

(define-constant contract-owner tx-sender)

(define-fungible-token fractions)
(define-non-fungible-token fractional-nft uint)

(define-map balances 
  {
    id: uint,
    owner: principal
  }
  uint
)

(define-map supplies uint uint)

(define-map uris uint (string-ascii 256))

(define-map verified-contracts principal bool)

(define-data-var identifier uint u0)

(define-constant err-contract-owner-only (err u100))
(define-constant err-unauthorized (err u101))
(define-constant err-nft-owner-only (err u102))

(define-constant err-insufficient-balance (err u200))

(define-constant err-invalid-supply-value (err u300))

(define-constant err-unkown-nft-owner (err u400))
(define-constant err-unknown-nft-uri (err u401))
(define-constant err-unverified-nft-contract (err u403))

(define-read-only (is-verified-nft (nft <nft-trait>)) 
  (default-to false (map-get? verified-contracts (contract-of nft)))
)

(define-read-only (is-verified-ft (ft <ft-trait>)) 
  (default-to false (map-get? verified-contracts (contract-of ft)))
)

(define-read-only (get-balance (id uint) (who principal))
  (ok (default-to u0 (map-get? balances
    {
      id: id,
      owner: who
    }
  )))
)

(define-read-only (get-overall-balance (who principal))
  (ok (ft-get-balance fractions who))
)

(define-read-only (get-overall-supply) 
  (ok (ft-get-supply fractions))
)

(define-read-only (get-total-supply (id uint)) 
  (ok (default-to u0 (map-get? supplies id)))
)

(define-read-only (get-token-uri (id uint)) 
  (ok (default-to none (some (map-get? uris id))))
)

(define-read-only (get-decimals (id uint)) 
  (ok u0)
)

(define-public (verify-nft (nft <nft-trait>) (verified bool))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-contract-owner-only)
    (ok (map-set verified-contracts (contract-of nft) verified))
  )
)

(define-public (verify-ft (ft <ft-trait>) (verified bool))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-contract-owner-only)
    (ok (map-set verified-contracts (contract-of ft) verified))
  )
)

(define-public 
  (transfer 
    (id uint) 
    (amount uint) 
    (sender principal)
    (recipient principal)
  )
  (let 
    (
      (senderBalance (unwrap-panic (get-balance id sender)))
      (recipientBalance (unwrap-panic (get-balance id recipient)))
    )
    (asserts! (is-eq tx-sender sender) err-unauthorized)
    (asserts! (<= amount senderBalance) err-insufficient-balance)
    (try! (ft-transfer? fractions amount sender recipient))
    (map-set balances { id: id, owner: sender } (- senderBalance amount))
    (map-set balances { id: id, owner: recipient } (+ recipientBalance amount))
    (print 
      {
        type: "sft_transfer",
        token-id: id,
        amount: amount,
        sender: sender,
        recipient: recipient
      }
    )
    (ok true)
  )
)

(define-public 
  (transfer-memo
    (id uint) 
    (amount uint) 
    (sender principal)
    (recipient principal)
    (memo (buff 34))
  )
  (begin
    (try! (transfer id amount sender recipient))
    (print memo)
    (ok true)
  )
)

(define-public (mint (recipient principal) (supply uint) (uri (string-ascii 256))) 
  (let 
    (
      (nftID (+ (var-get identifier) u1))
    )
    (asserts! (is-eq tx-sender contract-owner) err-contract-owner-only)
    (asserts! (> supply u0) err-invalid-supply-value)
    (try! (ft-mint? fractions supply recipient))
    (try! (nft-mint? fractional-nft nftID (as-contract tx-sender)))
    (map-set supplies nftID supply)
    (map-set balances { id: nftID, owner: recipient } supply)
    (map-set uris nftID uri)
    (print 
      {
        type: "sft_mint",
        token-id: nftID,
        amount: supply,
        recipient: recipient
      }
    )
    (var-set identifier nftID)
    (ok nftID)
  )
)

(define-public (retract (id uint) (recipient principal)) 
  (let 
    (
      (balance (unwrap-panic (get-balance id recipient)))
      (supply (unwrap-panic (get-total-supply id)))
    )
    (asserts! (is-eq tx-sender recipient) err-unauthorized)
    (asserts! (is-eq balance supply) err-insufficient-balance)
    (as-contract (try! (nft-transfer? fractional-nft id tx-sender recipient)))
    (try! (ft-burn? fractions balance recipient))
    (map-delete balances { id: id, owner: recipient })
    (map-delete supplies id)
    (print 
      {
        type: "sft_burn",
        token-id: id,
        amount: balance,
        sender: recipient
      }
    )
    (ok true)
  )
)

(define-public 
  (fractionalize 
    (nft <nft-trait>)
    (id uint)
    (supply uint)
    (sender principal)
  )
  (let 
    (
      (nftID (+ (var-get identifier) u1))
      (nftOwner (unwrap! (try! (contract-call? nft get-owner id)) err-unkown-nft-owner))
      (nftURI (unwrap! (try! (contract-call? nft get-token-uri id)) err-unknown-nft-uri))
    )
    (asserts! (is-eq tx-sender sender) err-unauthorized)
    (asserts! (is-eq tx-sender nftOwner) err-nft-owner-only)
    (asserts! (is-verified-nft nft) err-unverified-nft-contract)
    (asserts! (> supply u0) err-invalid-supply-value)
    (try! (contract-call? nft transfer id sender (as-contract tx-sender)))
    (try! (ft-mint? fractions supply sender))
    (map-set supplies nftID supply)
    (map-set balances { id: nftID, owner: sender } supply)
    (map-set uris nftID nftURI)
    (print 
      {
        type: "sft_mint",
        token-id: nftID,
        amount: supply,
        recipient: sender
      }
    )
    (var-set identifier nftID)
    (ok nftID)
  )
)
