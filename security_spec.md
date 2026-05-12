# Security Specification - IP-based Event Likes

## 1. Data Invariants
- An event's `likesCount` must only be incremented when a unique like document (linked to an IP) is created for that event.
- An IP address can only like a specific event once.
- Only the `likesCount` field can be modified by public users on an event document.
- Users cannot modify or delete existing likes.
- Timestamps must be valid server timestamps.

## Analytics Data Invariants
- `analytics_visits` documents must be keyed by `YYYY-MM-DD_IP`.
- Public users can create visits but not read, update, or delete them.
- `analytics_daily_stats` can only be updated/read by admins or through atomic count increments (if implemented).

## 2. The "Dirty Dozen" Payloads

### Identity & Spoofing
1. **Double Like**: An IP attempts to create a second like document for the same event.
   - *Expected*: `PERMISSION_DENIED` (Doc ID conflict).
2. **IP Impersonation**: A client attempts to create a like document with an IP field that doesn't match the one used in the Doc ID.
   - *Expected*: `PERMISSION_DENIED` (Validation check: `likeId == data.ip`).
3. **Likes Count Jump**: A client attempts to increment `likesCount` by more than 1.
   - *Expected*: `PERMISSION_DENIED` (Check: `incoming().likesCount == existing().likesCount + 1`).

### Integrity & State
4. **Shadow Update**: A client attempts to update `likesCount` and another field (e.g., `title`).
   - *Expected*: `PERMISSION_DENIED` (Check: `affectedKeys().hasOnly(['likesCount'])`).
5. **Like Without Count**: A client creates a like document but doesn't increment the event counter.
   - *Result*: (Allowed, but inconsistent. Prevented by requiring batch writes on the app side).
6. **Count Without Like**: A client increments the event counter without creating a like document in the same batch.
   - *Expected*: `PERMISSION_DENIED` (Note: Technically hard to enforce for IP-based unauthenticated users without passing the IP in the update, but we will require a field `lastLikedByIP` for validation).

### Injection & Resource Exhaustion
7. **Malformed IP**: A client sends a 1MB string as an IP.
   - *Expected*: `PERMISSION_DENIED` (Check: `ip.size() <= 64`).
8. **Invalid Path ID**: A client injects a long, weird string as an eventId or likeId.
   - *Expected*: `PERMISSION_DENIED` (Check: `isValidId()`).

### Permission Escalation
9. **Admin Spoofing**: An unauthenticated user tries to set `status` to 'published'.
   - *Expected*: `PERMISSION_DENIED` (Check: `isAdmin()`).
10. **Delete Event**: A public user tries to delete an event.
    - *Expected*: `PERMISSION_DENIED` (Check: `isAdmin()`).
11. **Edit Global Settings**: A public user tries to edit `/settings/global`.
    - *Expected*: `PERMISSION_DENIED` (Check: `isAdmin()`).
12. **Future Timestamp**: A client sends a `createdAt` timestamp in the future.
    - *Expected*: `PERMISSION_DENIED` (Check: `createdAt == request.time`).

## 3. Test Runner Configuration
(This will be verified in `firestore.rules.test.ts`)
