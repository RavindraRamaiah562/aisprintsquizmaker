import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("AC-001: password hashing", () => {
	it("hashPassword returns a string different from plain input", async () => {
		const plain = "SecurePass123!";
		const hash = await hashPassword(plain);

		expect(typeof hash).toBe("string");
		expect(hash).not.toBe(plain);
	});

	it("verifyPassword returns true for correct password", async () => {
		const plain = "SecurePass123!";
		const hash = await hashPassword(plain);

		expect(await verifyPassword(plain, hash)).toBe(true);
	});

	it("plain password is never equal to stored hash", async () => {
		const plain = "AnotherPass456";
		const hash = await hashPassword(plain);

		expect(plain).not.toBe(hash);
	});
});

describe("AC-007: password verification failures", () => {
	it("verifyPassword returns false for incorrect password", async () => {
		const hash = await hashPassword("SecurePass123!");

		expect(await verifyPassword("WrongPass123!", hash)).toBe(false);
	});
});
