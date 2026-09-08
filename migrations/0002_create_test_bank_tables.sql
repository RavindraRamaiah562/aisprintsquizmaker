CREATE TABLE test_banks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_banks_teacher_id ON test_banks (teacher_id);

CREATE TABLE questions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  test_bank_id TEXT NOT NULL REFERENCES test_banks(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_test_bank_id ON questions (test_bank_id);

CREATE TABLE question_choices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_question_choices_question_id ON question_choices (question_id);
