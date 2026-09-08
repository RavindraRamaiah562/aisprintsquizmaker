Date created: 2026-09-04
Date last modified: 2026-09-04 (TDD + Vitest strategy added)

# User Registration, Login & Logout - Technical PRD

## Overview/Problem

Teachers and students need a secure way to access the quiz platform. Today there is no identity layer: anyone can reach the app, there is no way to distinguish a teacher from a student, and there is no foundation for role-based features such as test-bank creation. Without registration and authentication, teachers cannot own their content and students cannot be associated with attempts or progress.

This feature introduces account creation, credential validation, session management, and role assignment so that downstream features (starting with teacher-managed multiple-choice test banks) can gate access by role.

---

## Hypothesis

We believe that providing simple registration and login with flexible identifiers (name, email, or mobile number) and two roles (teacher, student) will let users access the right capabilities quickly while keeping credentials secure on Cloudflare D1.

---

## Scope

### In Scope

What will be built in this feature:

- User registration with full name, email, mobile number, password, and role selection (teacher or student)
- Login using a single identifier field that accepts **name**, **email**, or **mobile number**, plus password
- Logout that ends the active session
- `users` table in Cloudflare D1 to persist accounts and validate credentials at login
- Password storage using one-way hashing (never plain text)
- Server-side session management via HTTP-only cookie
- Role stored on the user record and available to protected routes (`teacher` | `student`)
- Basic UI pages: Register, Login, and post-login redirect based on role
- Input validation and user-facing error messages for duplicate accounts, invalid credentials, and weak passwords
- **Test-Driven Development (TDD)** applied in every phase: write failing tests first (red), implement until tests pass (green), then refactor
- **Automated test suite** using **Vitest** (TypeScript) with red/green output mapping directly to acceptance criteria

### Out of Scope

What is explicitly not being built now but may be considered later:

- Teacher test-bank creation and multiple-choice question management (separate PRD; depends on this auth layer)
- Student quiz-taking flows
- Email or SMS verification / OTP
- Password reset or "forgot password"
- OAuth / social login (Google, Microsoft, etc.)
- Admin role or user management dashboard
- Profile editing after registration
- Rate limiting and CAPTCHA (recommended before production; not required for initial build)

### Cut

Things that were considered during planning but deliberately removed (and why):

- **JWT in localStorage** — Rejected in favor of HTTP-only session cookies to reduce XSS token theft risk on a teaching app with minimal client-side state.
- **Separate `username` column** — Rejected; login resolves against `name`, `email`, or `mobile` directly so users are not forced to remember a synthetic username.
- **Argon2 via native module** — Rejected for Workers compatibility; use a pure-JS hasher (`bcryptjs` or Web Crypto PBKDF2) instead.

---

## Technical Requirements

### Database Schema

#### `users`

Stores registered accounts. Used for registration inserts and login credential lookup.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_email ON users (email);
CREATE UNIQUE INDEX idx_users_mobile ON users (mobile);
CREATE INDEX idx_users_name ON users (name);
```

**Column notes**

| Column | Purpose |
|--------|---------|
| `name` | Display name; also accepted as a login identifier |
| `email` | Unique; accepted as a login identifier |
| `mobile` | Unique; normalized before storage (digits only, include country code if provided); accepted as a login identifier |
| `password_hash` | Output of password hashing function; never store plain passwords |
| `role` | `teacher` or `student`; determines post-login destination and future permissions |

**Login lookup query pattern**

```sql
SELECT id, name, email, mobile, password_hash, role
FROM users
WHERE email = ?1
   OR mobile = ?1
   OR name = ?1
LIMIT 1;
```

The bound parameter `?1` is the trimmed value from the login identifier field.

#### `sessions` (optional but recommended)

Supports logout and session invalidation. If deferred to Phase 2, use signed cookie payload with expiry only.

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);
```

### API Endpoints

#### POST /api/auth/register

Create a new user account.

**Request Body:**

```json
{
  "name": "Jane Teacher",
  "email": "jane@school.edu",
  "mobile": "+919876543210",
  "password": "SecurePass123!",
  "role": "teacher"
}
```

**Validation rules:**

- `name`: required, 2–100 characters, trimmed
- `email`: required, valid email format, unique
- `mobile`: required, valid phone format, normalized to digits (and leading `+` if used), unique
- `password`: required, minimum 8 characters; must include at least one letter and one number
- `role`: required, exactly `teacher` or `student`

**Response:**

- Success (201): `{ "user": { "id", "name", "email", "mobile", "role" } }` — no password or hash returned
- Error (400): Validation error with field-level messages
- Error (409): Email or mobile already registered
- Error (500): Server error

#### POST /api/auth/login

Authenticate with name, email, or mobile plus password.

**Request Body:**

```json
{
  "identifier": "jane@school.edu",
  "password": "SecurePass123!"
}
```

`identifier` may be the user's `name`, `email`, or `mobile` (mobile may be entered with or without formatting; normalize before lookup).

**Response:**

- Success (200): `{ "user": { "id", "name", "email", "mobile", "role" } }` and `Set-Cookie` session header
- Error (400): Missing identifier or password
- Error (401): Invalid credentials (generic message: "Invalid username or password")
- Error (500): Server error

#### POST /api/auth/logout

End the current session.

**Request Body:** none (session read from cookie)

**Response:**

- Success (200): `{ "success": true }` and cookie cleared
- Error (401): No active session

#### GET /api/auth/me

Return the currently authenticated user (for client hydration and route guards).

**Response:**

- Success (200): `{ "user": { "id", "name", "email", "mobile", "role" } }`
- Error (401): Not authenticated

### User Interface Requirements

#### Register Page (`/register`)

- Form fields:
  - **Full name** (text, required)
  - **Email** (email input, required)
  - **Mobile number** (tel input, required)
  - **Password** (password input, required, masked; optional show/hide toggle)
  - **Confirm password** (password input, required, must match password)
  - **Role** (radio or select: Teacher / Student, required)
- Actions:
  - Submit → call `POST /api/auth/register` → on success redirect to role-appropriate home
  - Link to Login page
- Validation:
  - Inline and on-submit validation per API rules
  - Show server errors (duplicate email/mobile, etc.)
- Accessibility:
  - Labels associated with inputs; errors announced to screen readers

#### Login Page (`/login`)

- Form fields:
  - **Username** (text input, required) — label explains: "Name, email, or mobile number"
  - **Password** (password input, required, masked; optional show/hide toggle)
- Actions:
  - Submit → call `POST /api/auth/login` → redirect by role:
    - `teacher` → `/teacher` (placeholder dashboard until test-bank PRD is implemented)
    - `student` → `/student` (placeholder dashboard)
  - Link to Register page
- Error handling:
  - Generic invalid-credentials message (do not reveal whether identifier exists)

#### Logout Control (authenticated layouts)

- Visible when user is signed in (header or nav)
- Calls `POST /api/auth/logout` → redirect to `/login`

#### Route Protection

- `/teacher/*` — requires authenticated user with `role = 'teacher'`
- `/student/*` — requires authenticated user with `role = 'student'`
- Unauthenticated users redirect to `/login`
- Wrong role redirects to that user's role home or shows 403

---

## Testing Strategy (TDD + Vitest)

All work follows **strict phase-by-phase delivery**. A phase is **not complete** until its automated tests are **green**. No phase may start until the previous phase's test suite passes.

### TDD Workflow (every phase)

```
1. RED    — Write Vitest test cases for the phase; run `npm test` → tests FAIL (red)
2. GREEN  — Implement minimum code to satisfy tests → `npm test` → tests PASS (green)
3. REFACTOR — Clean up implementation; tests must stay green
4. GATE   — Mark phase COMPLETED only when all phase tests + prior phase tests pass
```

Vitest reports failing tests in **red** and passing tests in **green** in the terminal. Each acceptance criterion maps to one or more named `describe` / `it` blocks so pass/fail status is visible at a glance.

### Test Tooling

| Tool | Purpose |
|------|---------|
| **vitest** | Unit and integration test runner (TypeScript) |
| **@vitest/coverage-v8** | Optional coverage report per phase |
| **@testing-library/react** | Component tests (Phase 3) |
| **@cloudflare/vitest-pool-workers** | D1 + Workers runtime tests for API routes (Phase 2) |

### NPM Scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

### Test File Layout

```
vitest.config.ts
src/
  lib/
    auth/
      password.test.ts          # Phase 1
      session.test.ts           # Phase 1
      validation.test.ts        # Phase 1
    db/
      users.test.ts             # Phase 1
  app/
    api/auth/
      register/route.test.ts    # Phase 2
      login/route.test.ts       # Phase 2
      logout/route.test.ts      # Phase 2
      me/route.test.ts          # Phase 2
    register/
      page.test.tsx             # Phase 3
    login/
      page.test.tsx             # Phase 3
    middleware.test.ts          # Phase 3
tests/
  acceptance/
    auth-acceptance.test.ts     # Phase 4 — maps all AC-* criteria
```

### Acceptance Criteria ↔ Test Mapping

Each checkbox in **Acceptance Criteria** has an `AC-*` id referenced in test names:

```typescript
// Example pattern used in every phase
describe("AC-004: login with email", () => {
  it("returns 200 and user profile when email and password are valid", async () => {
    // ...
  });
});
```

A criterion is marked `[x]` in this PRD **only when** its mapped Vitest tests are green.

---

## Implementation Phases

> **Rule**: Complete phases in order (0 → 1 → 2 → 3 → 4). Do not skip ahead. Each phase begins with failing tests.

### Phase 0: Vitest Foundation - COMPLETED

**Objective**: Install and configure Vitest so every later phase can run automated tests with red/green feedback.

**TDD entry point**: Write a smoke test before any auth code exists.

**Tasks (in order)**:

1. **RED** — Add `src/lib/__tests__/vitest-smoke.test.ts` asserting `true === true` placeholder, then replace with `expect(vitest).toBeDefined()` once vitest is installed
2. Install dev dependencies: `vitest`, `@vitest/coverage-v8` (optional), `vite-tsconfig-paths` (for `@/` alias)
3. Add `vitest.config.ts` with `environment: 'node'`, path alias `@` → `src/`
4. Add `npm run test`, `npm run test:watch` to `package.json`
5. **GREEN** — Confirm `npm test` exits 0 with green output

**Automated test cases**:

| Test file | Test case | AC id |
|-----------|-----------|-------|
| `vitest-smoke.test.ts` | Vitest runner executes and reports pass/fail | — |
| `vitest-smoke.test.ts` | `@/` path alias resolves in test imports | — |

**Deliverables**:

- `vitest.config.ts`
- `npm test` script working
- Green smoke test suite

**Phase gate**: `npm test` passes.

---

### Phase 1: Database & Auth Foundation - COMPLETED

**Objective**: Provision D1, create schema, and implement password hashing, session utilities, validation, and user DB layer — all driven by failing tests first.

**Tasks (in order)**:

1. **RED** — Write all Phase 1 test files (listed below); run `npm test` → all new tests fail
2. Create D1 database and add `d1_databases` binding to `wrangler.jsonc`
3. Add migration for `users` and `sessions`
4. Run `npm run cf-typegen`
5. Propose and install `bcryptjs` + `@types/bcryptjs`
6. **GREEN** — Implement `src/lib/auth/password.ts`, `session.ts`, `validation.ts`, `src/lib/db/users.ts` until tests pass
7. **REFACTOR** — Extract shared types; keep tests green

**Automated test cases**:

| Test file | Test case | AC id |
|-----------|-----------|-------|
| `password.test.ts` | `hashPassword` returns a string different from plain input | AC-001 |
| `password.test.ts` | `verifyPassword` returns true for correct password | AC-001 |
| `password.test.ts` | `verifyPassword` returns false for incorrect password | AC-007 |
| `password.test.ts` | plain password is never equal to stored hash | AC-001 |
| `validation.test.ts` | rejects password shorter than 8 characters | AC-003 |
| `validation.test.ts` | rejects password without a letter | AC-003 |
| `validation.test.ts` | rejects password without a number | AC-003 |
| `validation.test.ts` | accepts valid registration payload for teacher role | AC-001 |
| `validation.test.ts` | accepts valid registration payload for student role | AC-001 |
| `validation.test.ts` | rejects invalid email format | AC-001 |
| `validation.test.ts` | `normalizeMobile` strips spaces and punctuation | AC-005 |
| `validation.test.ts` | `normalizeMobile` maps `+91 98765 43210` and `9876543210` to same value | AC-005 |
| `session.test.ts` | `createSession` returns signed cookie value | AC-008 |
| `session.test.ts` | `readSession` returns user id for valid cookie | AC-009 |
| `session.test.ts` | `readSession` returns null for expired or tampered cookie | AC-010 |
| `session.test.ts` | `destroySession` invalidates session | AC-010 |
| `users.test.ts` | `createUser` inserts row with hashed password (not plain text) | AC-001 |
| `users.test.ts` | `createUser` throws on duplicate email | AC-002 |
| `users.test.ts` | `createUser` throws on duplicate mobile | AC-002 |
| `users.test.ts` | `findUserByIdentifier` finds user by email | AC-004 |
| `users.test.ts` | `findUserByIdentifier` finds user by mobile | AC-005 |
| `users.test.ts` | `findUserByIdentifier` finds user by name | AC-006 |
| `users.test.ts` | `findUserByIdentifier` returns null when not found | AC-007 |
| `users.test.ts` | migration creates `users` and `sessions` tables | AC-001 |

**Deliverables**:

- Local D1 with `users` and `sessions` tables
- Typed `env.DB` binding
- `src/lib/auth/*` and `src/lib/db/users.ts`
- All Phase 1 tests green

**Phase gate**: `npm test` passes (Phase 0 + Phase 1 tests).

---

### Phase 2: API Routes - COMPLETED

**Objective**: Expose register, login, logout, and me endpoints — each endpoint built test-first.

**Prerequisites**: Phase 1 gate passed.

**Tasks (in order)**:

1. **RED** — Write route test files; run `npm test` → new API tests fail
2. Install `@cloudflare/vitest-pool-workers` if using Workers pool for D1 route tests
3. **GREEN** — Implement `POST /api/auth/register`, `login`, `logout`, `GET /api/auth/me`
4. **REFACTOR** — Shared error response helpers; tests stay green

**Automated test cases**:

| Test file | Test case | AC id |
|-----------|-----------|-------|
| `register/route.test.ts` | POST valid teacher payload → 201 + user object without password | AC-001 |
| `register/route.test.ts` | POST valid student payload → 201 + role `student` | AC-001 |
| `register/route.test.ts` | POST duplicate email → 409 | AC-002 |
| `register/route.test.ts` | POST duplicate mobile → 409 | AC-002 |
| `register/route.test.ts` | POST weak password → 400 | AC-003 |
| `register/route.test.ts` | POST missing required field → 400 | AC-001 |
| `login/route.test.ts` | POST with email identifier + valid password → 200 + Set-Cookie | AC-004, AC-008 |
| `login/route.test.ts` | POST with mobile identifier + valid password → 200 | AC-005 |
| `login/route.test.ts` | POST with name identifier + valid password → 200 | AC-006 |
| `login/route.test.ts` | POST with wrong password → 401 generic message | AC-007 |
| `login/route.test.ts` | POST with unknown identifier → 401 generic message | AC-007 |
| `login/route.test.ts` | response body never includes `password` or `password_hash` | AC-008 |
| `logout/route.test.ts` | POST with valid session cookie → 200 + cookie cleared | AC-010 |
| `logout/route.test.ts` | POST without session → 401 | AC-010 |
| `me/route.test.ts` | GET with valid session → 200 + user profile | AC-009 |
| `me/route.test.ts` | GET without session → 401 | AC-009 |
| `me/route.test.ts` | GET after logout → 401 | AC-010 |

**Deliverables**:

- Four auth API route handlers
- All Phase 2 tests green

**Phase gate**: `npm test` passes (Phases 0–2).

---

### Phase 3: UI Pages & Route Guards - COMPLETED

**Objective**: Ship registration and login flows with role-based navigation — component and middleware tests written first.

**Prerequisites**: Phase 2 gate passed.

**Tasks (in order)**:

1. **RED** — Write `page.test.tsx` and `middleware.test.ts`; run `npm test` → UI tests fail
2. Install `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` (dev dependencies)
3. Update `vitest.config.ts` with `environment: 'jsdom'` for component tests (or use per-file environment directive)
4. **GREEN** — Build Register page, Login page, logout control, middleware/route guards, placeholder dashboards
5. **REFACTOR** — Extract form components; tests stay green

**Automated test cases**:

| Test file | Test case | AC id |
|-----------|-----------|-------|
| `register/page.test.tsx` | renders all required fields (name, email, mobile, password, confirm, role) | AC-001 |
| `register/page.test.tsx` | shows validation error when passwords do not match | AC-003 |
| `register/page.test.tsx` | calls register API on valid submit | AC-001 |
| `register/page.test.tsx` | displays server error on duplicate email | AC-002 |
| `login/page.test.tsx` | renders username and password fields with helper text | AC-004 |
| `login/page.test.tsx` | calls login API on submit | AC-004 |
| `login/page.test.tsx` | shows generic error on 401 response | AC-007 |
| `login/page.test.tsx` | redirects teacher to `/teacher` on success | AC-011 |
| `login/page.test.tsx` | redirects student to `/student` on success | AC-011 |
| `middleware.test.ts` | unauthenticated request to `/teacher` redirects to `/login` | AC-012 |
| `middleware.test.ts` | unauthenticated request to `/student` redirects to `/login` | AC-012 |
| `middleware.test.ts` | student cannot access `/teacher` routes | AC-013 |
| `middleware.test.ts` | teacher cannot access `/student` routes | AC-013 |
| `middleware.test.ts` | authenticated teacher can access `/teacher` | AC-011 |
| `middleware.test.ts` | logout control triggers logout API and redirects to `/login` | AC-010 |

**Deliverables**:

- Register, Login, Teacher home, Student home pages
- Middleware or layout route guards
- All Phase 3 tests green

**Phase gate**: `npm test` passes (Phases 0–3).

---

### Phase 4: Acceptance Suite & Final Verification - COMPLETED

**Objective**: Run the full automated acceptance suite, lint, and build. Confirm every acceptance criterion has a green test.

**Prerequisites**: Phase 3 gate passed.

**Tasks (in order)**:

1. **RED** — Add `tests/acceptance/auth-acceptance.test.ts` aggregating end-to-end flows (register → login → me → logout); fix any gaps
2. **GREEN** — Full `npm test` suite passes (all phases)
3. Run `npm run lint` and `npm run build` — both must pass
4. Run `npm run preview` for optional manual smoke test on Workers runtime
5. Mark all `AC-*` acceptance criteria `[x]` in this PRD
6. Update **Current Status** with test count and pass rate

**Automated test cases**:

| Test file | Test case | AC id |
|-----------|-----------|-------|
| `auth-acceptance.test.ts` | full teacher journey: register → login → me → logout → me returns 401 | AC-001–AC-010 |
| `auth-acceptance.test.ts` | full student journey: register → login → role redirect | AC-001, AC-011 |
| `auth-acceptance.test.ts` | login via email, mobile, and name for same user | AC-004–AC-006 |
| `auth-acceptance.test.ts` | no plain-text password in DB after registration | AC-001 |
| `auth-acceptance.test.ts` | lint and build scripts exist and are documented | AC-014 |

**Deliverables**:

- Full Vitest suite green (`npm test`)
- `npm run lint` and `npm run build` pass
- All acceptance criteria checked off
- Documented test summary in **Current Status**

**Phase gate**: `npm test && npm run lint && npm run build` all pass.

---

## Technical Implementation Details

### Key Files

**Application**

- `wrangler.jsonc` — D1 binding configuration
- `migrations/0001_create_users.sql` — Initial schema
- `src/lib/db/users.ts` — User queries (create, find by identifier)
- `src/lib/auth/password.ts` — Hash and verify passwords
- `src/lib/auth/session.ts` — Create, read, destroy session cookie
- `src/lib/auth/validation.ts` — Registration/login payload validation
- `src/app/api/auth/register/route.ts` — Registration handler
- `src/app/api/auth/login/route.ts` — Login handler
- `src/app/api/auth/logout/route.ts` — Logout handler
- `src/app/api/auth/me/route.ts` — Current user handler
- `src/app/register/page.tsx` — Registration UI
- `src/app/login/page.tsx` — Login UI
- `src/middleware.ts` — Route protection

**Testing (Vitest)**

- `vitest.config.ts` — Vitest configuration, path aliases, environments
- `src/lib/auth/password.test.ts` — Phase 1
- `src/lib/auth/session.test.ts` — Phase 1
- `src/lib/auth/validation.test.ts` — Phase 1
- `src/lib/db/users.test.ts` — Phase 1
- `src/app/api/auth/register/route.test.ts` — Phase 2
- `src/app/api/auth/login/route.test.ts` — Phase 2
- `src/app/api/auth/logout/route.test.ts` — Phase 2
- `src/app/api/auth/me/route.test.ts` — Phase 2
- `src/app/register/page.test.tsx` — Phase 3
- `src/app/login/page.test.tsx` — Phase 3
- `src/middleware.test.ts` — Phase 3
- `tests/acceptance/auth-acceptance.test.ts` — Phase 4 full-flow suite

### Implementation Patterns

```typescript
// Login identifier lookup — always use bound parameters
const user = await db
  .prepare(
    `SELECT id, name, email, mobile, password_hash, role
     FROM users
     WHERE email = ?1 OR mobile = ?1 OR name = ?1
     LIMIT 1`
  )
  .bind(normalizedIdentifier)
  .first<UserRow>();
```

```typescript
// Session cookie — HTTP-only, Secure in production, SameSite=Lax
// Store session id or signed token; never store password or password_hash in cookie
```

```typescript
// Access D1 from route handlers
import { getCloudflareContext } from "@opennextjs/cloudflare";

const { env } = await getCloudflareContext();
const db = env.DB;
```

### Vitest Configuration (Phase 0)

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
    // Use /// @vitest-environment jsdom in Phase 3 component test files
  },
});
```

### TDD Example (Phase 1)

```typescript
// src/lib/auth/password.test.ts — write FIRST (RED)
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("AC-001: password hashing", () => {
  it("stores a hash that is not equal to the plain password", async () => {
    const plain = "SecurePass123!";
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(await verifyPassword(plain, hash)).toBe(true);
  });
});
```

### Important Notes

- Normalize mobile numbers before insert and lookup so `9876543210` and `+91 98765 43210` resolve to the same value.
- Use a single generic error for failed login to avoid account enumeration.
- `name` is not unique in the schema; if two users share the same display name, login by name is ambiguous — document this limitation; prefer email or mobile for login when duplicates exist.
- Apply migrations locally only (`wrangler d1 migrations apply <db> --local`); remote apply is the user's decision.
- Verify auth flows with `npm run preview`, not only `npm run dev`, because sessions and D1 bindings behave in the Workers runtime.
- **Never mark a phase complete without green tests.** Run `npm test` after every implementation step.
- Write tests **before** implementation code in each phase (TDD). Commit or checkpoint at red, then at green.

---

## Acceptance Criteria

Each criterion has an `AC-*` id mapped to Vitest tests. Mark `[x]` only when the mapped tests pass (green).

- [x] **AC-001** — A new user can register with name, email, mobile, password, and role; record appears in `users` with hashed password
- [x] **AC-002** — Registration rejects duplicate email or mobile with a clear error
- [x] **AC-003** — Registration rejects passwords shorter than 8 characters or without letter + number
- [x] **AC-004** — A registered user can log in using their **email** and password
- [x] **AC-005** — A registered user can log in using their **mobile number** and password
- [x] **AC-006** — A registered user can log in using their **name** and password (when name is unique)
- [x] **AC-007** — Login with wrong password returns 401 with a generic message
- [x] **AC-008** — Successful login sets an HTTP-only session cookie and returns user profile without password fields
- [x] **AC-009** — Authenticated user can call `GET /api/auth/me` and receive their profile
- [x] **AC-010** — Logout clears the session and subsequent `GET /api/auth/me` returns 401
- [x] **AC-011** — User with role `teacher` is redirected to `/teacher` after login; `student` to `/student`
- [x] **AC-012** — Unauthenticated access to `/teacher` or `/student` redirects to `/login`
- [x] **AC-013** — Student cannot access teacher-only routes (and vice versa)
- [x] **AC-014** — `npm test`, `npm run lint`, and `npm run build` all pass

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Automated test pass rate | 100% before each phase gate | `npm test` exit code + Vitest green/red report |
| Registration completion rate | > 95% of started registrations succeed on first attempt | `AC-001` / `AC-002` Vitest tests + server logs |
| Login success rate (valid credentials) | 100% | `AC-004`–`AC-006` Vitest tests |
| Session persistence | User stays logged in across page refresh until logout | `AC-009` / `AC-010` Vitest tests |
| Credential security | 0 plain-text passwords in DB or logs | `AC-001` password hash tests + DB inspection |

---

## Dependencies

### External Dependencies

- **Cloudflare D1** — Persistent user and session storage
- **bcryptjs** (proposed) — Password hashing compatible with Workers via `nodejs_compat`

### Dev / Test Dependencies

- **vitest** — TypeScript test runner; red/green TDD feedback
- **@vitest/coverage-v8** — Optional coverage reporting
- **vite-tsconfig-paths** — Resolve `@/` alias in tests
- **@cloudflare/vitest-pool-workers** — D1 + Workers runtime for API route tests (Phase 2)
- **@testing-library/react** — Component rendering and interaction (Phase 3)
- **@testing-library/jest-dom** — DOM matchers for component tests (Phase 3)
- **jsdom** — Browser-like environment for React component tests (Phase 3)

### Internal Dependencies

- **@opennextjs/cloudflare** — `getCloudflareContext()` for D1 access in route handlers
- **shadcn/ui** — Form inputs, buttons, labels, alerts for Register and Login pages
- **wrangler** — D1 creation, migrations, local development

### Environment Variables

| Variable | Purpose | Where set |
|----------|---------|-----------|
| `SESSION_SECRET` | Sign session cookies | `.dev.vars` locally; `wrangler secret put` in production |

Add placeholder to `.dev.vars.example` when implemented.

---

## Risks and Mitigation

### Technical Risks

- **Risk**: D1 binding unavailable in `npm run dev` (Node) but required in preview/deploy  
- **Mitigation**: Document that auth integration tests run under `npm run preview`; keep DB access in server-only modules

- **Risk**: Duplicate display names break login-by-name  
- **Mitigation**: Document limitation; consider unique constraint on normalized name in a future iteration

- **Risk**: Session fixation or cookie theft  
- **Mitigation**: HTTP-only, Secure, SameSite=Lax cookies; regenerate session id on login

### User Experience Risks

- **Risk**: Users unsure what to enter in the login "username" field  
- **Mitigation**: Helper text: "Enter your name, email, or mobile number"

- **Risk**: Weak passwords  
- **Mitigation**: Enforce minimum rules at registration; defer strength meter to a later iteration

---

## Troubleshooting Guide

### D1 binding not found at runtime

**Problem**: `env.DB` is undefined in API routes.  
**Cause**: Missing `d1_databases` in `wrangler.jsonc` or `cf-typegen` not run.  
**Solution**: Add binding, run `npm run cf-typegen`, restart preview.

### Login works in dev but not preview

**Problem**: Credentials valid in one environment only.  
**Cause**: `npm run dev` does not use Workers D1 bindings; data may exist only locally in Wrangler's D1.  
**Solution**: Apply migrations locally and test with `npm run preview`.

### Session not persisting after login

**Problem**: User redirected to login on every navigation.  
**Cause**: Cookie `Secure` flag on HTTP localhost, or wrong `SameSite` / path.  
**Solution**: Set `Secure` only in production; use `SameSite=Lax` and path `/`.

### Tests pass locally but fail in CI

**Problem**: Vitest suite fails in CI but passes on developer machine.  
**Cause**: Missing `SESSION_SECRET` in test env, or D1 migration not applied in test setup.  
**Solution**: Add `vitest.setup.ts` with test env defaults; run migrations in `beforeAll` for DB tests.

### All tests red after adding new phase

**Problem**: Expected during TDD — new tests written before implementation.  
**Cause**: RED phase of TDD workflow.  
**Solution**: Implement minimum code to turn tests green; do not skip failing tests.

---

## Notes for AI Agents

When working with this PRD:

1. Start by reading the Problem and Hypothesis to understand intent
2. Use Scope (In/Out/Cut) to determine boundaries — do **not** build test-bank or quiz features here
3. **Work phase by phase (0 → 4).** Do not start Phase N+1 until Phase N tests are green
4. **Apply TDD in every phase:** write failing Vitest tests first (red), implement (green), refactor
5. Map every test to an `AC-*` acceptance criterion id in `describe` block names
6. Update phase status markers as work progresses
7. Mark acceptance criteria `[x]` only when mapped Vitest tests pass
8. Add implementation details under "Technical Implementation Details" as code is written
9. Add troubleshooting entries when bugs are found and fixed
10. Keep all sections current — remove outdated information
11. Use code references format: `filepath:line-number` when citing code
12. Ask before adding dependencies; propose packages with reason when installing
13. Never apply D1 migrations to remote without explicit user request
14. Run `npm test` before claiming any phase or feature is complete
15. **Never commit or push.** The user reviews each phase and handles git themselves
16. **Never deploy.** The user handles production deployment

---

## Current Status

**Last Updated**: 2026-09-04  
**Last Updated**: 2026-09-04  
**Current Phase**: Phase 4 complete — all phases done  
**Status**: COMPLETED  
**Test Suite**: 66/66 tests passing (100%) across 14 test files  
**Acceptance Criteria**: AC-001 through AC-014 all green  
**Verification**: `npm test`, `npm run lint`, and `npm run build` pass  
**Manual smoke**: Run `npm run preview` locally to verify auth on the Workers runtime  
**Next Steps**: User review; commit when ready. Test-bank feature is a separate PRD.
