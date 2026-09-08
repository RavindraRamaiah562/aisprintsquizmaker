import { beforeEach, describe, expect, it } from "vitest";

import {
	getTeacherSessionCookie,
	jsonRequest,
	resetMockDb,
} from "@/test/auth-api-mock";

import "@/test/auth-api-mock";
import { POST as createBankPost } from "../../route";
import { POST } from "./route";

const validQuestion = {
	prompt: "What is 2 + 2?",
	choices: [
		{ choiceText: "3", isCorrect: false },
		{ choiceText: "4", isCorrect: true },
		{ choiceText: "5", isCorrect: false },
	],
};

async function createBank(cookie: string) {
	const response = await createBankPost(
		jsonRequest(
			"/api/teacher/test-banks",
			"POST",
			{ title: "Science Quiz" },
			cookie,
		),
	);
	const data = await response.json();
	return data.testBank as { id: string };
}

beforeEach(() => {
	resetMockDb();
});

describe("AC-004: POST /api/teacher/test-banks/[id]/questions", () => {
	it("adds valid MCQ and returns 201", async () => {
		const { cookie } = await getTeacherSessionCookie();
		const bank = await createBank(cookie ?? "");

		const response = await POST(
			jsonRequest(
				`/api/teacher/test-banks/${bank.id}/questions`,
				"POST",
				validQuestion,
				cookie ?? undefined,
			),
			{ params: Promise.resolve({ id: bank.id }) },
		);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.question.prompt).toBe(validQuestion.prompt);
		expect(data.question.choices).toHaveLength(3);
	});
});

describe("AC-005: POST invalid MCQ", () => {
	it("returns 400 when no correct choice is selected", async () => {
		const { cookie } = await getTeacherSessionCookie();
		const bank = await createBank(cookie ?? "");

		const response = await POST(
			jsonRequest(
				`/api/teacher/test-banks/${bank.id}/questions`,
				"POST",
				{
					prompt: "What is 2 + 2?",
					choices: [
						{ choiceText: "3", isCorrect: false },
						{ choiceText: "5", isCorrect: false },
					],
				},
				cookie ?? undefined,
			),
			{ params: Promise.resolve({ id: bank.id }) },
		);

		expect(response.status).toBe(400);
	});
});
