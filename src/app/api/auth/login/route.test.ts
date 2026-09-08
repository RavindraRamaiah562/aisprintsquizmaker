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

describe("AC-004: login with email", () => {
	it("returns 200 and Set-Cookie for valid email and password", async () => {
		const { payload } = await registerTestUser();

		const { response, data } = await loginTestUser(
			payload.email,
			payload.password,
		);

		expect(response.status).toBe(200);
		expect(getSessionCookie(response)).toBeTruthy();
		expect(data.user.email).toBe(payload.email);
	});
});

describe("AC-005: login with mobile", () => {
	it("returns 200 for valid mobile identifier and password", async () => {
		const { payload } = await registerTestUser();

		const { response } = await loginTestUser("9876543210", payload.password);

		expect(response.status).toBe(200);
	});
});

describe("AC-006: login with name", () => {
	it("returns 200 for valid name identifier and password", async () => {
		const { payload } = await registerTestUser();

		const { response } = await loginTestUser(payload.name, payload.password);

		expect(response.status).toBe(200);
	});
});

describe("AC-007: invalid login", () => {
	it("returns 401 with generic message for wrong password", async () => {
		const { payload } = await registerTestUser();

		const { response, data } = await loginTestUser(
			payload.email,
			"WrongPass123!",
		);

		expect(response.status).toBe(401);
		expect(data.message).toBe("Invalid username or password");
	});

	it("returns 401 with generic message for unknown identifier", async () => {
		const { response, data } = await loginTestUser(
			"unknown@school.edu",
			"SecurePass123!",
		);

		expect(response.status).toBe(401);
		expect(data.message).toBe("Invalid username or password");
	});
});

describe("AC-008: login response security", () => {
	it("never includes password or password_hash in response body", async () => {
		const { payload } = await registerTestUser();

		const { response, data } = await loginTestUser(
			payload.email,
			payload.password,
		);
		const body = JSON.stringify(data);

		expect(response.status).toBe(200);
		expect(body).not.toContain("password_hash");
		expect(data.user).not.toHaveProperty("password");
		expect(data.user).not.toHaveProperty("password_hash");
	});
});

describe("AC-001: login validation", () => {
	it("returns 400 when identifier or password is missing", async () => {
		const response = await POST(
			jsonRequest("/api/auth/login", "POST", { identifier: "jane@school.edu" }),
		);

		expect(response.status).toBe(400);
	});
});
