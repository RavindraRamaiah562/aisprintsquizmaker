import { beforeEach, describe, expect, it } from "vitest";

import { createUser } from "@/lib/db/users";
import { createTestDatabase } from "@/test/d1-test-utils";

import {
	addQuestion,
	createTestBank,
	deleteTestBank,
	getTestBankById,
	listTestBanksByTeacher,
} from "./test-banks";

const teacherAInput = {
	name: "Jane Teacher",
	email: "jane@school.edu",
	mobile: "+919876543210",
	password: "SecurePass123!",
	role: "teacher" as const,
};

const teacherBInput = {
	name: "Bob Teacher",
	email: "bob@school.edu",
	mobile: "+919876543211",
	password: "SecurePass123!",
	role: "teacher" as const,
};

const sampleQuestion = {
	prompt: "What is 2 + 2?",
	choices: [
		{ choiceText: "3", isCorrect: false },
		{ choiceText: "4", isCorrect: true },
		{ choiceText: "5", isCorrect: false },
	],
};

describe("AC-001: createTestBank", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("createTestBank inserts row with teacher_id", async () => {
		const teacher = await createUser(db, teacherAInput);

		const bank = await createTestBank(db, teacher.id, {
			title: "Chapter 5 Review",
			description: "Fractions",
		});

		const row = await db
			.prepare("SELECT teacher_id, title FROM test_banks WHERE id = ?1")
			.bind(bank.id)
			.first<{ teacher_id: string; title: string }>();

		expect(row?.teacher_id).toBe(teacher.id);
		expect(row?.title).toBe("Chapter 5 Review");
	});

	it("migration creates test_banks, questions, and question_choices tables", async () => {
		const tables = await db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
			)
			.all<{ name: string }>();

		const names = tables.results.map((row) => row.name);
		expect(names).toContain("test_banks");
		expect(names).toContain("questions");
		expect(names).toContain("question_choices");
	});
});

describe("AC-002: listTestBanksByTeacher", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("returns only that teacher's banks", async () => {
		const teacherA = await createUser(db, teacherAInput);
		const teacherB = await createUser(db, teacherBInput);

		await createTestBank(db, teacherA.id, { title: "Bank A1" });
		await createTestBank(db, teacherA.id, { title: "Bank A2" });
		await createTestBank(db, teacherB.id, { title: "Bank B1" });

		const banks = await listTestBanksByTeacher(db, teacherA.id);

		expect(banks).toHaveLength(2);
		expect(banks.every((bank) => bank.title.startsWith("Bank A"))).toBe(true);
	});
});

describe("AC-003: getTestBankById", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("returns bank with questions and choices", async () => {
		const teacher = await createUser(db, teacherAInput);
		const bank = await createTestBank(db, teacher.id, {
			title: "Math Quiz",
		});

		await addQuestion(db, bank.id, teacher.id, sampleQuestion);

		const detail = await getTestBankById(db, bank.id, teacher.id);

		expect(detail).not.toBeNull();
		expect(detail?.questions).toHaveLength(1);
		expect(detail?.questions[0]?.choices).toHaveLength(3);
		expect(
			detail?.questions[0]?.choices.filter((choice) => choice.isCorrect),
		).toHaveLength(1);
	});
});

describe("AC-004, AC-005: addQuestion", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("inserts question and choices with one correct", async () => {
		const teacher = await createUser(db, teacherAInput);
		const bank = await createTestBank(db, teacher.id, { title: "Science" });

		const question = await addQuestion(
			db,
			bank.id,
			teacher.id,
			sampleQuestion,
		);

		expect(question.prompt).toBe(sampleQuestion.prompt);
		expect(question.choices).toHaveLength(3);
		expect(question.choices.filter((c) => c.isCorrect)).toHaveLength(1);

		const choiceRows = await db
			.prepare(
				"SELECT is_correct FROM question_choices WHERE question_id = ?1",
			)
			.bind(question.id)
			.all<{ is_correct: number }>();

		expect(choiceRows.results.filter((row) => row.is_correct === 1)).toHaveLength(
			1,
		);
	});
});

describe("AC-007: deleteTestBank", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("removes bank and cascaded questions", async () => {
		const teacher = await createUser(db, teacherAInput);
		const bank = await createTestBank(db, teacher.id, { title: "Temp Bank" });
		await addQuestion(db, bank.id, teacher.id, sampleQuestion);

		const deleted = await deleteTestBank(db, bank.id, teacher.id);
		expect(deleted).toBe(true);

		const bankRow = await db
			.prepare("SELECT id FROM test_banks WHERE id = ?1")
			.bind(bank.id)
			.first();
		const questionRow = await db
			.prepare("SELECT id FROM questions WHERE test_bank_id = ?1")
			.bind(bank.id)
			.first();

		expect(bankRow).toBeNull();
		expect(questionRow).toBeNull();
	});
});

describe("AC-008: ownership", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("returns null when another teacher requests the bank", async () => {
		const teacherA = await createUser(db, teacherAInput);
		const teacherB = await createUser(db, teacherBInput);
		const bank = await createTestBank(db, teacherA.id, { title: "Private Bank" });

		const detail = await getTestBankById(db, bank.id, teacherB.id);

		expect(detail).toBeNull();
	});
});
