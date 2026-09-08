import { beforeEach, describe, expect, it } from "vitest";

import {
	getStudentSessionCookie,
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

beforeEach(() => {
	resetMockDb();
});

async function createBankWithQuestion() {
	const { getTeacherSessionCookie } = await import("@/test/auth-api-mock");
	const { cookie } = await getTeacherSessionCookie({
		email: "teacher-bank@school.edu",
		mobile: "+919876543210",
	});

	const { POST: createBank } = await import("@/app/api/teacher/test-banks/route");
	const createResponse = await createBank(
		jsonRequest(
			"/api/teacher/test-banks",
			"POST",
			{ title: "Math Bank" },
			cookie ?? undefined,
		),
	);
	const createData = await createResponse.json();
	const bankId = createData.testBank.id as string;

	const { POST: addQuestion } = await import(
		"@/app/api/teacher/test-banks/[id]/questions/route"
	);
	await addQuestion(
		jsonRequest(
			`/api/teacher/test-banks/${bankId}/questions`,
			"POST",
			sampleQuestion,
			cookie ?? undefined,
		),
		{ params: Promise.resolve({ id: bankId }) },
	);

	return bankId;
}

describe("student question bank detail", () => {
	it("returns questions without correct answers", async () => {
		const bankId = await createBankWithQuestion();
		const { cookie } = await getStudentSessionCookie();
		const { GET } = await import("./route");

		const response = await GET(
			jsonRequest(
				`/api/student/test-banks/${bankId}`,
				"GET",
				undefined,
				cookie ?? undefined,
			),
			{ params: Promise.resolve({ id: bankId }) },
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.questions).toHaveLength(1);
		expect(data.questions[0].prompt).toBe(sampleQuestion.prompt);
		expect(data.questions[0].choices).toHaveLength(3);
		expect(JSON.stringify(data)).not.toContain("isCorrect");
	});
});
