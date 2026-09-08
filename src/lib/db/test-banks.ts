import type {
	CreateQuestionInput,
	CreateTestBankInput,
	QuestionChoiceRecord,
	QuestionRecord,
	StudentTestBankDetail,
	TestBankDetail,
	TestBankRecord,
	TestBankSummary,
	UpdateTestBankInput,
} from "@/lib/test-bank/types";
import {
	validateCreateTestBankInput,
	validateQuestionInput,
} from "@/lib/test-bank/validation";

export class QuestionNotFoundError extends Error {
	constructor() {
		super("Question not found");
		this.name = "QuestionNotFoundError";
	}
}

export class TestBankNotFoundError extends Error {
	constructor() {
		super("Test bank not found");
		this.name = "TestBankNotFoundError";
	}
}

export class QuestionValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "QuestionValidationError";
	}
}

export class TestBankValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TestBankValidationError";
	}
}

type TestBankRow = {
	id: string;
	teacher_id: string;
	title: string;
	description: string | null;
	created_at: string;
	updated_at: string;
};

type QuestionRow = {
	id: string;
	prompt: string;
	sort_order: number;
};

type ChoiceRow = {
	id: string;
	choice_text: string;
	is_correct: number;
	sort_order: number;
};

function mapTestBank(row: TestBankRow): TestBankRecord {
	return {
		id: row.id,
		teacherId: row.teacher_id,
		title: row.title,
		description: row.description,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapChoice(row: ChoiceRow): QuestionChoiceRecord {
	return {
		id: row.id,
		choiceText: row.choice_text,
		isCorrect: row.is_correct === 1,
		sortOrder: row.sort_order,
	};
}

async function getOwnedTestBankRow(
	db: D1Database,
	bankId: string,
	teacherId: string,
): Promise<TestBankRow | null> {
	const row = await db
		.prepare(
			`SELECT id, teacher_id, title, description, created_at, updated_at
       FROM test_banks
       WHERE id = ?1 AND teacher_id = ?2
       LIMIT 1`,
		)
		.bind(bankId, teacherId)
		.first<TestBankRow>();

	return row ?? null;
}

async function loadQuestionsWithChoices(
	db: D1Database,
	bankId: string,
): Promise<QuestionRecord[]> {
	const questions = await db
		.prepare(
			`SELECT id, prompt, sort_order
       FROM questions
       WHERE test_bank_id = ?1
       ORDER BY sort_order ASC, created_at ASC`,
		)
		.bind(bankId)
		.all<QuestionRow>();

	const results: QuestionRecord[] = [];

	for (const question of questions.results) {
		const choices = await db
			.prepare(
				`SELECT id, choice_text, is_correct, sort_order
         FROM question_choices
         WHERE question_id = ?1
         ORDER BY sort_order ASC`,
			)
			.bind(question.id)
			.all<ChoiceRow>();

		results.push({
			id: question.id,
			prompt: question.prompt,
			sortOrder: question.sort_order,
			choices: choices.results.map(mapChoice),
		});
	}

	return results;
}

export async function createTestBank(
	db: D1Database,
	teacherId: string,
	input: CreateTestBankInput,
): Promise<TestBankRecord> {
	const validation = validateCreateTestBankInput(input);
	if (!validation.success) {
		throw new TestBankValidationError(
			validation.errors.title ?? "Invalid test bank input",
		);
	}

	await db
		.prepare(
			`INSERT INTO test_banks (teacher_id, title, description)
       VALUES (?1, ?2, ?3)`,
		)
		.bind(
			teacherId,
			validation.data.title,
			validation.data.description,
		)
		.run();

	const row = await db
		.prepare(
			`SELECT id, teacher_id, title, description, created_at, updated_at
       FROM test_banks
       WHERE teacher_id = ?1 AND title = ?2
       ORDER BY created_at DESC
       LIMIT 1`,
		)
		.bind(teacherId, validation.data.title)
		.first<TestBankRow>();

	if (!row) {
		throw new Error("Failed to create test bank");
	}

	return mapTestBank(row);
}

export async function listTestBanksByTeacher(
	db: D1Database,
	teacherId: string,
): Promise<TestBankSummary[]> {
	const banks = await db
		.prepare(
			`SELECT id, title, description, created_at, updated_at
       FROM test_banks
       WHERE teacher_id = ?1
       ORDER BY updated_at DESC, created_at DESC`,
		)
		.bind(teacherId)
		.all<{
			id: string;
			title: string;
			description: string | null;
			created_at: string;
			updated_at: string;
		}>();

	const summaries: TestBankSummary[] = [];

	for (const bank of banks.results) {
		const countRow = await db
			.prepare(
				"SELECT COUNT(*) as count FROM questions WHERE test_bank_id = ?1",
			)
			.bind(bank.id)
			.first<{ count: number }>();

		summaries.push({
			id: bank.id,
			title: bank.title,
			description: bank.description,
			questionCount: countRow?.count ?? 0,
			createdAt: bank.created_at,
			updatedAt: bank.updated_at,
		});
	}

	return summaries;
}

async function buildTestBankSummaries(
	db: D1Database,
	banks: Array<{
		id: string;
		title: string;
		description: string | null;
		created_at: string;
		updated_at: string;
	}>,
): Promise<TestBankSummary[]> {
	const summaries: TestBankSummary[] = [];

	for (const bank of banks) {
		const countRow = await db
			.prepare(
				"SELECT COUNT(*) as count FROM questions WHERE test_bank_id = ?1",
			)
			.bind(bank.id)
			.first<{ count: number }>();

		summaries.push({
			id: bank.id,
			title: bank.title,
			description: bank.description,
			questionCount: countRow?.count ?? 0,
			createdAt: bank.created_at,
			updatedAt: bank.updated_at,
		});
	}

	return summaries;
}

export async function listAllTestBanks(
	db: D1Database,
): Promise<TestBankSummary[]> {
	const banks = await db
		.prepare(
			`SELECT id, title, description, created_at, updated_at
       FROM test_banks
       ORDER BY updated_at DESC, created_at DESC`,
		)
		.all<{
			id: string;
			title: string;
			description: string | null;
			created_at: string;
			updated_at: string;
		}>();

	return buildTestBankSummaries(db, banks.results);
}

export async function getTestBankForStudent(
	db: D1Database,
	bankId: string,
): Promise<StudentTestBankDetail | null> {
	const row = await db
		.prepare(
			`SELECT id, title, description
       FROM test_banks
       WHERE id = ?1
       LIMIT 1`,
		)
		.bind(bankId)
		.first<{
			id: string;
			title: string;
			description: string | null;
		}>();

	if (!row) {
		return null;
	}

	const questions = await loadQuestionsWithChoices(db, bankId);

	return {
		id: row.id,
		title: row.title,
		description: row.description,
		questions: questions.map((question) => ({
			id: question.id,
			prompt: question.prompt,
			sortOrder: question.sortOrder,
			choices: question.choices.map((choice) => ({
				id: choice.id,
				choiceText: choice.choiceText,
				sortOrder: choice.sortOrder,
			})),
		})),
	};
}

export async function getTestBankById(
	db: D1Database,
	bankId: string,
	teacherId: string,
): Promise<TestBankDetail | null> {
	const row = await getOwnedTestBankRow(db, bankId, teacherId);
	if (!row) {
		return null;
	}

	const questions = await loadQuestionsWithChoices(db, bankId);

	return {
		...mapTestBank(row),
		questions,
	};
}

export async function addQuestion(
	db: D1Database,
	bankId: string,
	teacherId: string,
	input: CreateQuestionInput,
): Promise<QuestionRecord> {
	const bank = await getOwnedTestBankRow(db, bankId, teacherId);
	if (!bank) {
		throw new TestBankNotFoundError();
	}

	const validation = validateQuestionInput(input);
	if (!validation.success) {
		throw new QuestionValidationError(
			validation.errors.choices ??
				validation.errors.prompt ??
				"Invalid question input",
		);
	}

	const orderRow = await db
		.prepare(
			"SELECT COALESCE(MAX(sort_order), -1) as max_order FROM questions WHERE test_bank_id = ?1",
		)
		.bind(bankId)
		.first<{ max_order: number }>();

	const sortOrder = (orderRow?.max_order ?? -1) + 1;

	await db
		.prepare(
			`INSERT INTO questions (test_bank_id, prompt, sort_order)
       VALUES (?1, ?2, ?3)`,
		)
		.bind(bankId, validation.data.prompt, sortOrder)
		.run();

	const questionRow = await db
		.prepare(
			`SELECT id, prompt, sort_order
       FROM questions
       WHERE test_bank_id = ?1 AND prompt = ?2
       ORDER BY created_at DESC
       LIMIT 1`,
		)
		.bind(bankId, validation.data.prompt)
		.first<QuestionRow>();

	if (!questionRow) {
		throw new Error("Failed to create question");
	}

	const choices: QuestionChoiceRecord[] = [];

	for (const [index, choice] of validation.data.choices.entries()) {
		await db
			.prepare(
				`INSERT INTO question_choices (question_id, choice_text, is_correct, sort_order)
         VALUES (?1, ?2, ?3, ?4)`,
			)
			.bind(
				questionRow.id,
				choice.choiceText,
				choice.isCorrect ? 1 : 0,
				index,
			)
			.run();

		const choiceRow = await db
			.prepare(
				`SELECT id, choice_text, is_correct, sort_order
         FROM question_choices
         WHERE question_id = ?1 AND sort_order = ?2
         LIMIT 1`,
			)
			.bind(questionRow.id, index)
			.first<ChoiceRow>();

		if (choiceRow) {
			choices.push(mapChoice(choiceRow));
		}
	}

	return {
		id: questionRow.id,
		prompt: questionRow.prompt,
		sortOrder: questionRow.sort_order,
		choices,
	};
}

export async function deleteTestBank(
	db: D1Database,
	bankId: string,
	teacherId: string,
): Promise<boolean> {
	const bank = await getOwnedTestBankRow(db, bankId, teacherId);
	if (!bank) {
		return false;
	}

	await db.prepare("DELETE FROM test_banks WHERE id = ?1").bind(bankId).run();

	return true;
}

export async function updateTestBank(
	db: D1Database,
	bankId: string,
	teacherId: string,
	input: UpdateTestBankInput,
): Promise<TestBankRecord | null> {
	const bank = await getOwnedTestBankRow(db, bankId, teacherId);
	if (!bank) {
		return null;
	}

	const title = input.title !== undefined ? input.title : bank.title;
	const description =
		input.description !== undefined ? input.description : bank.description;

	const validation = validateCreateTestBankInput({ title, description });
	if (!validation.success) {
		throw new TestBankValidationError(
			validation.errors.title ?? "Invalid test bank input",
		);
	}

	await db
		.prepare(
			`UPDATE test_banks
       SET title = ?1, description = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3`,
		)
		.bind(validation.data.title, validation.data.description, bankId)
		.run();

	const updated = await getOwnedTestBankRow(db, bankId, teacherId);
	if (!updated) {
		return null;
	}

	return mapTestBank(updated);
}

async function getOwnedQuestionRow(
	db: D1Database,
	bankId: string,
	questionId: string,
	teacherId: string,
): Promise<QuestionRow | null> {
	const bank = await getOwnedTestBankRow(db, bankId, teacherId);
	if (!bank) {
		return null;
	}

	const row = await db
		.prepare(
			`SELECT id, prompt, sort_order
       FROM questions
       WHERE id = ?1 AND test_bank_id = ?2
       LIMIT 1`,
		)
		.bind(questionId, bankId)
		.first<QuestionRow>();

	return row ?? null;
}

async function replaceQuestionChoices(
	db: D1Database,
	questionId: string,
	choices: CreateQuestionInput["choices"],
): Promise<QuestionChoiceRecord[]> {
	await db
		.prepare("DELETE FROM question_choices WHERE question_id = ?1")
		.bind(questionId)
		.run();

	const records: QuestionChoiceRecord[] = [];

	for (const [index, choice] of choices.entries()) {
		await db
			.prepare(
				`INSERT INTO question_choices (question_id, choice_text, is_correct, sort_order)
         VALUES (?1, ?2, ?3, ?4)`,
			)
			.bind(
				questionId,
				choice.choiceText,
				choice.isCorrect ? 1 : 0,
				index,
			)
			.run();

		const choiceRow = await db
			.prepare(
				`SELECT id, choice_text, is_correct, sort_order
         FROM question_choices
         WHERE question_id = ?1 AND sort_order = ?2
         LIMIT 1`,
			)
			.bind(questionId, index)
			.first<ChoiceRow>();

		if (choiceRow) {
			records.push(mapChoice(choiceRow));
		}
	}

	return records;
}

export async function updateQuestion(
	db: D1Database,
	bankId: string,
	questionId: string,
	teacherId: string,
	input: CreateQuestionInput,
): Promise<QuestionRecord> {
	const question = await getOwnedQuestionRow(db, bankId, questionId, teacherId);
	if (!question) {
		throw new QuestionNotFoundError();
	}

	const validation = validateQuestionInput(input);
	if (!validation.success) {
		throw new QuestionValidationError(
			validation.errors.choices ??
				validation.errors.prompt ??
				"Invalid question input",
		);
	}

	await db
		.prepare(
			`UPDATE questions
       SET prompt = ?1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?2`,
		)
		.bind(validation.data.prompt, questionId)
		.run();

	const choices = await replaceQuestionChoices(
		db,
		questionId,
		validation.data.choices,
	);

	return {
		id: questionId,
		prompt: validation.data.prompt,
		sortOrder: question.sort_order,
		choices,
	};
}

export async function deleteQuestion(
	db: D1Database,
	bankId: string,
	questionId: string,
	teacherId: string,
): Promise<boolean> {
	const question = await getOwnedQuestionRow(db, bankId, questionId, teacherId);
	if (!question) {
		return false;
	}

	await db.prepare("DELETE FROM questions WHERE id = ?1").bind(questionId).run();

	return true;
}
