Date created: 2026-09-05
Date last modified: 2026-09-05

# Teacher Test Bank (Multiple Choice) - Technical PRD

## Overview/Problem

Teachers need a place to build and manage quiz content before students can take assessments. Authentication is complete, but the teacher dashboard is a placeholder: there is no way to create a test bank, add multiple-choice questions, or maintain a reusable question library.

This feature lets authenticated **teachers** create test banks, add MCQ questions with several answer choices (exactly one correct), and edit or delete their own content. Students cannot access test-bank management; they will consume tests in a future PRD.

---

## Hypothesis

We believe that letting teachers create test banks with multiple-choice questions in a simple CRUD flow will give them a reusable content library and unblock student quiz-taking in the next phase.

---

## Scope

### In Scope

- **Test banks** owned by the creating teacher (`teacher_id` → `users.id`)
- **Multiple-choice questions** per test bank (prompt + 2–6 choices, exactly one marked correct)
- D1 schema: `test_banks`, `questions`, `question_choices`
- Teacher-only API routes under `/api/teacher/test-banks`
- Teacher UI: list banks, create bank, view/edit bank, add/edit/delete questions
- Authorization: only the owning teacher can read/update/delete their banks and questions
- Input validation and clear error messages
- **TDD with Vitest** in every phase (red → green → refactor)
- Automated tests mapped to `AC-*` acceptance criteria

### Out of Scope

- Student quiz-taking or scoring (future PRD)
- Sharing test banks between teachers
- Public or student-visible test preview
- Question types other than single-answer MCQ (true/false, multi-select, short answer)
- Rich text / images in question stems or choices
- Import/export (CSV, QTI)
- AI-generated questions
- Test bank categories, tags, or search
- Version history or audit log

### Cut

- **JSON blob for choices on `questions` row** — Rejected; normalized `question_choices` table keeps validation and queries explicit.
- **Soft delete** — Rejected for initial build; hard delete with `ON DELETE CASCADE` is simpler.
- **Drag-and-drop reorder UI** — Rejected; store `sort_order` integer; UI can use simple up/down later.

---

## Technical Requirements

### Database Schema

Migration file: `migrations/0002_create_test_bank_tables.sql`

#### `test_banks`

```sql
CREATE TABLE test_banks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_banks_teacher_id ON test_banks (teacher_id);
```

#### `questions`

```sql
CREATE TABLE questions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  test_bank_id TEXT NOT NULL REFERENCES test_banks(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_test_bank_id ON questions (test_bank_id);
```

#### `question_choices`

```sql
CREATE TABLE question_choices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_question_choices_question_id ON question_choices (question_id);
```

**Business rules (enforced in application layer)**

| Rule | Constraint |
|------|------------|
| Test bank title | Required, 3–200 characters, trimmed |
| Question prompt | Required, 5–2000 characters, trimmed |
| Choices per question | Minimum 2, maximum 6 |
| Choice text | Required, 1–500 characters each, trimmed |
| Correct answers | Exactly **one** choice with `is_correct = 1` per question |
| Ownership | `test_banks.teacher_id` must match authenticated teacher |

---

### API Endpoints

All routes require an authenticated **teacher** session. Return `401` if unauthenticated, `403` if user is not a teacher or not the bank owner.

#### GET /api/teacher/test-banks

List test banks for the current teacher.

**Response:**

- Success (200): `{ "testBanks": [{ "id", "title", "description", "questionCount", "createdAt", "updatedAt" }] }`
- Error (401): Not authenticated
- Error (403): Not a teacher

#### POST /api/teacher/test-banks

Create a new test bank.

**Request Body:**

```json
{
  "title": "Chapter 5 Review",
  "description": "Optional description"
}
```

**Response:**

- Success (201): `{ "testBank": { "id", "title", "description", "teacherId", "createdAt", "updatedAt" } }`
- Error (400): Validation error
- Error (401/403): Auth errors

#### GET /api/teacher/test-banks/[id]

Get one test bank with all questions and choices.

**Response:**

- Success (200): `{ "testBank": { ... }, "questions": [{ "id", "prompt", "sortOrder", "choices": [{ "id", "choiceText", "isCorrect", "sortOrder" }] }] }`
- Error (404): Bank not found or not owned by teacher

#### PATCH /api/teacher/test-banks/[id]

Update bank title/description.

**Request Body:**

```json
{
  "title": "Updated title",
  "description": "Updated description"
}
```

**Response:**

- Success (200): Updated `testBank` object
- Error (400/404): Validation or not found

#### DELETE /api/teacher/test-banks/[id]

Delete bank and all questions/choices (cascade).

**Response:**

- Success (200): `{ "success": true }`
- Error (404): Not found or not owned

#### POST /api/teacher/test-banks/[id]/questions

Add an MCQ to a test bank.

**Request Body:**

```json
{
  "prompt": "What is 2 + 2?",
  "choices": [
    { "choiceText": "3", "isCorrect": false },
    { "choiceText": "4", "isCorrect": true },
    { "choiceText": "5", "isCorrect": false }
  ]
}
```

**Response:**

- Success (201): `{ "question": { "id", "prompt", "sortOrder", "choices": [...] } }`
- Error (400): Validation (wrong choice count, no correct answer, multiple correct, etc.)
- Error (404): Bank not found or not owned

#### PATCH /api/teacher/test-banks/[id]/questions/[questionId]

Update question prompt and/or choices (full replacement of choices array).

**Response:**

- Success (200): Updated `question` object
- Error (400/404): Validation or not found

#### DELETE /api/teacher/test-banks/[id]/questions/[questionId]

Delete a question and its choices.

**Response:**

- Success (200): `{ "success": true }`
- Error (404): Not found or not owned

---

### User Interface Requirements

#### Test Bank List (`/teacher/test-banks`)

- Visible only to authenticated teachers (existing `requireRole('teacher')` layout)
- Lists teacher's test banks with title, description snippet, question count
- **Create test bank** button → `/teacher/test-banks/new`
- Each row links to `/teacher/test-banks/[id]`
- Empty state when no banks exist

#### Create Test Bank (`/teacher/test-banks/new`)

- Fields: **Title** (required), **Description** (optional)
- Submit → `POST /api/teacher/test-banks` → redirect to bank detail page
- Cancel / back link to list

#### Test Bank Detail (`/teacher/test-banks/[id]`)

- Show bank title and description (editable inline or via edit form)
- List all MCQ questions with prompt and choice count; indicate which choice is correct (teacher view only)
- **Add question** form or modal: prompt + dynamic choice rows (add/remove), radio to mark one correct
- Edit and delete per question
- Delete entire test bank (with confirmation)
- Validation errors shown inline

#### Navigation

- Add link from `/teacher` dashboard to **Test banks**
- Header remains teacher layout with logout

---

## Testing Strategy (TDD + Vitest)

Same workflow as `USER_REG_LOGIN_LOGOUT_PRD.md`:

```
1. RED    — Write failing Vitest tests; npm test → fail
2. GREEN  — Implement minimum code; npm test → pass
3. REFACTOR — Clean up; tests stay green
4. GATE   — Phase complete only when all phase tests + prior tests pass
```

### Test file layout

```
migrations/0002_create_test_bank_tables.sql
src/lib/test-bank/
  validation.ts
  validation.test.ts              # Phase 1
src/lib/db/
  test-banks.ts
  test-banks.test.ts              # Phase 1
src/app/api/teacher/test-banks/
  route.ts
  route.test.ts                   # Phase 2
  [id]/route.ts
  [id]/route.test.ts              # Phase 2
  [id]/questions/route.ts
  [id]/questions/route.test.ts    # Phase 2
  [id]/questions/[questionId]/route.ts
  [id]/questions/[questionId]/route.test.ts  # Phase 2
src/app/teacher/test-banks/
  page.tsx
  page.test.tsx                   # Phase 3
  new/page.tsx
  new/page.test.tsx               # Phase 3
  [id]/page.tsx
  [id]/page.test.tsx              # Phase 3
tests/acceptance/
  test-bank-acceptance.test.ts    # Phase 4
```

Reuse `src/test/auth-api-mock.ts` patterns; extend with teacher session helpers.

---

## Implementation Phases

> **Prerequisite**: `USER_REG_LOGIN_LOGOUT_PRD.md` Phases 0–4 complete.  
> **Rule**: Complete phases in order. Do not commit or deploy unless the user asks.

### Phase 1: Database & Test Bank Domain Layer - COMPLETED

**Objective**: Migration, validation, and D1 access modules for test banks and MCQ questions.

**Tasks (in order)**:

1. **RED** — Write `validation.test.ts` and `test-banks.test.ts`
2. Add `migrations/0002_create_test_bank_tables.sql`
3. Apply migration locally: `npx wrangler d1 migrations apply rndquizmaker-db --local`
4. Run `npm run cf-typegen`
5. **GREEN** — Implement `src/lib/test-bank/validation.ts`, `src/lib/db/test-banks.ts`
6. **REFACTOR** — Shared types in `src/lib/test-bank/types.ts`

**Automated test cases**:

| Test file | Test case | AC id |
|-----------|-----------|-------|
| `validation.test.ts` | rejects title shorter than 3 characters | AC-001 |
| `validation.test.ts` | rejects question with fewer than 2 choices | AC-004 |
| `validation.test.ts` | rejects question with more than 6 choices | AC-004 |
| `validation.test.ts` | rejects question with zero correct choices | AC-005 |
| `validation.test.ts` | rejects question with multiple correct choices | AC-005 |
| `validation.test.ts` | accepts valid bank and question payloads | AC-001, AC-004 |
| `test-banks.test.ts` | `createTestBank` inserts row with teacher_id | AC-001 |
| `test-banks.test.ts` | `listTestBanksByTeacher` returns only that teacher's banks | AC-002 |
| `test-banks.test.ts` | `getTestBankById` returns bank with questions and choices | AC-003 |
| `test-banks.test.ts` | `addQuestion` inserts question and choices with one correct | AC-004, AC-005 |
| `test-banks.test.ts` | `deleteTestBank` removes bank and cascaded questions | AC-007 |
| `test-banks.test.ts` | teacher cannot access another teacher's bank (returns null) | AC-008 |
| `test-banks.test.ts` | migration creates test_banks, questions, question_choices tables | AC-001 |

**Phase gate**: `npm test` passes (auth suite + Phase 1 tests).

---

### Phase 2: Teacher API Routes - COMPLETED

**Objective**: Expose CRUD API for test banks and questions; teacher auth on every route.

**Tasks (in order)**:

1. **RED** — Write route test files
2. Implement helper `requireTeacherApiUser()` using existing session + role check
3. **GREEN** — Implement all API route handlers
4. **REFACTOR** — Shared JSON error helpers

**Automated test cases**:

| Test file | Test case | AC id |
|-----------|-----------|-------|
| `route.test.ts` | GET lists banks for authenticated teacher | AC-002 |
| `route.test.ts` | POST creates bank → 201 | AC-001 |
| `route.test.ts` | POST without session → 401 | AC-008 |
| `route.test.ts` | POST as student → 403 | AC-008 |
| `[id]/route.test.ts` | GET returns bank with questions | AC-003 |
| `[id]/route.test.ts` | GET another teacher's bank → 404 | AC-008 |
| `[id]/route.test.ts` | PATCH updates title/description | AC-006 |
| `[id]/route.test.ts` | DELETE removes bank | AC-007 |
| `questions/route.test.ts` | POST adds valid MCQ → 201 | AC-004 |
| `questions/route.test.ts` | POST invalid MCQ (no correct) → 400 | AC-005 |
| `questions/[questionId]/route.test.ts` | PATCH updates question | AC-006 |
| `questions/[questionId]/route.test.ts` | DELETE removes question | AC-007 |

**Phase gate**: `npm test` passes (Phases 0–2 auth + Phase 1–2 test bank).

---

### Phase 3: Teacher UI - COMPLETED

**Objective**: Test bank list, create, and detail pages with MCQ management.

**Tasks (in order)**:

1. **RED** — Write `page.test.tsx` files
2. **GREEN** — Build pages and forms using shadcn/ui (`field`, `input`, `button`, `card`, `table`)
3. Update `/teacher` dashboard with link to test banks
4. **REFACTOR** — Extract `TestBankForm`, `QuestionForm` components

**Automated test cases**:

| Test file | Test case | AC id |
|-----------|-----------|-------|
| `test-banks/page.test.tsx` | renders list and create button | AC-002 |
| `test-banks/page.test.tsx` | shows empty state when no banks | AC-002 |
| `new/page.test.tsx` | submits create bank API on valid form | AC-001 |
| `[id]/page.test.tsx` | displays questions for a bank | AC-003 |
| `[id]/page.test.tsx` | add question form calls POST API | AC-004 |
| `[id]/page.test.tsx` | shows validation error when no correct choice selected | AC-005 |
| `[id]/page.test.tsx` | delete bank calls DELETE API | AC-007 |

**Phase gate**: `npm test` passes (all prior + Phase 3 UI tests).

---

### Phase 4: Acceptance Suite & Verification - COMPLETED

**Objective**: End-to-end acceptance tests, lint, build.

**Tasks**:

1. **RED/GREEN** — `tests/acceptance/test-bank-acceptance.test.ts`
2. Run `npm test`, `npm run lint`, `npm run build`
3. Optional: `npm run preview` manual smoke on Workers runtime
4. Mark all `AC-*` complete in this PRD

**Automated test cases**:

| Test file | Test case | AC id |
|-----------|-----------|-------|
| `test-bank-acceptance.test.ts` | teacher creates bank → adds MCQ → lists → deletes | AC-001–AC-007 |
| `test-bank-acceptance.test.ts` | student session cannot create bank | AC-008 |
| `test-bank-acceptance.test.ts` | teacher A cannot read teacher B's bank | AC-008 |
| `test-bank-acceptance.test.ts` | lint/build scripts present | AC-009 |

**Phase gate**: `npm test && npm run lint && npm run build` all pass.

---

## Technical Implementation Details

### Key Files (planned)

**Domain & data**

- `src/lib/test-bank/types.ts` — `TestBank`, `Question`, `QuestionChoice`, DTOs
- `src/lib/test-bank/validation.ts` — Bank and MCQ validation
- `src/lib/db/test-banks.ts` — All D1 queries

**API**

- `src/lib/auth/require-teacher-api.ts` — Session + teacher role for route handlers
- `src/app/api/teacher/test-banks/**` — REST handlers

**UI**

- `src/app/teacher/test-banks/**` — Pages
- `src/components/test-bank/**` — Forms and lists

### Implementation patterns

```typescript
// Ownership check — always verify teacher_id before returning data
const bank = await getTestBankById(db, bankId);
if (!bank || bank.teacherId !== currentUser.id) {
  return NextResponse.json({ message: "Not found" }, { status: 404 });
}
```

```typescript
// MCQ insert in a transaction-style batch (D1 batch)
await db.batch([
  db.prepare("INSERT INTO questions ...").bind(...),
  // ... choice inserts
]);
```

### Important notes

- Use numbered placeholders (`?1`, `?2`) in all D1 SQL.
- Never expose `isCorrect` to student-facing APIs (future PRD); teacher API may include it.
- Apply migrations locally only unless user explicitly requests remote apply.
- Reuse `createTestDatabase()` in tests; extend migration runner to apply `0002` after `0001`.
- Do not commit or deploy unless the user asks.

---

## Acceptance Criteria

Mark `[x]` only when mapped Vitest tests are green.

- [x] **AC-001** — Teacher can create a test bank with title (and optional description)
- [x] **AC-002** — Teacher sees a list of only their own test banks
- [x] **AC-003** — Teacher can open a test bank and view its questions and choices
- [x] **AC-004** — Teacher can add an MCQ with 2–6 choices
- [x] **AC-005** — System rejects MCQ with zero or multiple correct answers
- [x] **AC-006** — Teacher can update bank metadata and edit questions
- [x] **AC-007** — Teacher can delete questions and entire test banks
- [x] **AC-008** — Students and non-owners cannot access teacher test-bank APIs
- [x] **AC-009** — `npm test`, `npm run lint`, and `npm run build` pass after implementation

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Test pass rate | 100% at each phase gate | `npm test` exit code |
| MCQ validation coverage | All invalid choice rules have failing tests | Phase 1 + 2 tests |
| Teacher isolation | 0 cross-teacher data leaks in tests | AC-008 tests |
| Bank creation time | < 2 minutes for bank + 5 questions in manual QA | Manual preview test |

---

## Dependencies

### External Dependencies

- **Cloudflare D1** — Storage for test banks and questions

### Internal Dependencies

- **USER_REG_LOGIN_LOGOUT_PRD** (complete) — Sessions, `users` table, `requireRole('teacher')`
- **Vitest** — Already configured
- **shadcn/ui** — Form and layout components

### New migration

- `0002_create_test_bank_tables.sql` — Apply locally only

---

## Risks and Mitigation

### Technical Risks

- **Risk**: D1 `batch()` partial failure when inserting question + choices  
- **Mitigation**: Validate before insert; use batch in fixed order; add integration test for rollback behavior

- **Risk**: Cascade delete removes content unintentionally  
- **Mitigation**: Confirm dialog in UI; test DELETE endpoints

### User Experience Risks

- **Risk**: Teachers add MCQ without marking correct answer  
- **Mitigation**: Client + server validation; clear error on submit

- **Risk**: Long choice lists clutter UI  
- **Mitigation**: Cap at 6 choices; simple form layout first

---

## Troubleshooting Guide

_(To be filled during implementation.)_

### Migration 0002 not applied

**Problem**: `no such table: test_banks`  
**Cause**: Migration not applied locally  
**Solution**: `npx wrangler d1 migrations apply rndquizmaker-db --local`

### 403 on teacher API despite login

**Problem**: Teacher routes return 403  
**Cause**: User registered as `student` or session missing  
**Solution**: Register/login as teacher; verify `GET /api/auth/me` returns `role: "teacher"`

---

## Notes for AI Agents

When working with this PRD:

1. Read `USER_REG_LOGIN_LOGOUT_PRD.md` for auth patterns already implemented
2. Work phase by phase (1 → 4); do not skip TDD red step
3. Map tests to `AC-*` ids in `describe` block names
4. **Never commit or push** unless the user explicitly asks
5. **Never deploy** unless the user explicitly asks
6. **Never apply D1 migrations to remote** without explicit user request
7. Run `npm test`, `npm run lint`, `npm run build` before claiming a phase complete
8. Ask before adding new npm dependencies

---

## Current Status

**Last Updated**: 2026-09-05  
**Current Phase**: Complete — all phases delivered  
**Status**: COMPLETED  
**Test Suite**: 103 tests passing (66 auth + 37 test-bank)  
**Next Steps**: User review; optional `npm run preview` smoke test; commit when approved
