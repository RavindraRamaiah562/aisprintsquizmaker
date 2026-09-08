import { beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase } from "@/test/d1-test-utils";
import { createUser } from "@/lib/db/users";

import {
	createSession,
	destroySession,
	readSession,
	signSessionToken,
} from "./session";

const TEST_SECRET = "test-session-secret-min-32-chars-long!!";

const testUserInput = {
	name: "Session User",
	email: "session@school.edu",
	mobile: "+919876543210",
	password: "SecurePass123!",
	role: "teacher" as const,
};

async function seedUser(db: ReturnType<typeof createTestDatabase>) {
	return createUser(db, testUserInput);
}

describe("AC-008: session creation", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("createSession returns signed cookie value", async () => {
		const user = await seedUser(db);
		const token = await createSession(db, user.id, TEST_SECRET);

		expect(typeof token).toBe("string");
		expect(token.length).toBeGreaterThan(0);
	});
});

describe("AC-009: session reading", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("readSession returns user id for valid cookie", async () => {
		const user = await seedUser(db);
		const token = await createSession(db, user.id, TEST_SECRET);

		const session = await readSession(db, token, TEST_SECRET);

		expect(session).not.toBeNull();
		expect(session?.userId).toBe(user.id);
	});
});

describe("AC-010: session invalidation", () => {
	let db: ReturnType<typeof createTestDatabase>;

	beforeEach(() => {
		db = createTestDatabase();
	});

	it("readSession returns null for tampered cookie", async () => {
		const user = await seedUser(db);
		const token = await createSession(db, user.id, TEST_SECRET);
		const tampered = `${token}tampered`;

		const session = await readSession(db, tampered, TEST_SECRET);

		expect(session).toBeNull();
	});

	it("readSession returns null for expired session", async () => {
		const user = await seedUser(db);
		const sessionId = "expired-session-id";
		const past = new Date(Date.now() - 60_000).toISOString();

		await db
			.prepare(
				"INSERT INTO sessions (id, user_id, expires_at) VALUES (?1, ?2, ?3)",
			)
			.bind(sessionId, user.id, past)
			.run();

		const token = await signSessionToken(sessionId, TEST_SECRET);

		const session = await readSession(db, token, TEST_SECRET);

		expect(session).toBeNull();
	});

	it("destroySession invalidates session", async () => {
		const user = await seedUser(db);
		const token = await createSession(db, user.id, TEST_SECRET);

		await destroySession(db, token, TEST_SECRET);

		const session = await readSession(db, token, TEST_SECRET);
		expect(session).toBeNull();
	});
});
