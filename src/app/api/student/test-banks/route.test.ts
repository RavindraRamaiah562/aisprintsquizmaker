import { beforeEach, describe, expect, it } from "vitest";

import {
	getStudentSessionCookie,
	getTeacherSessionCookie,
	jsonRequest,
	resetMockDb,
} from "@/test/auth-api-mock";

import "@/test/auth-api-mock";
import { GET } from "./route";

beforeEach(() => {
	resetMockDb();
});

async function createTeacherBank(title: string) {
	const { cookie } = await getTeacherSessionCookie({
		email: `${title.replace(/\s+/g, "-").toLowerCase()}@school.edu`,
		mobile: `+9198765432${Math.floor(Math.random() * 90 + 10)}`,
	});
	const { POST } = await import("@/app/api/teacher/test-banks/route");
	const response = await POST(
		jsonRequest(
			"/api/teacher/test-banks",
			"POST",
			{ title, description: `${title} description` },
			cookie ?? undefined,
		),
	);
	const data = await response.json();
	return { cookie, bankId: data.testBank.id as string };
}

describe("student question bank list", () => {
	it("returns available question banks for authenticated student", async () => {
		await createTeacherBank("Science Bank");
		const { cookie } = await getStudentSessionCookie();

		const response = await GET(
			jsonRequest(
				"/api/student/test-banks",
				"GET",
				undefined,
				cookie ?? undefined,
			),
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.testBanks).toHaveLength(1);
		expect(data.testBanks[0].title).toBe("Science Bank");
	});

	it("returns 403 for teacher session", async () => {
		const { cookie } = await getTeacherSessionCookie();

		const response = await GET(
			jsonRequest(
				"/api/student/test-banks",
				"GET",
				undefined,
				cookie ?? undefined,
			),
		);

		expect(response.status).toBe(403);
	});
});
