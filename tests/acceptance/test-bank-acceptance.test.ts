import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import {
	getStudentSessionCookie,
	getTeacherSessionCookie,
	jsonRequest,
	resetMockDb,
} from "@/test/auth-api-mock";

import "@/test/auth-api-mock";

const sampleQuestion = {
	prompt: "What is 2 + 2?",
	choices: [
		{ choiceText: "3", isCorrect: false },
		{ choiceText: "4", isCorrect: true },
		{ choiceText: "5", isCorrect: false },
	],
};

async function createBank(
	sessionCookie: string,
	title: string,
	description?: string,
) {
	const { POST } = await import("@/app/api/teacher/test-banks/route");

	return POST(
		jsonRequest(
			"/api/teacher/test-banks",
			"POST",
			{ title, description },
			sessionCookie,
		),
	);
}

async function listBanks(sessionCookie: string) {
	const { GET } = await import("@/app/api/teacher/test-banks/route");

	return GET(
		jsonRequest(
			"/api/teacher/test-banks",
			"GET",
			undefined,
			sessionCookie,
		),
	);
}

async function getBank(sessionCookie: string, bankId: string) {
	const { GET } = await import("@/app/api/teacher/test-banks/[id]/route");

	return GET(
		jsonRequest(
			`/api/teacher/test-banks/${bankId}`,
			"GET",
			undefined,
			sessionCookie,
		),
		{ params: Promise.resolve({ id: bankId }) },
	);
}

async function updateBank(
	sessionCookie: string,
	bankId: string,
	body: { title?: string; description?: string | null },
) {
	const { PATCH } = await import("@/app/api/teacher/test-banks/[id]/route");

	return PATCH(
		jsonRequest(
			`/api/teacher/test-banks/${bankId}`,
			"PATCH",
			body,
			sessionCookie,
		),
		{ params: Promise.resolve({ id: bankId }) },
	);
}

async function addQuestion(
	sessionCookie: string,
	bankId: string,
	body: typeof sampleQuestion,
) {
	const { POST } = await import(
		"@/app/api/teacher/test-banks/[id]/questions/route"
	);

	return POST(
		jsonRequest(
			`/api/teacher/test-banks/${bankId}/questions`,
			"POST",
			body,
			sessionCookie,
		),
		{ params: Promise.resolve({ id: bankId }) },
	);
}

async function updateQuestion(
	sessionCookie: string,
	bankId: string,
	questionId: string,
	body: typeof sampleQuestion,
) {
	const { PATCH } = await import(
		"@/app/api/teacher/test-banks/[id]/questions/[questionId]/route"
	);

	return PATCH(
		jsonRequest(
			`/api/teacher/test-banks/${bankId}/questions/${questionId}`,
			"PATCH",
			body,
			sessionCookie,
		),
		{ params: Promise.resolve({ id: bankId, questionId }) },
	);
}

async function deleteQuestion(
	sessionCookie: string,
	bankId: string,
	questionId: string,
) {
	const { DELETE } = await import(
		"@/app/api/teacher/test-banks/[id]/questions/[questionId]/route"
	);

	return DELETE(
		jsonRequest(
			`/api/teacher/test-banks/${bankId}/questions/${questionId}`,
			"DELETE",
			undefined,
			sessionCookie,
		),
		{ params: Promise.resolve({ id: bankId, questionId }) },
	);
}

async function deleteBank(sessionCookie: string, bankId: string) {
	const { DELETE } = await import("@/app/api/teacher/test-banks/[id]/route");

	return DELETE(
		jsonRequest(
			`/api/teacher/test-banks/${bankId}`,
			"DELETE",
			undefined,
			sessionCookie,
		),
		{ params: Promise.resolve({ id: bankId }) },
	);
}

describe("AC-001–AC-007: full teacher test-bank journey", () => {
	beforeEach(() => {
		resetMockDb();
	});

	it("create bank → add MCQ → list → update → delete question → delete bank", async () => {
		const { cookie } = await getTeacherSessionCookie();
		expect(cookie).toBeTruthy();

		const createResponse = await createBank(
			cookie!,
			"Chapter 5 Review",
			"Fractions",
		);
		const createData = await createResponse.json();

		expect(createResponse.status).toBe(201);
		expect(createData.testBank.title).toBe("Chapter 5 Review");

		const bankId = createData.testBank.id as string;

		const addResponse = await addQuestion(cookie!, bankId, sampleQuestion);
		const addData = await addResponse.json();

		expect(addResponse.status).toBe(201);
		expect(addData.question.prompt).toBe(sampleQuestion.prompt);

		const questionId = addData.question.id as string;

		const listResponse = await listBanks(cookie!);
		const listData = await listResponse.json();

		expect(listResponse.status).toBe(200);
		expect(listData.testBanks).toHaveLength(1);
		expect(listData.testBanks[0].questionCount).toBe(1);

		const detailResponse = await getBank(cookie!, bankId);
		const detailData = await detailResponse.json();

		expect(detailResponse.status).toBe(200);
		expect(detailData.questions).toHaveLength(1);
		expect(detailData.questions[0].choices).toHaveLength(3);

		const patchBankResponse = await updateBank(cookie!, bankId, {
			title: "Chapter 5 Updated",
			description: "Updated fractions unit",
		});
		const patchBankData = await patchBankResponse.json();

		expect(patchBankResponse.status).toBe(200);
		expect(patchBankData.testBank.title).toBe("Chapter 5 Updated");

		const patchQuestionResponse = await updateQuestion(
			cookie!,
			bankId,
			questionId,
			{
				prompt: "What is 3 + 3?",
				choices: [
					{ choiceText: "5", isCorrect: false },
					{ choiceText: "6", isCorrect: true },
				],
			},
		);
		const patchQuestionData = await patchQuestionResponse.json();

		expect(patchQuestionResponse.status).toBe(200);
		expect(patchQuestionData.question.prompt).toBe("What is 3 + 3?");

		const deleteQuestionResponse = await deleteQuestion(
			cookie!,
			bankId,
			questionId,
		);

		expect(deleteQuestionResponse.status).toBe(200);

		const detailAfterDelete = await getBank(cookie!, bankId);
		const detailAfterDeleteData = await detailAfterDelete.json();

		expect(detailAfterDeleteData.questions).toHaveLength(0);

		const deleteBankResponse = await deleteBank(cookie!, bankId);

		expect(deleteBankResponse.status).toBe(200);

		const listAfterDelete = await listBanks(cookie!);
		const listAfterDeleteData = await listAfterDelete.json();

		expect(listAfterDeleteData.testBanks).toHaveLength(0);
	});
});

describe("AC-008: student access denied", () => {
	beforeEach(() => {
		resetMockDb();
	});

	it("student session cannot create bank", async () => {
		const { cookie } = await getStudentSessionCookie();
		expect(cookie).toBeTruthy();

		const response = await createBank(cookie!, "Student Bank");

		expect(response.status).toBe(403);
	});
});

describe("AC-008: teacher isolation", () => {
	beforeEach(() => {
		resetMockDb();
	});

	it("teacher A cannot read teacher B's bank", async () => {
		const teacherA = await getTeacherSessionCookie({
			email: "alice@school.edu",
			mobile: "+919876543201",
		});
		const teacherB = await getTeacherSessionCookie({
			name: "Bob Teacher",
			email: "bob@school.edu",
			mobile: "+919876543202",
		});

		const createResponse = await createBank(
			teacherA.cookie!,
			"Alice Private Bank",
		);
		const createData = await createResponse.json();
		const bankId = createData.testBank.id as string;

		const response = await getBank(teacherB.cookie!, bankId);

		expect(response.status).toBe(404);
	});
});

describe("AC-009: project scripts", () => {
	it("documents test, lint, and build scripts in package.json", () => {
		const packageJson = JSON.parse(
			readFileSync(join(process.cwd(), "package.json"), "utf-8"),
		) as { scripts: Record<string, string> };

		expect(packageJson.scripts.test).toBe("vitest run");
		expect(packageJson.scripts.lint).toBe("eslint .");
		expect(packageJson.scripts.build).toBe("next build");
	});
});
