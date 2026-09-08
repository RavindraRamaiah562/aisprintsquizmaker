import { describe, expect, it } from "vitest";

import {
	normalizeMobile,
	validateRegistrationPayload,
} from "./validation";

const validBase = {
	name: "Jane Teacher",
	email: "jane@school.edu",
	mobile: "+919876543210",
	password: "SecurePass123!",
};

describe("AC-003: registration password validation", () => {
	it("rejects password shorter than 8 characters", () => {
		const result = validateRegistrationPayload({
			...validBase,
			password: "Ab1",
			role: "teacher",
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.password).toBeDefined();
		}
	});

	it("rejects password without a letter", () => {
		const result = validateRegistrationPayload({
			...validBase,
			password: "12345678",
			role: "teacher",
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.password).toBeDefined();
		}
	});

	it("rejects password without a number", () => {
		const result = validateRegistrationPayload({
			...validBase,
			password: "SecurePass",
			role: "teacher",
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.password).toBeDefined();
		}
	});
});

describe("AC-001: registration payload validation", () => {
	it("accepts valid registration payload for teacher role", () => {
		const result = validateRegistrationPayload({
			...validBase,
			role: "teacher",
		});

		expect(result.success).toBe(true);
	});

	it("accepts valid registration payload for student role", () => {
		const result = validateRegistrationPayload({
			...validBase,
			role: "student",
		});

		expect(result.success).toBe(true);
	});

	it("rejects invalid email format", () => {
		const result = validateRegistrationPayload({
			...validBase,
			email: "not-an-email",
			role: "teacher",
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.email).toBeDefined();
		}
	});
});

describe("AC-005: mobile normalization", () => {
	it("normalizeMobile strips spaces and punctuation", () => {
		expect(normalizeMobile("+91 98765-43210")).toBe("919876543210");
	});

	it("normalizeMobile maps +91 98765 43210 and 9876543210 to same value", () => {
		expect(normalizeMobile("+91 98765 43210")).toBe(
			normalizeMobile("9876543210"),
		);
	});
});
