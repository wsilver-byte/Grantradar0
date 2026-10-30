# Grant Surveyor AI — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants & Master Source of Truth

1. **Master Identity Invariant**: Every top-level user workspace `/users/{userId}` must have `ownerId == userId == request.auth.uid`, and writes require `request.auth.token.email_verified == true`.
2. **PII Split-Collection Invariant (Pillar 6 & Pillar 1 Master Gate)**: Personal Identifiable Information (`email`, `subscriberEmail`) is isolated inside `/users/{userId}/private/{docId}`. Reading or writing any document in `/users/{userId}/private/{docId}` requires both `request.auth.uid == userId` AND relational verification via `get(/databases/$(database)/documents/users/$(userId)).data.ownerId == request.auth.uid`.
3. **Query Enforcer Invariant (Pillar 8)**: Blanket reads (`allow read: if isSignedIn();`) are strictly forbidden. Listing `/userOpportunities` or `/paymentReceipts` requires `isSignedIn() && existing().ownerId == request.auth.uid`.
4. **Anti-Update-Gap & Immutability Invariant (Pillar 2 & Pillar 4)**: Every `create` and `update` invokes `isValid[Entity](incoming())`, enforces strict key allowlists (`hasAll` + `hasOnly`), validates server timestamps (`request.time`), and locks immutable fields (`ownerId`, `createdAt`).
5. **Terminal State Locking**: In `/userOpportunities/{opportunityId}`, once `existing().status == 'Expired'`, no further updates are permitted. `/paymentReceipts/{receiptId}` records are strictly immutable (`allow update, delete: if false;`).

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Shadow Field Injection on `/users/{userId}`)**: Includes valid `UserWorkspace` fields plus `"isAdmin": true`. Rejected by `data.keys().hasOnly(...)`.
2. **Payload 2 (Identity Spoofing on `/userOpportunities/{opportunityId}`)**: Authenticated user `uid_attacker` creates a grant with `"ownerId": "uid_victim"`. Rejected by `data.ownerId == request.auth.uid`.
3. **Payload 3 (Unverified Email Write on `/users/{userId}`)**: Authenticated user with `email_verified: false` attempts to create a workspace. Rejected by `isVerifiedUser()`.
4. **Payload 4 (Cross-User PII Read on `/users/{victimId}/private/info`)**: Authenticated user `uid_attacker` attempts `get` on `victimId`'s private email doc. Rejected by `isOwner(userId)`.
5. **Payload 5 (Orphaned Subcollection Write on `/users/{userId}/private/info`)**: User attempts to create `/users/{userId}/private/info` before parent `/users/{userId}` exists. Rejected by Master Gate `exists()` + `get()`.
6. **Payload 6 (Denial-of-Wallet 1.5KB Document ID Poisoning)**: Client attempts to create `/userOpportunities/{hugeId}` where `hugeId.size() > 128` or contains special characters. Rejected by `isValidId(opportunityId)`.
7. **Payload 7 (Unbounded Array Exhaustion on `/users/{userId}`)**: Client sends `savedIds` with 200 items (`size() > 50`). Rejected by `data.savedIds.size() <= 50`.
8. **Payload 8 (Array Type Poisoning on `/users/{userId}`)**: Client sends `savedIds: [12345]` (non-string element). Rejected by `data.savedIds[0] is string`.
9. **Payload 9 (Timestamp Forgery on Create)**: Client sends a past or future `createdAt` instead of `request.time`. Rejected by `incoming().createdAt == request.time`.
10. **Payload 10 (Immutable Field Tampering on Update)**: Owner updates `/users/{userId}` and changes `createdAt` or `ownerId`. Rejected by `incoming().createdAt == existing().createdAt && incoming().ownerId == existing().ownerId`.
11. **Payload 11 (Terminal State Bypass on `/userOpportunities/{opportunityId}`)**: Owner attempts to update a grant whose `existing().status == 'Expired'`. Rejected by `existing().status != 'Expired'`.
12. **Payload 12 (Unauthorized Receipt Tampering on `/paymentReceipts/{receiptId}`)**: User attempts to update or delete a payment receipt after creation. Rejected by `allow update, delete: if false;`.
