import { beforeEach, describe, expect, it } from "vitest";

import {
	getSessionCookie,
	jsonRequest,
	loginTestUser,
	registerTestUser,
	resetMockDb,
} from "@/test/auth-api-mock";

import "@/test/auth-api-mock";
import { GET } from "./route";
import { POST as logoutPost } from "../logout/route";

beforeEach(() => {
	resetMockDb();
});

describe("AC-009: GET /api/auth/me", () => {
	it("returns 200 and user profile with valid session", async () => {
		const { payload, data: registered } = await registerTestUser();
		const login = await loginTestUser(payload.email, payload.password);
		const sessionCookie = getSessionCookie(login.response);

		const response = await GET(
			jsonRequest("/api/auth/me", "GET", undefined, sessionCookie ?? undefined),
		);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.user.id).toBe(registered.user.id);
		expect(data.user.email).toBe(payload.email);
	});

	it("returns 401 when not authenticated", async () => {
		const response = await GET(jsonRequest("/api/auth/me", "GET"));

		expect(response.status).toBe(401);
	});
});

describe("AC-010: me after logout", () => {
	it("returns 401 after logout", async () => {
		const { payload } = await registerTestUser();
		const login = await loginTestUser(payload.email, payload.password);
		const sessionCookie = getSessionCookie(login.response);

		await logoutPost(
			jsonRequest("/api/auth/logout", "POST", undefined, sessionCookie ?? undefined),
		);

		const response = await GET(
			jsonRequest("/api/auth/me", "GET", undefined, sessionCookie ?? undefined),
		);

		expect(response.status).toBe(401);
	});
});
