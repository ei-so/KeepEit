# KeepEit — Local-First Encrypted Vault & Personal Workspace

> **Developer:** Kurt Ross Gonzaga  
> **Target:** Browser-based local-first vault & personal productivity workspace  
> **Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, IndexedDB (WebCrypto API)  

---

## 📌 Overview

**KeepEit** is an offline-capable, zero-knowledge browser application and installable Progressive Web App (PWA) designed to unify credential management, markdown note-taking, task tracking, and financial logging into a single encrypted envelope. 

Built on pure Web Crypto standards without external dependencies or cloud backends, KeepEit enforces strict local data ownership: everything is encrypted in-memory using **AES-256-GCM** and stored locally in **IndexedDB**. 

---

## 🏗️ Technical Architecture & Key Indirection

KeepEit uses a **two-tier key indirection scheme** ($DEK$ and $KEK$) to enable atomic password updates and multi-path unlocking (Master Password, Emergency Recovery Code, and WebAuthn PRF Passkeys) without ever re-encrypting the core vault payload.

                ┌─ PBKDF2(Master Password, salt) ──→ KEK_pw  ─┐
Random 256-bit DEK ─┼─ PBKDF2(Recovery Code, salt)   ──→ KEK_rc  ─┼─→ Wraps DEK (AES-GCM) ──→ Decrypts Vault Data
(Non-extractable)  └─ HKDF(WebAuthn PRF Output)     ──→ KEK_pk  ─┘


### 🔑 Cryptographic Pipeline

1. **Data Encryption Key ($DEK$):** A random 256-bit AES-GCM key generated once via `crypto.getRandomValues`. Imported as non-extractable (`extractable: false`).
2. **Key Encryption Keys ($KEK$):**
   * **Master Password ($KEK_{pw}$):** Derived via `PBKDF2-SHA-256` with **600,000 iterations**.
   * **Recovery Code ($KEK_{rc}$):** Derived via `PBKDF2-SHA-256` using a 24-character Crockford Base32 string.
   * **Passkey / Biometrics ($KEK_{pk}$):** Derived via `HKDF-SHA256` from WebAuthn PRF extension output.
3. **Envelope Storage:** IndexedDB holds only the encrypted `VaultEnvelopeV3`:

```typescript
interface VaultEnvelopeV3 {
  version: 3;
  kdf: 'PBKDF2-SHA256';
  iterations: 600000;
  salt: string; // Base64, 16 bytes
  wrappers: {
    password: { iv: string; wrappedDek: string };
    recovery?: { iv: string; wrappedDek: string; salt: string };
    passkey?:  { iv: string; wrappedDek: string; credentialId: string; prfSalt: string };
  };
  iv: string;         // IV used to encrypt VaultData with DEK
  ciphertext: string; // AES-GCM(DEK, JSON.stringify(VaultData))
  createdAt: string;
  updatedAt: string;
}
🛠️ Feature Breakdown
1. Unified Encrypted Store & Shared Services
Zero-Knowledge Isolation: Decrypted state lives solely in React volatile memory. Nulled immediately upon auto-lock or manually locking.

Shared Cross-Cutting Services: Shared folders (scoped to credentials/notes), free-text tags (max 5 per record), star favorites, global search, and an append-only ring-buffer activity log (capped at 200 non-sensitive entries).

2. Core Workspace Modules
Credentials Vault: Card/grid view, letter-avatars with deterministic color hashing, masked passwords (••••••••), 15-second auto-hide reveals, and 30-second automatic clipboard clearing.

Notes Workspace: 3-pane markdown editor with live Write/Preview modes, toolbar formatting, autosave debouncing (800ms) with Seal Bar indicators, and full mobile-stack responsive navigation.

Task Manager: Grouped by status (To Do, In Progress, Completed), priority chips (--graphite, --seal, --rust), overdue alerts, tag filters, and due date sorting.

Income Tracker: PHP/USD financial logging, summary cards (Monthly, All-Time, Top Category), category filters, and date sorting.

Calendar: Week, Month, and Year view matrices showing priority-coded task chips and daily income totals.

Dashboard: Time-of-day greeting, 6-month income sparklines, quick credential access, overdue alerts, and a 3/3 Vault Protection score panel.

Command Palette (⌘K / Ctrl+K): Global fuzzy search across credentials, notes, tasks, and income entries with keyboard navigation.

3. PWA & Storage Durability
Offline First: Zero runtime network calls. Shell caching managed via a lightweight Service Worker (public/sw.js).

Safari 7-Day Storage Eviction Guard: Includes explicit iOS installation instructions and storage persistence hooks (navigator.storage.persist()).

Mobile Ergonomics: Responsive breakpoint down to 768px, mobile bottom navigation bar, and hardware back-button support for modal history.

🎨 Visual Identity & Design System
The visual language follows an archival ledger aesthetic: quiet surfaces, high-contrast typography, and a signature persistent bottom status bar.

Palette Tokens
--ink #121A16 — Primary text & dark mode background

--paper #E9EBE4 — Light mode background

--seal #2F6F52 — Primary actions, active indicators, medium priority

--seal-soft #CBDCD0 — Row selections, subtle tints

--rust #B4472C — Destructive actions, overdue badges, high priority

--graphite #7A8479 — Secondary text, borders at 25% opacity

Typography
Display / Page Titles: Familjen Grotesk

Body / UI: Inter (14px base)

Data, Labels, Passwords: JetBrains Mono (uppercase, letter-spacing: 0.08em)

Signature Element: The Seal Bar
A persistent bottom bar showing active AES-256 status, live auto-lock countdown timer with 1-click extension, total item counts, and backup age indicators.

🚦 Getting Started & Local Development
Prerequisites
Node.js v18+

npm / pnpm / yarn

Installation
Bash
# Clone the repository
git clone [https://github.com/your-username/keepeit.git](https://github.com/your-username/keepeit.git)
cd keepeit

# Install dependencies
npm install

# Start the Vite development server
npm run dev
Build & PWA Testing
Bash
# Production build
npm run build

# Preview production build locally
npm run preview
Note on WebAuthn / PWA Testing: Testing PWA installation features and WebAuthn PRF passkey enrollment requires serving over HTTPS (or localhost).

🛡️ Security Disclaimer & Portfolio Note
Portfolio Demonstration Notice: KeepEit is an educational demonstration of applied browser cryptography (WebCrypto, PBKDF2, AES-GCM, and WebAuthn PRF). While built using high cryptographic standards, it has not undergone an independent third-party security audit. Do not store production-critical real credentials without proper external backup exports.

👨‍💻 Author
Kurt Ross Gonzaga

Information Systems Student & Full-Stack Developer


---

### Key Summary of What Was Included:
* **Key Indirection Architecture Diagram:** Illustrates how $DEK$ is wrapped by $KEK_{pw}$, $KEK_{rc}$, and $KEK_{pk}$.
* **TypeScript Interfaces:** Shows the exact `VaultEnvelopeV3` schema used in Phase 6.5.
* **Full Prompt Pack Feature Coverage:** Documents all completed modules across Phases 1 through 7.
* **Design System & Token Documentation:** Highlights the archival ledger aesthetic, color hexes, and typography choices.
