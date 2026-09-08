import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import {
	getSessionCookie,
	jsonRequest,
	loginTestUser,
	registerTestUser,
	resetMockDb,
} from "@/test/auth-api-mock";

import "@/test/auth-api-mock";

async function callMe(sessionCookie: string | null) {
	const { GET } = await import("@/app/api/auth/me/route");

	return GET(
		jsonRequest("/api/auth/me", "GET", undefined, sessionCookie ?? undefined),
	);
}

async function callLogout(sessionCookie: string | null) {
	const { POST } = await import("@/app/api/auth/logout/route");

	return POST(
		jsonRequest("/api/auth/logout", "POST", undefined, sessionCookie ?? undefined),
	);
}

describe("AC-001–AC-010: full teacher journey", () => {
	beforeEach(() => {
		resetMockDb();
	});

	it("register → login → me → logout → me returns 401", async () => {
		const { payload, data: registered } = await registerTestUser({
			role: "teacher",
		});

		expect(registered.user.role).toBe("teacher");

		const login = await loginTestUser(payload.email, payload.password);
		expect(login.response.status).toBe(200);

		const sessionCookie = getSessionCookie(login.response);
		expect(sessionCookie).toBeTruthy();

		const me = await callMe(sessionCookie);
		const meData = await me.json();
		expect(me.status).toBe(200);
		expect(meData.user.id).toBe(registered.user.id);

		const logout = await callLogout(sessionCookie);
		expect(logout.status).toBe(200);

		const meAfterLogout = await callMe(sessionCookie);
		expect(meAfterLogout.status).toBe(401);
	});
});

describe("AC-001, AC-011: full student journey", () => {
	beforeEach(() => {
		resetMockDb();
	});

	it("register → login returns student role for redirect", async () => {
		const { payload, data: registered } = await registerTestUser({
			name: "Sam Student",
			email: "sam@school.edu",
			mobile: "+919876543211",
			role: "student",
		});

		expect(registered.user.role).toBe("student");

		const login = await loginTestUser(payload.email, payload.password);
		expect(login.response.status).toBe(200);
		expect(login.data.user.role).toBe("student");
	});
});

describe("AC-004–AC-006: login identifier options", () => {
	beforeEach(() => {
		resetMockDb();
	});

	it("login via email, mobile, and name for the same user", async () => {
		const { payload } = await registerTestUser({
			name: "Alex User",
			email: "alex@school.edu",
			mobile: "+919876543222",
		});

		const byEmail = await loginTestUser(payload.email, payload.password);
		const byMobile = await loginTestUser("9876543222", payload.password);
		const byName = await loginTestUser(payload.name, payload.password);

		expect(byEmail.response.status).toBe(200);
		expect(byMobile.response.status).toBe(200);
		expect(byName.response.status).toBe(200);
	});
});

describe("AC-001: credential security", () => {
	beforeEach(() => {
		resetMockDb();
	});

	it("stores hashed password in DB, never plain text", async () => {
		const { payload } = await registerTestUser({
			email: "secure@school.edu",
			mobile: "+919876543333",
		});

		const { getCloudflareContext } = await import("@opennextjs/cloudflare");
		const { env } = await getCloudflareContext();
		const row = await env.DB.prepare(
			"SELECT password_hash FROM users WHERE email = ?1 LIMIT 1",
		)
			.bind(payload.email)
			.first<{ password_hash: string }>();

		expect(row).not.toBeNull();
		expect(row?.password_hash).not.toBe(payload.password);
		expect(row?.password_hash.length).toBeGreaterThan(0);
	});
});

describe("AC-014: project scripts", () => {
	it("documents test, lint, and build scripts in package.json", () => {
		const packageJson = JSON.parse(
			readFileSync(join(process.cwd(), "package.json"), "utf-8"),
		) as { scripts: Record<string, string> };

		expect(packageJson.scripts.test).toBe("vitest run");
		expect(packageJson.scripts.lint).toBe("eslint .");
		expect(packageJson.scripts.build).toBe("next build");
	});
});
