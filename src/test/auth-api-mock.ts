import { vi } from "vitest";

import { createTestDatabase } from "./d1-test-utils";

export const TEST_SESSION_SECRET =
	"test-session-secret-min-32-chars-long!!";

let mockDb = createTestDatabase();

vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: vi.fn(async () => ({
		env: {
			get DB() {
				return mockDb;
			},
			SESSION_SECRET: TEST_SESSION_SECRET,
			NEXTJS_ENV: "development",
		},
	})),
}));

export function resetMockDb(): void {
	mockDb = createTestDatabase();
}

export function jsonRequest(
	path: string,
	method: string,
	body?: unknown,
	cookie?: string,
): Request {
	const headers = new Headers();

	if (body !== undefined) {
		headers.set("Content-Type", "application/json");
	}

	if (cookie) {
		headers.set("Cookie", cookie);
	}

	return new Request(`http://localhost${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

export async function registerTestUser(
	overrides: Partial<{
		name: string;
		email: string;
		mobile: string;
		password: string;
		role: "teacher" | "student";
	}> = {},
) {
	const { POST } = await import("@/app/api/auth/register/route");

	const payload = {
		name: "Jane Teacher",
		email: "jane@school.edu",
		mobile: "+919876543210",
		password: "SecurePass123!",
		role: "teacher" as const,
		...overrides,
	};

	const response = await POST(jsonRequest("/api/auth/register", "POST", payload));
	const data = await response.json();

	return { response, data, payload };
}

export async function loginTestUser(
	identifier: string,
	password: string,
) {
	const { POST } = await import("@/app/api/auth/login/route");

	const response = await POST(
		jsonRequest("/api/auth/login", "POST", { identifier, password }),
	);
	const data = await response.json();

	return { response, data };
}

export function getSessionCookie(response: Response): string | null {
	const setCookie = response.headers.get("set-cookie");
	if (!setCookie) {
		return null;
	}

	const match = setCookie.match(/session=([^;]+)/);
	return match ? `session=${match[1]}` : null;
}

export async function getTeacherSessionCookie(
	overrides: Partial<{
		name: string;
		email: string;
		mobile: string;
		password: string;
	}> = {},
) {
	const { payload } = await registerTestUser(overrides);
	const login = await loginTestUser(payload.email, payload.password);

	return {
		payload,
		cookie: getSessionCookie(login.response),
	};
}

export async function getStudentSessionCookie(
	overrides: Partial<{
		name: string;
		email: string;
		mobile: string;
		password: string;
	}> = {},
) {
	const { payload } = await registerTestUser({
		name: "Sam Student",
		email: "sam@school.edu",
		mobile: "+919876543299",
		password: "SecurePass123!",
		role: "student",
		...overrides,
	});
	const login = await loginTestUser(payload.email, payload.password);

	return {
		payload,
		cookie: getSessionCookie(login.response),
	};
}
