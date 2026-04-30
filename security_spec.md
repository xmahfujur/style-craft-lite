# Security Specification

## Data Invariants
1. **Orders**: Must have a valid status ('pending') on creation. Total price must be positive.
2. **Products**: Must have name, price, and image. Regular price should generally be >= price.
3. **Settings**: Only the `config` document is allowed. Only `metaPixelId` is configurable.
4. **Immutability**: `createdAt` cannot be changed after creation.
5. **Authenticity**: Only authenticated users (admins) can modify products, settings, or update order statuses.

## The "Dirty Dozen" Payloads (Attacker Payloads)

| Tool | Payload | Expected Result | Why? |
| :--- | :--- | :--- | :--- |
| **Order Spoof** | `{"status": "delivered", ...}` on create | `PERMISSION_DENIED` | Only system/admin should set non-pending status |
| **Price Hijack** | `{"totalPrice": -100, ...}` | `PERMISSION_DENIED` | Price must be positive |
| **Product Inject** | `{"name": "Bad", "price": 10, "isVerified": true}` | `PERMISSION_DENIED` | Shadow field injection (isVerified) |
| **Massive ID** | ID = `a` * 2000 | `PERMISSION_DENIED` | ID length hardening |
| **Settings Wipe** | Delete `/settings/config` | `PERMISSION_DENIED` | Config is immutable for non-admins |
| **Public Product Write**| Unauthenticated `setDoc` on `/products/bad` | `PERMISSION_DENIED` | Only internal admins write store content |
| **Ghost Order** | `{"items": [], ...}` | `PERMISSION_DENIED` | Orders must contain items |
| **Time Warp** | `{"createdAt": "2020-01-01T00:00:00Z"}` | `PERMISSION_DENIED` | Must use server timestamp |
| **PII Leak** | Attacker `list` /orders | `PERMISSION_DENIED` | Unauthenticated users can't list orders |
| **Path Poison** | `get(/products/..%2f..%2fsecret)` | `PERMISSION_DENIED` | Path traversal protection |
| **State Shortcut**| Update Order `status` to 'delivered' | `PERMISSION_DENIED` | Only admins can advance status |
| **Immutable Hack**| Update Product `createdAt` | `PERMISSION_DENIED` | Creation time is read-only |

