# FanPass — Phase 4 Blockchain Architecture

**Status: design only. No `.sol` files exist yet. Nothing in this document has been implemented.**
Per explicit instruction, this is the architecture for review — implementation begins contract-by-contract
only after this is approved, starting with `OwnershipRegistry`.

Role assumed for this document: Principal Blockchain Engineer / Smart Contract Auditor / Injective Core
Developer designing the trust layer for an existing, already-shipped product (Phases 1–3 are live —
verification, marketplace, and wallet all work today against a local off-chain store). This is not a
greenfield blockchain project; it's wiring a chain underneath a working system without breaking it.

---

## 0. The one architectural change this document makes

The original `docs/ARCHITECTURE.md` §5 speculated **five** contracts (`OwnershipRegistry`, `Escrow`,
`Marketplace`, `TrustRegistry`, `AttendanceRegistry`). This document **replaces that with three**:

| Dropped / merged | Where its job goes |
|---|---|
| `TrustRegistry` (anchored a hash of trust checkpoints for auditability) | Absorbed into `OwnershipRegistry.verificationHash` — the verification report is already hashed and anchored at mint time. A dedicated contract just to anchor a hash *of something already anchored* is duplicated storage, which is explicitly what we're avoiding. |
| `Escrow` + `Marketplace` (two contracts, tightly coupled — a listing has at most one active escrow, exactly like the off-chain `marketplaceListings.escrow` field) | Merged into one `EscrowMarketplace` contract. They were never independently reusable — nothing else in the system calls `Escrow` except `Marketplace`, so splitting them was two contracts pretending to be modular while sharing one lifecycle. |

Three contracts remain, and each maps to a decision that genuinely benefits from a chain — an
immutable, third-party-verifiable fact — not to "using blockchain because we can":

1. **Who owns this ticket, provably** (`OwnershipRegistry`)
2. **Whose money is whose, provably, mid-transaction** (`EscrowMarketplace`)
3. **Did this person actually show up, provably** (`AttendanceRegistry`)

Everything else — OCR text, fraud scores, pricing bands, seller reputation, trust score breakdowns, images,
PDFs — stays exactly where it already lives: the off-chain store (`apps/api/data/`, see
`apps/api/src/config/localStore.ts`), reachable through the same repository interfaces the app already
uses. **Nothing about that persistence layer changes in this phase.** What changes is *what the Trust
Engine treats as the source of truth* for three specific facts (see §14).

---

## 1. Design philosophy: what actually deserves a chain

A fact belongs on-chain only if **all** of these hold:

- It must be **provable to a party who doesn't trust FanPass's backend** (a buyer verifying a seller
  really owns the ticket; an auditor confirming funds were actually locked; a venue confirming a ticket
  hasn't already been used elsewhere).
- It changes **rarely** relative to how often it's read, and each change is a meaningful state
  transition (not a progress tick).
- Storing it **off-chain would let the operator lie** about it undetected (ownership, fund custody,
  attendance — all classic "the app could just edit its own database" risks).

Everything that fails this test stays off-chain:

| Off-chain (unchanged) | Why |
|---|---|
| OCR text, fraud tamper score, pricing bands, agent confidence/flags | Probabilistic AI output — re-computable, not a fact to notarize, and expensive to store on-chain for no verifiability gain |
| Trust Score number + badge breakdown | Derived, recomputed on demand from `verificationReports` — a *number* isn't a fact a chain can independently verify anyway |
| Seller reputation tier/score | Same — derived from `users/{address}.stats`, which itself derives from on-chain `TicketPurchased` events (see §14) |
| Images, PDFs, QR screenshots | Large binary data; chains store hashes, not files |
| Event name/venue/date/seat text | Free-form strings with no adversarial-trust requirement; a `metadataHash` anchors *that* the off-chain copy hasn't been quietly edited, without paying to store the copy itself |

What goes on-chain is deliberately small: **hashes, addresses, enums, and timestamps** — the minimum
needed so nobody (including FanPass) can rewrite history.

---

## 2. Contract architecture overview

```
                              FanPass Trust Layer (Injective EVM Testnet)

        ┌────────────────────┐        ┌────────────────────┐        ┌────────────────────┐
        │  OwnershipRegistry  │◄──────►│  EscrowMarketplace  │        │ AttendanceRegistry │
        │  (ERC-721)          │        │                     │        │                     │
        │                     │        │  MARKETPLACE_ROLE   │        │  ATTENDANCE_ROLE    │
        │  VERIFIER_ROLE ─────┼───┐    │  granted on         │───────►│  granted on         │
        │  (Trust Engine      │   │    │  OwnershipRegistry  │        │  OwnershipRegistry  │
        │   signer)           │   │    └─────────┬───────────┘        └─────────┬───────────┘
        └──────────┬──────────┘   │              │ IERC20 (USDC)                │
                   │              │              ▼                              │
                   │              │      ┌──────────────┐                      │
                   │              │      │  USDC token   │                      │
                   │              │      │  (Circle,     │                      │
                   │              │      │  bridged via  │                      │
                   │              │      │  CCTP if      │                      │
                   │              │      │  cross-chain) │                      │
                   │              │      └──────────────┘                      │
                   │              │                                            │
                   ▼              ▼                                            ▼
              status: Active   status: Listed →              status: CheckedIn
              (post-verify)    InEscrow → Sold
```

**Dependency direction matters**: `EscrowMarketplace` and `AttendanceRegistry` both depend on
`OwnershipRegistry`'s interface (`IOwnershipRegistry`) to read/mutate ticket status. `OwnershipRegistry`
depends on **neither** of them — it only knows about *roles* it has granted out, never their concrete
addresses or logic. This is what makes each one independently replaceable later (e.g. swapping
`EscrowMarketplace` for a v2 with a different fee model touches zero lines of `OwnershipRegistry`).

No contract holds another contract's storage. No contract re-derives a fact another contract already
owns (e.g. `EscrowMarketplace` never stores "who owns this ticket" — it asks `OwnershipRegistry.ownerOf()`
every time).

---

## 3. `OwnershipRegistry` — the ledger of truth for who owns what

An ERC-721 (OpenZeppelin `ERC721` + `AccessControl` + `Pausable`), one token per verified ticket. The
frontend must never call this "an NFT" — it's the **Ownership Certificate**, full stop.

### 3.1 Why ERC-721 and not a bespoke mapping

Because "who owns token N" is a solved, audited problem (`_owners` mapping, `ownerOf`, `balanceOf`,
`Transfer` event) — reimplementing it would be exactly the kind of unaudited custom code a reviewer
would flag first. We restrict *when* transfers can happen (see 3.4), not *how* ownership is tracked.

### 3.2 Deriving `tokenId` from the off-chain `ticketId`

Off-chain ticket IDs are UUIDs (strings), not sequential integers. Rather than maintaining a second
counter and a mapping in both directions, the token ID is **deterministic**:

```solidity
tokenId = uint256(keccak256(abi.encodePacked(ticketId)))
```

Any party — frontend, indexer, a third-party auditor — can compute a ticket's `tokenId` from its
off-chain ID alone, without an on-chain lookup. `ticketId` itself is never stored on-chain (it's a
Firestore-style string, not a fact worth anchoring); only its hash is used as the token identity.

### 3.3 Storage (packed for gas — see §7 for the full layout table)

```solidity
enum TicketStatus {
    Unregistered,   // 0 — default, token doesn't exist
    Active,         // 1 — verified, not listed, owned by original verified party
    Listed,         // 2 — active listing exists in EscrowMarketplace
    InEscrow,       // 3 — a buyer has funded escrow, awaiting release
    Sold,           // 4 — ownership transferred via EscrowMarketplace
    CheckedIn,      // 5 — AttendanceRegistry marked venue entry
    Revoked         // 6 — verifier revoked (fraud found post-mint, dispute lost, etc.)
}

struct TicketRecord {
    bytes32 verificationHash; // hash of the off-chain verificationReport at mint time
    bytes32 metadataHash;     // hash of {eventName, venue, eventDate, seatInfo} — tamper-evidence only
    bytes32 qrHash;           // from the QR Agent — duplicate-detection anchor, matches off-chain qrHash
    TicketStatus status;
    uint64  mintedAt;
    uint64  updatedAt;
}

mapping(uint256 tokenId => TicketRecord) private _records;
mapping(bytes32 ticketKey => bool) private _registered; // O(1) duplicate-registration guard
```

**Not stored**: `currentOwner` (that's `ERC721.ownerOf(tokenId)` — storing it twice is exactly the
duplicated-storage smell to avoid), images, PDFs, trust score, OCR output, seller/buyer history beyond
what `Transfer` events already give an indexer.

### 3.4 Transfer restriction — the one non-standard piece

Ownership Certificates **cannot** be moved via raw `transferFrom`/`safeTransferFrom` by an arbitrary
holder. The only paths that move a token are:

- `registerTicket` (mint, `VERIFIER_ROLE` only)
- `completeSale` (`MARKETPLACE_ROLE` only — called by `EscrowMarketplace` inside `releaseEscrow`)
- `revoke` (burn, `VERIFIER_ROLE` only)

`_update` (OZ v5's transfer hook) is overridden to revert with `TransferRestricted()` for any caller that
isn't the contract itself acting through one of the above entry points. This guarantees `status` can
never desync from actual ownership — there is no code path where a token moves without the registry
itself recording *why*.

### 3.5 Interface

```solidity
interface IOwnershipRegistry {
    function registerTicket(
        bytes32 ticketKey,
        address owner,
        bytes32 verificationHash,
        bytes32 metadataHash,
        bytes32 qrHash
    ) external returns (uint256 tokenId);

    function revoke(uint256 tokenId, string calldata reason) external;

    // State transitions — each callable only by the role that legitimately drives it
    function markListed(uint256 tokenId) external;                          // MARKETPLACE_ROLE
    function markInEscrow(uint256 tokenId) external;                        // MARKETPLACE_ROLE
    function markUnlisted(uint256 tokenId) external;                        // MARKETPLACE_ROLE (cancel/expire/refund)
    function completeSale(uint256 tokenId, address from, address to) external; // MARKETPLACE_ROLE
    function markCheckedIn(uint256 tokenId) external;                       // ATTENDANCE_ROLE

    // Views
    function statusOf(uint256 tokenId) external view returns (TicketStatus);
    function verificationHashOf(uint256 tokenId) external view returns (bytes32);
    function tokenIdFor(bytes32 ticketKey) external view returns (uint256);
    function isRegistered(bytes32 ticketKey) external view returns (bool);
}
```

### 3.6 Events

```solidity
event TicketRegistered(uint256 indexed tokenId, bytes32 indexed ticketKey, address indexed owner, bytes32 verificationHash, bytes32 metadataHash, bytes32 qrHash, uint256 timestamp);
event StatusChanged(uint256 indexed tokenId, TicketStatus previousStatus, TicketStatus newStatus, uint256 timestamp);
event OwnershipTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 timestamp); // fired alongside the standard ERC-721 `Transfer`, carrying explicit context for the indexer
event TicketRevoked(uint256 indexed tokenId, string reason, uint256 timestamp);
```

### 3.7 Custom errors

```solidity
error TicketAlreadyRegistered(bytes32 ticketKey);
error TicketNotRegistered(uint256 tokenId);
error InvalidStatusTransition(TicketStatus from, TicketStatus to);
error TicketIsRevoked(uint256 tokenId);
error TransferRestricted();
error ZeroAddress();
error Unauthorized(bytes32 requiredRole, address caller);
```

### 3.8 Roles

| Role | Granted to | Can do |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Ops multisig (Gnosis Safe on Injective EVM Testnet) | Grant/revoke all other roles, pause/unpause |
| `VERIFIER_ROLE` | Trust Engine's backend signer (one hot wallet, rotated via multisig if compromised) | `registerTicket`, `revoke` |
| `MARKETPLACE_ROLE` | The deployed `EscrowMarketplace` contract address | `markListed`, `markInEscrow`, `markUnlisted`, `completeSale` |
| `ATTENDANCE_ROLE` | The deployed `AttendanceRegistry` contract address | `markCheckedIn` |

---

## 4. `EscrowMarketplace` — listings, funds, settlement

One contract, because a listing and its escrow share one lifecycle and neither is meaningful without the
other (mirrors the off-chain `MarketplaceListing.escrow` being an embedded field, not a separate
collection — see `packages/shared/src/types/entities.ts`).

### 4.1 Storage

```solidity
enum ListingStatus { None, Active, PendingEscrow, Sold, Cancelled, Expired }
enum EscrowState   { None, Funded, Released, Refunded, Disputed }

struct Listing {
    uint256 tokenId;
    address seller;
    uint256 price;      // USDC, 6 decimals
    uint64  createdAt;
    uint64  expiresAt;  // 0 = no expiry
    ListingStatus status;
}

struct Escrow {
    address buyer;
    uint256 amount;
    EscrowState state;
    uint64  fundedAt;
}

mapping(uint256 listingId => Listing) private _listings;
mapping(uint256 listingId => Escrow)  private _escrows;      // 1:1 with listing, matches off-chain shape
mapping(uint256 tokenId    => uint256) private _activeListingOf; // duplicate-active-listing guard
uint256 private _nextListingId;

IERC20 public immutable USDC;
IOwnershipRegistry public immutable REGISTRY;
uint64 public constant DISPUTE_WINDOW = 3 days; // after this, anyone can force-release an unresolved dispute
```

### 4.2 Interface

```solidity
interface IEscrowMarketplace {
    function createListing(uint256 tokenId, uint256 price, uint64 expiresAt) external returns (uint256 listingId);
    function cancelListing(uint256 listingId) external;
    function reclaimExpired(uint256 listingId) external;

    function buy(uint256 listingId, uint256 amount) external;          // pulls USDC, funds escrow
    function releaseEscrow(uint256 listingId) external;                // settles: NFT to buyer, USDC to seller
    function refundBuyer(uint256 listingId) external;                  // returns USDC, unlists token

    function raiseDispute(uint256 listingId, string calldata reason) external;
    function resolveDispute(uint256 listingId, bool refundToBuyer) external; // ARBITER_ROLE

    function listingOf(uint256 tokenId) external view returns (uint256 listingId);
    function getListing(uint256 listingId) external view returns (Listing memory);
    function getEscrow(uint256 listingId) external view returns (Escrow memory);
}
```

### 4.3 Why `buy()` and `releaseEscrow()` stay separate calls (not one atomic tx)

For a plain same-chain USDC payment they *could* be atomic — pull funds, transfer the NFT, pay the
seller, all in one transaction, with no real "funded but not yet released" window. They're kept separate
because two real cases need that window:

1. **CCTP cross-chain buys** (§16.1): the buyer's USDC arrives via Circle's bridge asynchronously —
   "funded" and "settled" are genuinely different points in time, not just different function calls.
2. **Disputes**: a buyer needs a window to flag a problem *before* the seller is paid. Collapsing lock
   and release into one transaction removes that window entirely.

For the common case (same-chain, no dispute), the backend calls `releaseEscrow` immediately after `buy()`
confirms — functionally near-instant, but the state machine stays honest about the two distinct facts
it's recording.

This exactly mirrors what's already built: `apps/api/src/trustEngine/marketplace.ts` already implements
`openEscrow()` then `releaseEscrow()` as two distinct functions called back-to-back by
`marketplaceService.buyListing()`. That code was deliberately written "structured exactly like the real
`Escrow.sol` interaction will look" — this design keeps that promise. Phase 4 replaces the *body* of those
two functions with contract calls; it doesn't change their signatures or the fact that there are two of
them.

### 4.4 Security properties, mapped to the actual attack

| Threat | Mitigation |
|---|---|
| Reentrancy on `buy`/`releaseEscrow`/`refundBuyer` | `nonReentrant` (OZ `ReentrancyGuard`) + Checks-Effects-Interactions: state (`status`, `escrow.state`) is updated *before* any external call (`USDC.safeTransferFrom`, `REGISTRY.completeSale`) |
| Double purchase | `buy()` requires `listing.status == Active`; the first successful call flips it to `PendingEscrow` before the external USDC call returns, so a reentrant or racing second `buy()` reverts on the status check |
| Self-buy | `require(msg.sender != listing.seller)` |
| Duplicate active listing | `_activeListingOf[tokenId] != 0` check in `createListing` |
| Underpayment/overpayment | `require(amount == listing.price)` — exact match only, no partial fills |
| Expired listing purchase | `buy()` checks `block.timestamp < listing.expiresAt \|\| listing.expiresAt == 0` |
| Escrow bypass (buyer/seller trying to move the NFT directly) | `OwnershipRegistry`'s transfer restriction (§3.4) — there is no path to move the token except through this contract's `completeSale` call |
| Ownership spoofing at listing time | `createListing` requires `REGISTRY.ownerOf(tokenId) == msg.sender` |
| Stuck funds if backend keeper goes offline mid-dispute | `DISPUTE_WINDOW` — after 3 days in `Disputed` state, either party can call a `forceResolve` that defaults to refund (buyer-favorable, since the seller already has the option to have shipped nothing beyond a certificate) |
| Front-running a listing cancellation with a buy | Not meaningfully exploitable here — a completed `buy()` before `cancelListing()` lands is a valid sale, not an attack (no MEV-extractable price difference since price is fixed at listing time, not an AMM) |

### 4.5 Events

```solidity
event ListingCreated(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller, uint256 price, uint64 expiresAt);
event ListingCancelled(uint256 indexed listingId);
event ListingExpired(uint256 indexed listingId);
event FundsLocked(uint256 indexed listingId, address indexed buyer, uint256 amount);
event FundsReleased(uint256 indexed listingId, address indexed seller, uint256 amount);
event BuyerRefunded(uint256 indexed listingId, address indexed buyer, uint256 amount);
event TicketPurchased(uint256 indexed listingId, uint256 indexed tokenId, address indexed buyer, address seller, uint256 price);
event DisputeRaised(uint256 indexed listingId, address indexed raisedBy, string reason);
event DisputeResolved(uint256 indexed listingId, bool refundedToBuyer);
```

### 4.6 Custom errors

```solidity
error ListingNotActive(uint256 listingId);
error NotSeller(uint256 listingId, address caller);
error SelfBuyNotAllowed();
error PriceMismatch(uint256 expected, uint256 provided);
error DuplicateActiveListing(uint256 tokenId, uint256 existingListingId);
error ListingExpiredError(uint256 listingId);
error ListingNotExpired(uint256 listingId);
error EscrowNotFunded(uint256 listingId);
error DisputeWindowNotElapsed(uint256 listingId, uint64 readyAt);
error NotOwnerOfToken(uint256 tokenId, address caller);
```

---

## 5. `AttendanceRegistry` — minimal, deliberately unfinished

The smallest of the three, exactly as instructed: a foundation for badges/memory cards/collectibles
later, not those features themselves.

### 5.1 Storage

```solidity
struct AttendanceRecord {
    address attendee;
    bytes32 venueHash;  // keccak256 of the venue identifier — keeps the venue string off-chain
    uint64  checkedInAt;
}

mapping(uint256 tokenId => AttendanceRecord) private _attendance;
mapping(uint256 tokenId => bool) private _hasAttended;

IOwnershipRegistry public immutable REGISTRY;
```

### 5.2 Interface

```solidity
interface IAttendanceRegistry {
    function checkIn(uint256 tokenId, bytes32 venueHash) external; // VENUE_VERIFIER_ROLE
    function hasAttended(uint256 tokenId) external view returns (bool);
    function attendanceOf(uint256 tokenId) external view returns (AttendanceRecord memory);
}
```

### 5.3 Events

```solidity
event AttendanceMarked(uint256 indexed tokenId, address indexed attendee, bytes32 venueHash, uint256 timestamp);
```

### 5.4 Custom errors

```solidity
error AlreadyAttended(uint256 tokenId);
error TicketNotOwnedByCaller(uint256 tokenId); // defense-in-depth; primary check is REGISTRY.ownerOf
```

### 5.5 Explicitly deferred (not this phase)

Badges, Memory Cards, and Collectibles are **separate future contracts** that subscribe to
`AttendanceMarked` (via the off-chain indexer, or later a direct on-chain hook) rather than being built
into this contract. Keeping `AttendanceRegistry` this small means it never needs to change shape when
those features arrive — they're additive, not migrations.

---

## 6. NFT / Ownership Certificate framing

- The contract is `ERC721`-compliant (wallets, block explorers, and any future secondary tooling see a
  standard NFT) — but **the product never calls it one**. Frontend copy: "Ownership Certificate," never
  "NFT" or "token."
- `tokenURI` returns an off-chain metadata endpoint (`https://api.fanpass.app/certificates/{tokenId}`)
  serving JSON built from `apps/api`'s existing repositories — never on-chain JSON, never base64-inlined
  images. The endpoint itself has no new data to source: it's the existing `Ticket` + `OwnershipCertificate`
  shapes, serialized as ERC-721 metadata for wallet compatibility only.
- No royalties, no marketplace-standard `ERC2981` — FanPass's fee model (if any) lives in
  `EscrowMarketplace`, not in a secondary-market royalty standard nobody but FanPass's own contract
  will ever honor anyway.

---

## 7. Storage layout summary (gas-packing)

Solidity packs consecutive storage variables smaller than 32 bytes into the same slot where possible.
Each struct below is ordered so that happens automatically:

| Struct | Slot 0 | Slot 1 | Slot 2 |
|---|---|---|---|
| `TicketRecord` | `verificationHash` (32B) | `metadataHash` (32B) | `qrHash` (32B) + `status` (1B) + `mintedAt` (8B) + `updatedAt` (8B) → fits one slot with room to spare |
| `Listing` | `tokenId` (32B) | `seller` (20B) + `status` (1B) — packed | `price` (32B)... `createdAt`+`expiresAt` (8B+8B) packed into a 4th slot |
| `Escrow` | `buyer` (20B) + `state` (1B) packed | `amount` (32B) | `fundedAt` (8B) |
| `AttendanceRecord` | `attendee` (20B) + `checkedInAt` (8B) packed | `venueHash` (32B) | — |

Each contract's storage is a flat set of mappings keyed by `tokenId`/`listingId` — no nested structs
across contracts, no contract reading another's raw storage slot (only through its interface's view
functions), per "avoid duplicated storage."

---

## 8. Sequence diagrams

### 8.1 Verify → Mint (Phase 2/3 flow, Phase 4 ending)

```
Seller        apps/web         apps/api (Trust Engine)      OwnershipRegistry        Indexer → local store
  │  upload ticket   │                    │                          │                        │
  ├─────────────────►│                    │                          │                        │
  │                  │  POST /tickets     │                          │                        │
  │                  ├───────────────────►│                          │                        │
  │                  │                    │ runs 6 agents (unchanged)│                        │
  │                  │                    │ computeTrustScore()      │                        │
  │                  │                    │ passed? ─────────────────┤                        │
  │                  │                    │ registerTicket(          │                        │
  │                  │                    │   ticketKey, seller,     │                        │
  │                  │                    │   verificationHash,      │                        │
  │                  │                    │   metadataHash, qrHash)  │                        │
  │                  │                    ├─────────────────────────►│                        │
  │                  │                    │                          │ mint, status=Active     │
  │                  │                    │                          ├───────────────────────►│ TicketRegistered event
  │                  │                    │                          │                        │ indexer writes
  │                  │                    │◄─────────────────────────┤                        │ ownershipCertificates/{ticketId}
  │                  │  201 + tokenId     │  tx hash returned         │                        │ (currentOwner, mintedAt)
  │                  │◄───────────────────┤                          │                        │
```

### 8.2 List → Buy → Release (same-chain, no dispute)

```
Seller     Buyer      apps/api            EscrowMarketplace      OwnershipRegistry     USDC
  │ list @ price │        │                       │                       │              │
  ├─────────────►│        │                       │                       │              │
  │              │ createListing(tokenId, price)  │                       │              │
  │              ├───────────────────────────────►│ requires ownerOf==sender             │
  │              │                       │         │──────────────────────►│ markListed  │
  │              │        │  ListingCreated event  │                       │              │
  │              │        │◄──────────────────────┤                       │              │
  │              │        │                        │                      │              │
  │              │  buy(listingId, price)          │                      │              │
  │              │        ├───────────────────────►│  USDC.transferFrom(buyer, this, amt) │
  │              │        │                        │──────────────────────────────────────►│
  │              │        │                        │──────────────────────►│ markInEscrow │
  │              │        │  FundsLocked event      │                      │              │
  │              │        │◄───────────────────────┤                      │              │
  │              │        │                        │                      │              │
  │              │  releaseEscrow(listingId)  ◄──── apps/api calls immediately (no dispute)
  │              │        ├───────────────────────►│  completeSale(tokenId, seller, buyer) │
  │              │        │                        │──────────────────────►│ Transfer NFT │
  │              │        │                        │  USDC.transfer(seller, amt)          │
  │              │        │                        │──────────────────────────────────────►│
  │              │        │ FundsReleased +         │                      │              │
  │              │        │ TicketPurchased events  │                      │              │
  │              │        │◄───────────────────────┤                      │              │
  │              │        │  indexer updates users/{seller}.stats.ticketsSold++           │
  │              │        │  users/{buyer}.stats.ticketsBought++, recompute reputation     │
```

### 8.3 Venue check-in

```
Venue staff device        AttendanceRegistry        OwnershipRegistry       Indexer
  │  checkIn(tokenId, venueHash)  │                          │                 │
  ├──────────────────────────────►│  requires !hasAttended    │                 │
  │                               │──────────────────────────►│ markCheckedIn  │
  │                               │  AttendanceMarked event    │                 │
  │                               ├─────────────────────────────────────────────►│ writes attendance/{id}
```

---

## 9. Deployment architecture

### 9.1 Dependency graph & order

```
1. OwnershipRegistry.deploy(adminAddress)
2. EscrowMarketplace.deploy(ownershipRegistryAddress, usdcAddress, adminAddress)
3. AttendanceRegistry.deploy(ownershipRegistryAddress, adminAddress)
4. OwnershipRegistry.grantRole(MARKETPLACE_ROLE, escrowMarketplaceAddress)
5. OwnershipRegistry.grantRole(ATTENDANCE_ROLE, attendanceRegistryAddress)
6. OwnershipRegistry.grantRole(VERIFIER_ROLE, trustEngineSignerAddress)
7. AttendanceRegistry.grantRole(VENUE_VERIFIER_ROLE, venueSignerAddress)
```

Steps 1–3 can't be reordered (2 and 3 need 1's address). Steps 4–7 must happen after 1–3 and before any
real traffic — a deploy script should do all seven in one Hardhat script, not as manual console steps.

### 9.2 Constructor parameters

| Contract | Params |
|---|---|
| `OwnershipRegistry` | `address admin` |
| `EscrowMarketplace` | `address ownershipRegistry, address usdc, address admin` |
| `AttendanceRegistry` | `address ownershipRegistry, address admin` |

### 9.3 Network configuration

```ts
// hardhat.config.ts (addition)
networks: {
  injectiveTestnet: {
    url: process.env.INJECTIVE_EVM_TESTNET_RPC, // matches packages/shared/src/constants/chain.ts
    chainId: 1439,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
  },
}
```

`packages/shared/src/constants/chain.ts` already defines `INJECTIVE_EVM_TESTNET` (id, RPC, explorer) —
`apps/contracts` imports the *same* constant rather than redefining chain id/RPC a third time.

### 9.4 Environment variables (new)

```bash
# apps/contracts/.env
DEPLOYER_PRIVATE_KEY=
INJECTIVE_EVM_TESTNET_RPC=https://k8s.testnet.json-rpc.injective.network/
USDC_TOKEN_ADDRESS=          # testnet USDC (or a deployed mock ERC20 for early testing)
BLOCKSCOUT_API_KEY=          # for contract verification, if required

# apps/api/.env (additions)
OWNERSHIP_REGISTRY_ADDRESS=
ESCROW_MARKETPLACE_ADDRESS=
ATTENDANCE_REGISTRY_ADDRESS=
TRUST_ENGINE_SIGNER_PRIVATE_KEY=   # the VERIFIER_ROLE hot wallet — never the admin/multisig key
```

### 9.5 Deployment scripts

```
apps/contracts/scripts/
├── 01-deploy-ownership-registry.ts
├── 02-deploy-escrow-marketplace.ts
├── 03-deploy-attendance-registry.ts
├── 04-grant-roles.ts
├── deploy-all.ts        # runs 01-04 in order, writes addresses to deployments/<network>.json
└── verify.ts             # Blockscout verification for all three, reading deployments/<network>.json
```

`deployments/<network>.json` is the single file `apps/api/src/web3/` reads addresses from at boot —
no addresses hardcoded in application code.

---

## 10. Security model

Beyond the per-contract tables in §3.7/4.4/5.4:

- **Pausable** (`OwnershipRegistry`, `EscrowMarketplace`): admin-only circuit breaker. Pausing
  `OwnershipRegistry` freezes minting/transfers/status-changes; pausing `EscrowMarketplace` freezes new
  listings and purchases but **not** `refundBuyer` — buyers must always be able to get funds back even
  during an incident.
- **No `delegatecall`, no inline assembly** anywhere in v1 — the entire attack surface a static analyzer
  (Slither) needs to cover is standard OZ patterns plus the three contracts' own state machines.
- **Access control is role-based, never `tx.origin`, never a single hardcoded owner address** — every
  privileged action checks a named role, so rotating the Trust Engine signer or replacing the Marketplace
  contract is a `grantRole`/`revokeRole` pair, not a redeploy.
- **All external calls happen last** (CEI) in every state-mutating function — verified explicitly in the
  test suite (§12) with a malicious-reentrant-USDC mock.
- **Custom errors everywhere**, no revert strings — cheaper, and each error carries the exact failing
  values (e.g. `PriceMismatch(uint256 expected, uint256 provided)`) rather than a string a caller has to
  parse.

---

## 11. Gas optimization notes

- Deterministic `tokenId` (§3.2) avoids a storage slot for a counter *and* a second mapping for reverse
  lookup.
- Structs packed per §7 — `TicketRecord`, `Listing`, `Escrow`, `AttendanceRecord` all fit in 2–3 slots
  instead of 4–6 unpacked.
- `immutable` for `USDC`/`REGISTRY` addresses in `EscrowMarketplace`/`AttendanceRegistry` — read as
  bytecode constants, not `SLOAD`.
- Custom errors instead of `require(cond, "string")` — no string storage/copying cost on revert.
- Events over storage for anything the indexer needs but the contract itself never reads back (e.g. a
  dispute's `reason` string lives only in the `DisputeRaised` event, never in contract storage).

---

## 12. Testing strategy

Hardhat + Chai/Mocha for the full suite (consistent with the existing `apps/contracts` scaffold decision);
Foundry fuzz tests as an optional addition for `EscrowMarketplace`'s numeric invariants (price/amount
matching) if time allows — not required for v1.

| Layer | Coverage |
|---|---|
| **Unit — OwnershipRegistry** | mint success/duplicate-reject, status transitions (valid and invalid), transfer restriction (raw `transferFrom` reverts for non-privileged callers), revoke burns and blocks further transitions, role-gating on every mutator |
| **Unit — EscrowMarketplace** | create/cancel/expire listing, buy happy path, price mismatch reject, self-buy reject, duplicate active listing reject, double-buy reject (second `buy()` on same listing reverts), release happy path, refund happy path, dispute raise/resolve both directions, dispute-window force-resolve |
| **Unit — AttendanceRegistry** | check-in happy path, duplicate check-in reject, unauthorized caller reject |
| **Integration** | full lifecycle: register → list → buy → release → check-in, asserting state and emitted events at every step against a single deployed trio of contracts |
| **Security** | reentrancy attempt via a malicious ERC20 mock (`transferFrom` calls back into `buy`/`releaseEscrow`), access-control fuzzing (random addresses attempting every privileged function), pause behavior (verify `refundBuyer` still works while paused) |
| **Edge cases** | zero-address checks, zero-amount checks, listing exactly at expiry boundary (`block.timestamp == expiresAt`), escrow release exactly at dispute-window boundary |

**Mock deployment**: a `MockUSDC.sol` (simple mintable ERC20) for local Hardhat network tests — never
deployed anywhere real.

**Testnet deployment**: Injective EVM Testnet, using a testnet USDC faucet if Circle provides one there,
else `MockUSDC` deployed once and treated as "testnet USDC" for the duration of the hackathon build.

---

## 13. Folder structure

```
apps/contracts/
├── contracts/
│   ├── interfaces/
│   │   ├── IOwnershipRegistry.sol
│   │   ├── IEscrowMarketplace.sol
│   │   └── IAttendanceRegistry.sol
│   ├── OwnershipRegistry.sol
│   ├── EscrowMarketplace.sol
│   ├── AttendanceRegistry.sol
│   └── mocks/
│       └── MockUSDC.sol
├── scripts/
│   ├── 01-deploy-ownership-registry.ts
│   ├── 02-deploy-escrow-marketplace.ts
│   ├── 03-deploy-attendance-registry.ts
│   ├── 04-grant-roles.ts
│   ├── deploy-all.ts
│   └── verify.ts
├── test/
│   ├── OwnershipRegistry.test.ts
│   ├── EscrowMarketplace.test.ts
│   ├── AttendanceRegistry.test.ts
│   ├── integration/FullLifecycle.test.ts
│   └── security/Reentrancy.test.ts
├── deployments/
│   └── injectiveTestnet.json      # written by deploy-all.ts, read by apps/api/src/web3
├── hardhat.config.ts
└── package.json

apps/api/src/web3/                  # currently a README stub — filled in this phase
├── client.ts                       # viem public + wallet clients, chain from @fanpass/shared
├── abis/                           # ABI JSON, generated from apps/contracts artifacts
│   ├── OwnershipRegistry.json
│   ├── EscrowMarketplace.json
│   └── AttendanceRegistry.json
├── ownershipRegistry.ts            # typed contract read/write wrappers
├── escrowMarketplace.ts
└── attendanceRegistry.ts

apps/api/src/indexer/               # new — the event listener that keeps the off-chain store in sync
├── index.ts                        # subscribes to all three contracts' events on boot
├── handlers/
│   ├── ticketRegistered.ts         # writes ownershipCertificates/{ticketId}
│   ├── statusChanged.ts            # updates tickets/{ticketId}.status
│   ├── ticketPurchased.ts          # writes transactions/, updates users/{}.stats, triggers reputation recompute
│   ├── fundsLocked.ts / fundsReleased.ts / buyerRefunded.ts
│   └── attendanceMarked.ts         # writes attendance/{attendanceId}
└── replay.ts                       # backfills from a given block on cold start / after downtime
```

---

## 14. Backend integration — the actual migration, function by function

This is the part that changes *existing, working code*. Today, `apps/api/src/trustEngine/verification.ts`
and `trustEngine/marketplace.ts` write directly to the local store via repositories and treat that write
as final. After Phase 4, for the three facts now on-chain, **the chain write happens first and the local
store is updated by the indexer reacting to the emitted event** — the flow the user specified
(Backend → Injective → Wallet → Events → Firebase/local-store Synchronization).

| Function today (`apps/api/src/trustEngine/*.ts`) | After Phase 4 |
|---|---|
| `verification.ts`: on pass, `createMockOwnershipCertificate(ticketId, sellerAddress)` | Calls `web3/ownershipRegistry.ts:registerTicket(...)`, gets a tx hash back immediately; the actual `ownershipCertificates/{ticketId}` row is written by `indexer/handlers/ticketRegistered.ts` reacting to `TicketRegistered` |
| `marketplace.ts: listTicket` | Calls `escrowMarketplace.ts:createListing(...)`; `marketplaceListings/{id}.status` flips via the indexer's `statusChanged` handler, not synchronously in the function |
| `marketplace.ts: openEscrow` / `releaseEscrow` | Calls the real contract functions; `transactions/` and `users/{}.stats` are written by `ticketPurchased`/`fundsLocked`/`fundsReleased` handlers |
| `marketplace.ts: cancelListing` | Calls `cancelListing()` on-chain; local status update via indexer |

**API response shape implication** (worth flagging explicitly): today, `POST /marketplace/:id/buy` returns
the *final* listing+transaction state in one response, because the mock is synchronous. After Phase 4, a
blockchain transaction needs confirmation time — the endpoint should return `{ txHash, status: "pending" }`
immediately, and the frontend polls `GET /marketplace/:id` (already built, already polling-friendly per
the `ListingDetail` component's `useQuery`) until the indexer has caught up and the listing shows
`Sold`. This is the same "poll until backend catches up" pattern the `VerificationStepper` already uses
for the AI pipeline — no new frontend pattern needs inventing, it's reused.

`ticketRepository`, `listingRepository`, `transactionRepository`, `ownershipCertificateRepository`,
`userRepository` **do not change their function signatures**. The indexer calls the exact same
`updateTicket`, `updateListing`, `createTransaction`, `transferOwnershipCertificate`, `incrementUserStats`
functions the services call today — it just calls them from an event handler instead of a service method.
This is the entire point of Phases 2–3 having built those repositories against a stable shape already.

---

## 15. Upgrade strategy & future roadmap

**v1 is non-upgradeable** (no proxy) — deliberate, matching the original architecture doc's stance:
adding UUPS/Transparent-proxy upgradeability now is over-building before there's a shipped v1 to migrate
from. Each contract's role-gated design means most "upgrades" (swap the marketplace's fee logic, rotate
the verifier signer, add a new attendance-driven contract) don't require upgrading these three at all —
they're additive or role changes.

If a genuine v2 of a contract's *logic* is needed later (not just config), the path is:

1. Deploy `ContractV2` implementing the same interface (`IOwnershipRegistry` etc.)
2. Grant `ContractV2` the relevant role(s) on its dependencies
3. Revoke the old contract's role
4. Frontend/backend repoint via `deployments/<network>.json` — no code changes beyond the address

This is a **migration**, explicit and auditable via events, rather than a silent proxy upgrade — appropriate
for a system whose entire value proposition is "you can verify this yourself."

**Roadmap beyond this phase**:
- Phase 5: MCP tool bus, Agent Skills registration, x402 premium tier, CCTP settlement (designed below,
  not built yet)
- Phase 6+: `AchievementBadges.sol` / `MemoryCardRegistry.sol` subscribing to `AttendanceMarked`;
  `ERC2981`-style secondary fee if FanPass ever wants one; potential UUPS proxy adoption once there's a
  real v1 in production with real users to protect via careful migration rather than premature flexibility

---

## 16. Injective-native features (designed now, built in Phase 5)

### 16.1 CCTP — cross-chain settlement

**The story**: an Indian buyer holds USDC on a chain other than Injective. They should be able to buy a
FanPass ticket without manually bridging first.

```
Buyer (wallet on Chain X, e.g. Ethereum/Base/Arbitrum)
  │  1. Approves USDC spend to Circle's TokenMessenger on Chain X
  │  2. Calls depositForBurn(amount, injectiveDomain, escrowMarketplaceAddress, usdcAddress)
  ▼
Circle CCTP (burns USDC on Chain X, mints attestation)
  │  3. Circle's off-chain attestation service signs a message once burn is confirmed
  ▼
apps/api CCTP relayer service (new, Phase 5)
  │  4. Polls Circle's attestation API for the buyer's message hash
  │  5. Once attested, calls MessageTransmitter.receiveMessage() on Injective EVM Testnet
  ▼
USDC minted natively on Injective, credited to EscrowMarketplace's expected escrow flow
  │  6. apps/api calls EscrowMarketplace.buy(listingId, amount) on the buyer's behalf
  │     (buyer pre-signs a meta-tx / the relayer acts as a facilitator — see note below)
  ▼
Escrow funded exactly as the same-chain path (§8.2) — from here on it's identical
```

**Backend responsibilities** (`apps/api/src/cctp/`, new in Phase 5):
- A relayer service that watches for a buyer's declared cross-chain purchase intent (a new
  `POST /marketplace/:id/buy/cross-chain` endpoint capturing `{ sourceChain, buyerAddress }`)
- Polls Circle's attestation API (`https://iris-api.circle.com/attestations/{messageHash}`) until status
  is `complete`
- Calls `MessageTransmitter.receiveMessage` on Injective EVM Testnet once attested
- Only then calls `EscrowMarketplace.buy()` — the buyer's USDC is now native on Injective, so the rest of
  the flow is unmodified

**Frontend workflow**:
- Buy button detects the connected wallet's chain; if it's not Injective, offers "Pay from {chain} via
  CCTP" instead of hiding the buy flow
- Shows a distinct multi-step progress UI (reusing the `VerificationStepper` visual pattern — "Burning on
  {chain}… → Waiting for attestation… → Minting on Injective… → Funding escrow…") since this genuinely
  takes longer (Circle's attestation is typically ~15 minutes on mainnet, much faster on testnet) — the
  UI must not imply instant settlement here the way the same-chain buy button does

**Failure handling**:
- Burn succeeds, attestation delayed indefinitely: buyer's funds are provably burned+re-mintable
  (Circle's guarantee, not FanPass's) — the relayer retries polling indefinitely; the listing stays
  `Active` (not falsely marked `PendingEscrow`) until the *Injective-side* `buy()` actually executes, so
  another buyer isn't blocked by someone else's slow cross-chain attestation
- Attestation succeeds, `receiveMessage` call fails (gas issue, RPC hiccup): relayer retries with backoff;
  idempotent by message hash (`MessageTransmitter` itself prevents double-minting the same message)
- Buyer abandons mid-flow after burning: funds are mintable on Injective by anyone holding the attested
  message — the relayer should still complete the mint step even if the buyer's session ends, crediting
  a recoverable balance rather than leaving funds unreachable

**Edge cases**: source-chain USDC is not always 6-decimal (verify per chain); testnet CCTP domain IDs
differ from mainnet — the relayer config must be network-aware, sourced from the same
`packages/shared/src/constants/chain.ts` pattern already used for the EVM chain definition.

### 16.2 x402 — pay-per-request premium verification

Not a subscription tier, not gating random features — gating **specific, expensive, human-in-the-loop or
compute-heavy services** that have real marginal cost per request:

- Priority AI Verification (jump the queue, run all agents synchronously with tighter SLAs)
- Fraud Investigation Report (a deeper, slower forensic pass — possibly with human review)
- Legal Ownership Certificate (a formatted, signed PDF referencing the on-chain `verificationHash` +
  `tokenId`, suitable for a dispute/legal context)
- Insurance Eligibility Report (risk-priced, feeds a future Insurance Agent)

**Architecture**:

```
Client                    apps/api                                    x402 facilitator / payment rail
  │ GET /premium/fraud-investigation/:ticketId (no payment header)
  ├────────────────────────►│
  │                         │  x402 middleware intercepts, sees no valid payment
  │  402 Payment Required   │
  │◄────────────────────────┤  (body: price, payTo address, resource id)
  │                         │
  │  [client's wallet pays — a single on-chain USDC payment or a signed payment authorization,
  │   depending on the x402 scheme used]
  │                         │
  │ GET /premium/fraud-investigation/:ticketId  (with X-Payment header / proof)
  ├────────────────────────►│
  │                         │  middleware verifies payment (calls facilitator or checks on-chain proof)
  │                         │  verified → passes through to controller
  │                         │  controller runs Fraud Investigation Agent, returns report
  │  200 + report            │
  │◄────────────────────────┤
```

**Backend responsibilities**:
- Express middleware (`apps/api/src/middleware/x402.ts`, new in Phase 5) mounted only on
  `/api/v1/premium/*` — every other route is completely unaffected
- Middleware config maps each premium route to a price (USDC) and a receiving address
- On each request without valid payment proof, responds `402` with the price/address/resource metadata
  per the x402 spec
- On a request *with* proof, verifies it (via the chosen facilitator, or directly against Injective if
  the payment is itself an on-chain USDC transfer) before calling `next()`
- Every settled premium request is logged as a `transactions`-shaped record (`type: "premium_service"`)
  for audit, reusing the existing `transactionRepository`, not a new collection

**Request lifecycle** (concrete): client hits a 402 → pays → retries with proof → middleware verifies →
controller executes the (potentially slow) agent → response. No session, no subscription state — every
single request re-proves payment. This is the entire point of x402 versus a subscription: zero standing
account state to manage, which matches "wallet address IS the identity" already being this app's whole
model.

**API protection**: the premium routes never touch business logic themselves — they're normal
controllers behind the middleware, so adding a new premium endpoint later is "write a controller, add one
line to the price map," not a parallel auth system.

### 16.3 MCP — the agents' tool bus

Already sketched in `docs/ARCHITECTURE.md` §6/§8 and `apps/api/src/mcp/README.md`; expanded here:

```
Agent (e.g. Fraud Agent, Insurance Agent)
  │  calls an MCP tool, not a vendor SDK directly
  ▼
apps/api/src/mcp/server.ts  (internal MCP server)
  ├── ocr.extract           → wraps whatever OCR backend is live (mocked today, real Vision API later)
  ├── qr.decode             → wraps the existing jimp+jsqr pipeline (already real, Phase 2)
  ├── metadata.lookup       → wraps ai/fixtures.ts (already real)
  ├── chain.read            → wraps apps/api/src/web3/*.ts (new, Phase 4) — statusOf, ownerOf, listing state
  ├── price.history         → wraps listingRepository comps lookup (already real, Phase 3)
  ├── fraud.dbLookup        → new in Phase 5 — external fraud-signal DB, currently no-op stub
  └── verification.crossCheck → composes the above for a single verification pass
```

**Tool architecture**: each tool is a thin, typed function with a JSON schema for input/output — literally
the same shape agents already return (`AgentResult<T>`), so wrapping an existing agent helper as an MCP
tool is a signature change, not new logic.

**Agent orchestration**: unchanged from Phase 2 — the Orchestrator (`apps/api/src/ai/orchestrator.ts`)
still sequences agents; MCP is *how an agent reaches a capability*, not a replacement for the
Orchestrator's sequencing. An agent becomes an MCP *client*; the Orchestrator never becomes one.

**Caching**: tool results keyed by a hash of their input (e.g. `chain.read` results cached for one block,
`price.history` cached for the request's lifetime — comps don't change mid-verification).

**Fallback logic**: each tool declares a fallback (e.g. `ocr.extract` falls back to the existing
mocked-deterministic path if a real Vision API call fails/times out) — this is exactly how Phase 2 already
described the OCR/Fraud/Metadata agents ("mocked-but-deterministic now, real Vision API later behind the
same signature"); MCP formalizes that seam instead of it being an informal comment.

**Retries & error handling**: bounded retries (2–3) with backoff for transient tool failures
(`chain.read` against a flaky RPC); a tool that exhausts retries returns a typed error result the calling
agent folds into its own `flags` array (e.g. `chain_read_unavailable`) rather than crashing the whole
verification pipeline — one flaky tool degrades one badge's confidence, it doesn't fail the ticket.

---

## 17. Demo narrative — one cohesive story, not a checklist

For the pitch: walk the *same ticket* through every piece, in order, so each Injective feature has a
visible, causal reason for existing rather than reading as five unrelated integrations bolted on:

1. A seller uploads a ticket on `/verify`. **Agent Skills** (OCR, QR, Fraud, Metadata, Ownership, Pricing)
   run through the Orchestrator, each one calling **MCP** tools rather than embedding vendor SDKs — this
   is why swapping mock OCR for a real Vision API later touches one tool, not five agents.
2. Verification passes. **`OwnershipRegistry`** mints the Ownership Certificate — the moment "this ticket
   is real" becomes a fact nobody, including FanPass, can quietly alter.
3. The seller lists it. A buyer on a *different* chain wants it — **CCTP** bridges their USDC to Injective,
   native, and the exact same **`EscrowMarketplace`** contract locks and releases it as if the buyer had
   started on Injective all along. Ownership transfers atomically with settlement.
4. The buyer, worried about a high-value ticket, pays once for a Fraud Investigation Report —
   **x402** meters that single request, no subscription, no standing account, proportional to the one
   thing they actually wanted.

Every technology answers a question a judge would otherwise ask ("why is this on-chain," "why cross-chain
payment," "why not just a subscription") *before they ask it*, because the demo shows the causal chain
instead of a slide listing five integrations.

---

## 18. Explicitly out of scope for this document / this phase

- No `.sol` implementation files (this document *is* the gate before that starts)
- No CCTP/x402/MCP code — designed above, built in Phase 5 per the existing roadmap
- No proxy/upgradeability pattern (§15 explains why not yet)
- No collectibles/badges/memory-card contracts (§5.5 — foundations only)
- No mainnet deployment planning — Injective EVM **Testnet** only, matching every other phase

---

## 19. What happens next

Per instruction: implementation begins **one contract at a time**, starting with `OwnershipRegistry`,
only once this design is approved. Suggested order matches the dependency graph in §9.1:

1. `OwnershipRegistry.sol` + `IOwnershipRegistry.sol` + its full test file
2. `EscrowMarketplace.sol` + `IEscrowMarketplace.sol` + its full test file (depends on 1 existing)
3. `AttendanceRegistry.sol` + `IAttendanceRegistry.sol` + its full test file (depends on 1 existing)
4. Deployment scripts + `apps/api/src/web3/*` real client wiring
5. `apps/api/src/indexer/*` — the event-listener service described in §14
6. Rewire `trustEngine/verification.ts` and `trustEngine/marketplace.ts` to call `web3/*` instead of
   writing directly to repositories for the three on-chain facts, per the migration table in §14

Waiting for approval before starting step 1.
