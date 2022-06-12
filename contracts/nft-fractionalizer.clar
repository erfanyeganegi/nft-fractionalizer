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
  (ok none)
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
  (ok true)
)

(define-public 
  (transfer-memo
    (id uint) 
    (amount uint) 
    (sender principal)
    (recipient principal)
    (memo (buff 34))
  )
  (ok true)
)