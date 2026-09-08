import { beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase } from "@/test/d1-test-utils";

import { DuplicateUserError } from "./errors";
import { createUser, findUserByIdentifier } from "./users";

const teacherInput = {
	name: "Jane Teacher",
	email: "jane@school.edu",
	mobile: "+919876543210",
	password: "SecurePass123!",
	role: "teacher" as const,
};

describe("AC-001: user creation", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("createUser inserts row with hashed password (not plain text)", async () => {
		const user = await createUser(db, teacherInput);

		const row = await db
			.prepare("SELECT password_hash FROM users WHERE id = ?1")
			.bind(user.id)
			.first<{ password_hash: string }>();

		expect(row).not.toBeNull();
		expect(row?.password_hash).not.toBe(teacherInput.password);
		expect(row?.password_hash.length).toBeGreaterThan(0);
	});

	it("migration creates users and sessions tables", async () => {
		const tables = await db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
			)
			.all<{ name: string }>();

		const names = tables.results.map((row) => row.name);
		expect(names).toContain("users");
		expect(names).toContain("sessions");
	});
});

describe("AC-002: duplicate user prevention", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("createUser throws on duplicate email", async () => {
		await createUser(db, teacherInput);

		await expect(
			createUser(db, {
				...teacherInput,
				name: "Another User",
				mobile: "+919876543211",
			}),
		).rejects.toThrow(DuplicateUserError);
	});

	it("createUser throws on duplicate mobile", async () => {
		await createUser(db, teacherInput);

		await expect(
			createUser(db, {
				...teacherInput,
				name: "Another User",
				email: "other@school.edu",
			}),
		).rejects.toThrow(DuplicateUserError);
	});
});

describe("AC-004: find user by email", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("findUserByIdentifier finds user by email", async () => {
		const created = await createUser(db, teacherInput);

		const found = await findUserByIdentifier(db, teacherInput.email);

		expect(found).not.toBeNull();
		expect(found?.id).toBe(created.id);
	});
});

describe("AC-005: find user by mobile", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("findUserByIdentifier finds user by mobile", async () => {
		const created = await createUser(db, teacherInput);

		const found = await findUserByIdentifier(db, "9876543210");

		expect(found).not.toBeNull();
		expect(found?.id).toBe(created.id);
	});
});

describe("AC-006: find user by name", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("findUserByIdentifier finds user by name", async () => {
		const created = await createUser(db, teacherInput);

		const found = await findUserByIdentifier(db, teacherInput.name);

		expect(found).not.toBeNull();
		expect(found?.id).toBe(created.id);
	});
});

describe("AC-007: user not found", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("findUserByIdentifier returns null when not found", async () => {
		const found = await findUserByIdentifier(db, "nobody@school.edu");

		expect(found).toBeNull();
	});
});
