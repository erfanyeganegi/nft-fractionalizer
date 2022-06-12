(impl-trait .sft-trait.sft-trait)

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

(define-constant err-unauthorized (err u100))

(define-constant err-insufficient-balance (err u200))

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

(define-public 
  (transfer 
    (id uint) 
    (amount uint) 
    (sender principal)
    (recipient principal)
  )
  (let 
    (
      (balance (unwrap-panic (get-balance id sender)))
    )
    (asserts! (is-eq tx-sender sender) err-unauthorized)
    (asserts! (<= amount balance) err-insufficient-balance)
    (try! (ft-transfer? fractions amount sender recipient))
    (map-set balances 
      {
        id: id,
        owner: sender
      }
      (- balance amount)
    )
    (map-set balances 
      {
        id: id,
        owner: recipient
      }
      (+ (unwrap-panic (get-balance id sender)) amount)
    )
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