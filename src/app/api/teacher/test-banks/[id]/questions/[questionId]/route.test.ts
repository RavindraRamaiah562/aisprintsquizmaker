import { beforeEach, describe, expect, it } from "vitest";

import {
	getTeacherSessionCookie,
	jsonRequest,
	resetMockDb,
} from "@/test/auth-api-mock";

import "@/test/auth-api-mock";
import { POST as createBankPost } from "../../../route";
import { POST as addQuestionPost } from "../route";
import { DELETE, PATCH } from "./route";

const validQuestion = {
	prompt: "What is 2 + 2?",
	choices: [
		{ choiceText: "3", isCorrect: false },
		{ choiceText: "4", isCorrect: true },
		{ choiceText: "5", isCorrect: false },
	],
};

async function createBankWithQuestion(cookie: string) {
	const bankResponse = await createBankPost(
		jsonRequest(
			"/api/teacher/test-banks",
			"POST",
			{ title: "Science Quiz" },
			cookie,
		),
	);
	const bankData = await bankResponse.json();
	const bankId = bankData.testBank.id as string;

	const questionResponse = await addQuestionPost(
		jsonRequest(
			`/api/teacher/test-banks/${bankId}/questions`,
			"POST",
			validQuestion,
			cookie,
		),
		{ params: Promise.resolve({ id: bankId }) },
	);
	const questionData = await questionResponse.json();

	return {
		bankId,
		questionId: questionData.question.id as string,
	};
}

beforeEach(() => {
	resetMockDb();
});

describe("AC-006: PATCH /api/teacher/test-banks/[id]/questions/[questionId]", () => {
	it("updates question prompt and choices", async () => {
		const { cookie } = await getTeacherSessionCookie();
		const { bankId, questionId } = await createBankWithQuestion(cookie ?? "");

		const response = await PATCH(
			jsonRequest(
				`/api/teacher/test-banks/${bankId}/questions/${questionId}`,
				"PATCH",
				{
					prompt: "What is 3 + 3?",
					choices: [
						{ choiceText: "5", isCorrect: false },
						{ choiceText: "6", isCorrect: true },
					],
				},
				cookie ?? undefined,
			),
			{
				params: Promise.resolve({ id: bankId, questionId }),
			},
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.question.prompt).toBe("What is 3 + 3?");
		expect(data.question.choices).toHaveLength(2);
	});
});

describe("AC-007: DELETE /api/teacher/test-banks/[id]/questions/[questionId]", () => {
	it("removes question", async () => {
		const { cookie } = await getTeacherSessionCookie();
		const { bankId, questionId } = await createBankWithQuestion(cookie ?? "");

		const response = await DELETE(
			jsonRequest(
				`/api/teacher/test-banks/${bankId}/questions/${questionId}`,
				"DELETE",
				undefined,
				cookie ?? undefined,
			),
			{
				params: Promise.resolve({ id: bankId, questionId }),
			},
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});
});
