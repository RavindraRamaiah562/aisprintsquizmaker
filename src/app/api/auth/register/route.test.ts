import { beforeEach, describe, expect, it } from "vitest";

import {
	jsonRequest,
	registerTestUser,
	resetMockDb,
} from "@/test/auth-api-mock";

import "@/test/auth-api-mock";
import { POST } from "./route";

const teacherPayload = {
	name: "Jane Teacher",
	email: "jane@school.edu",
	mobile: "+919876543210",
	password: "SecurePass123!",
	role: "teacher",
};

const studentPayload = {
	name: "Sam Student",
	email: "sam@school.edu",
	mobile: "+919876543211",
	password: "SecurePass123!",
	role: "student",
};

beforeEach(() => {
	resetMockDb();
});

describe("AC-001: POST /api/auth/register", () => {
	it("returns 201 and user object without password for teacher", async () => {
		const response = await POST(
			jsonRequest("/api/auth/register", "POST", teacherPayload),
		);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.user).toMatchObject({
			name: teacherPayload.name,
			email: teacherPayload.email,
			role: "teacher",
		});
		expect(data.user).not.toHaveProperty("password");
		expect(data.user).not.toHaveProperty("password_hash");
	});

	it("returns 201 and role student for student payload", async () => {
		const response = await POST(
			jsonRequest("/api/auth/register", "POST", studentPayload),
		);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.user.role).toBe("student");
	});

	it("returns 400 when required field is missing", async () => {
		const response = await POST(
			jsonRequest("/api/auth/register", "POST", {
				...teacherPayload,
				email: "",
			}),
		);

		expect(response.status).toBe(400);
	});
});

describe("AC-002: duplicate registration", () => {
	it("returns 409 for duplicate email", async () => {
		await registerTestUser();

		const response = await POST(
			jsonRequest("/api/auth/register", "POST", {
				...teacherPayload,
				name: "Another User",
				mobile: "+919876543299",
			}),
		);

		expect(response.status).toBe(409);
	});

	it("returns 409 for duplicate mobile", async () => {
		await registerTestUser();

		const response = await POST(
			jsonRequest("/api/auth/register", "POST", {
				...teacherPayload,
				name: "Another User",
				email: "other@school.edu",
			}),
		);

		expect(response.status).toBe(409);
	});
});

describe("AC-003: weak password", () => {
	it("returns 400 for weak password", async () => {
		const response = await POST(
			jsonRequest("/api/auth/register", "POST", {
				...teacherPayload,
				password: "short",
			}),
		);

		expect(response.status).toBe(400);
	});
});
