import { beforeEach, describe, expect, it } from "vitest";

import {
	getTeacherSessionCookie,
	jsonRequest,
	resetMockDb,
} from "@/test/auth-api-mock";

import "@/test/auth-api-mock";
import { POST as createBankPost } from "../route";
import { DELETE, GET, PATCH } from "./route";

const sampleQuestion = {
	prompt: "What is 2 + 2?",
	choices: [
		{ choiceText: "3", isCorrect: false },
		{ choiceText: "4", isCorrect: true },
		{ choiceText: "5", isCorrect: false },
	],
};

async function createBank(cookie: string, title: string) {
	const response = await createBankPost(
		jsonRequest(
			"/api/teacher/test-banks",
			"POST",
			{ title },
			cookie,
		),
	);
	const data = await response.json();
	return data.testBank as { id: string; title: string };
}

beforeEach(() => {
	resetMockDb();
});

describe("AC-003: GET /api/teacher/test-banks/[id]", () => {
	it("returns bank with questions", async () => {
		const { cookie } = await getTeacherSessionCookie();
		const bank = await createBank(cookie ?? "", "Math Quiz");

		const { POST: addQuestionPost } = await import("./questions/route");
		await addQuestionPost(
			jsonRequest(
				`/api/teacher/test-banks/${bank.id}/questions`,
				"POST",
				sampleQuestion,
				cookie ?? undefined,
			),
			{ params: Promise.resolve({ id: bank.id }) },
		);

		const response = await GET(
			jsonRequest(
				`/api/teacher/test-banks/${bank.id}`,
				"GET",
				undefined,
				cookie ?? undefined,
			),
			{ params: Promise.resolve({ id: bank.id }) },
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.testBank.id).toBe(bank.id);
		expect(data.questions).toHaveLength(1);
		expect(data.questions[0].choices).toHaveLength(3);
	});
});

describe("AC-008: GET ownership", () => {
	it("returns 404 for another teacher's bank", async () => {
		const teacherA = await getTeacherSessionCookie({
			email: "alice@school.edu",
			mobile: "+919876543201",
		});
		const teacherB = await getTeacherSessionCookie({
			name: "Bob Teacher",
			email: "bob@school.edu",
			mobile: "+919876543202",
		});

		const bank = await createBank(teacherA.cookie ?? "", "Private Bank");

		const response = await GET(
			jsonRequest(
				`/api/teacher/test-banks/${bank.id}`,
				"GET",
				undefined,
				teacherB.cookie ?? undefined,
			),
			{ params: Promise.resolve({ id: bank.id }) },
		);

		expect(response.status).toBe(404);
	});
});

describe("AC-006: PATCH /api/teacher/test-banks/[id]", () => {
	it("updates title and description", async () => {
		const { cookie } = await getTeacherSessionCookie();
		const bank = await createBank(cookie ?? "", "Original Title");

		const response = await PATCH(
			jsonRequest(
				`/api/teacher/test-banks/${bank.id}`,
				"PATCH",
				{ title: "Updated Title", description: "Updated description" },
				cookie ?? undefined,
			),
			{ params: Promise.resolve({ id: bank.id }) },
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.testBank.title).toBe("Updated Title");
		expect(data.testBank.description).toBe("Updated description");
	});
});

describe("AC-007: DELETE /api/teacher/test-banks/[id]", () => {
	it("removes bank", async () => {
		const { cookie } = await getTeacherSessionCookie();
		const bank = await createBank(cookie ?? "", "Temp Bank");

		const response = await DELETE(
			jsonRequest(
				`/api/teacher/test-banks/${bank.id}`,
				"DELETE",
				undefined,
				cookie ?? undefined,
			),
			{ params: Promise.resolve({ id: bank.id }) },
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);

		const getResponse = await GET(
			jsonRequest(
				`/api/teacher/test-banks/${bank.id}`,
				"GET",
				undefined,
				cookie ?? undefined,
			),
			{ params: Promise.resolve({ id: bank.id }) },
		);

		expect(getResponse.status).toBe(404);
	});
});
