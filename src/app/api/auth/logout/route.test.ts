import { beforeEach, describe, expect, it } from "vitest";

import {
	getSessionCookie,
	jsonRequest,
	loginTestUser,
	registerTestUser,
	resetMockDb,
} from "@/test/auth-api-mock";

import "@/test/auth-api-mock";
import { POST } from "./route";

beforeEach(() => {
	resetMockDb();
});

describe("AC-010: POST /api/auth/logout", () => {
	it("returns 200 and clears session cookie when session is valid", async () => {
		const { payload } = await registerTestUser();
		const login = await loginTestUser(payload.email, payload.password);
		const sessionCookie = getSessionCookie(login.response);

		const response = await POST(
			jsonRequest("/api/auth/logout", "POST", undefined, sessionCookie ?? undefined),
		);
		const setCookie = response.headers.get("set-cookie");

		expect(response.status).toBe(200);
		expect(setCookie).toContain("Max-Age=0");
	});

	it("returns 401 when no session cookie is provided", async () => {
		const response = await POST(jsonRequest("/api/auth/logout", "POST"));

		expect(response.status).toBe(401);
	});
});
