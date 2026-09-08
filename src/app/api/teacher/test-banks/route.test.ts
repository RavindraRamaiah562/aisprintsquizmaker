import { beforeEach, describe, expect, it } from "vitest";

import {
	getStudentSessionCookie,
	getTeacherSessionCookie,
	jsonRequest,
	resetMockDb,
} from "@/test/auth-api-mock";

import "@/test/auth-api-mock";
import { GET, POST } from "./route";

beforeEach(() => {
	resetMockDb();
});

describe("AC-002: GET /api/teacher/test-banks", () => {
	it("lists banks for authenticated teacher", async () => {
		const { cookie } = await getTeacherSessionCookie();

		await POST(
			jsonRequest(
				"/api/teacher/test-banks",
				"POST",
				{ title: "Chapter 5 Review" },
				cookie ?? undefined,
			),
		);

		const response = await GET(
			jsonRequest(
				"/api/teacher/test-banks",
				"GET",
				undefined,
				cookie ?? undefined,
			),
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.testBanks).toHaveLength(1);
		expect(data.testBanks[0].title).toBe("Chapter 5 Review");
	});
});

describe("AC-001: POST /api/teacher/test-banks", () => {
	it("creates bank and returns 201", async () => {
		const { cookie } = await getTeacherSessionCookie();

		const response = await POST(
			jsonRequest(
				"/api/teacher/test-banks",
				"POST",
				{ title: "Science Quiz", description: "Unit 1" },
				cookie ?? undefined,
			),
		);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.testBank.title).toBe("Science Quiz");
		expect(data.testBank.description).toBe("Unit 1");
	});
});

describe("AC-008: POST auth guards", () => {
	it("returns 401 without session", async () => {
		const response = await POST(
			jsonRequest("/api/teacher/test-banks", "POST", {
				title: "Unauthorized Bank",
			}),
		);

		expect(response.status).toBe(401);
	});

	it("returns 403 for student session", async () => {
		const { cookie } = await getStudentSessionCookie();

		const response = await POST(
			jsonRequest(
				"/api/teacher/test-banks",
				"POST",
				{ title: "Student Bank" },
				cookie ?? undefined,
			),
		);

		expect(response.status).toBe(403);
	});
});
