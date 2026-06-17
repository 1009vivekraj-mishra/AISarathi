# Firestore Security Specifications & Invariants

## 1. Data Invariants
1. **User Role Integrity (Pre-authorized Sync)**: Only verified administrators (`role == 'admin'`) can escalate or modify roles on a user record. A normal employee cannot edit their own `role` or change other user's records.
2. **Immutability of Key Ownership**: Fields like `userId` or `mentorId` inside records like self-nominations, quiz attempts, and user skills cannot be spoofed to other people's UIDs.
3. **Value Boundary Protections**: Scores for quizzes must strictly fall between `0` and `100`. Competency levels are integer bound between `0` and `5`.
4. **Verified Signatures**: All writes must originate from authenticated sessions via `request.auth.uid`.

## 2. The "Dirty Dozen" Rogue Payloads (Blocked)
1. **The Administrator Escalation**: A user updates `/users/{userId}` to change their `role` to `'admin'`.
2. **The Shadow Skill injection**: An employee updates `/user_skills/{Id}` to directly change their `currentLevel` to `5` with source `'manager'`.
3. **The Score Forgery**: An attempt is posted with a score of `999` points to bypass standard safety metrics.
4. **The Ghost Assessment Creation**: A technician creates a fake Assessment `/assessments/fake_id` directly through client SDK.
5. **The ID Poisoning Bomb**: A collection target creates a document using a 50KB junk-character string ID.
6. **The Mentor Hijack**: An employee approves their own mentor nomination `/mentor_nominations/{id}` by changing `status` to `'approved'`.
7. **The Competency Poisoning**: A user creates or updates a core competency category to an unapproved custom string like `'Magic Tricks'`.
8. **The Timestamps Cheat**: A client-side patch setting `updatedAt` to a future year.
9. **The Unverified Hijack**: An email-unverified login tries to invoke privileged manager/admin APIs.
10. **The PII Blanket Leak query**: An employee queries `/users` without specifying a secure self-targeting where clause.
11. **The Terminal State Override**: Modifying a finished mentoring session status back to `'pending'`.
12. **The Anonymous Intrusion**: An unauthenticated connection attempts to read the knowledge directory `/knowledge_docs`.

## 3. Test Cases for Security Rules Validation
All the above payloads must return standard `PERMISSION_DENIED` errors on client write or read checks. We will enforce these policies via strict, compiled Firestore security rules.
