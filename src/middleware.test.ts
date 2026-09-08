import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { getAuthRedirect } from "@/lib/auth/route-guard";

import { handleMiddlewareAuth } from "./middleware";

function createRequest(path: string, cookie?: string): NextRequest {
	const headers = cookie ? { cookie } : undefined;

	return new NextRequest(`http://localhost${path}`, { headers });
}

describe("AC-012: unauthenticated route access", () => {
	it("redirects unauthenticated request to /teacher to /login", () => {
		const response = handleMiddlewareAuth(createRequest("/teacher"));

		expect(response?.status).toBe(307);
		expect(response?.headers.get("location")).toContain("/login");
	});

	it("redirects unauthenticated request to /student to /login", () => {
		const response = handleMiddlewareAuth(createRequest("/student"));

		expect(response?.status).toBe(307);
		expect(response?.headers.get("location")).toContain("/login");
	});
});

describe("AC-013: role-based route access", () => {
	it("student cannot access /teacher routes", () => {
		expect(getAuthRedirect("/teacher", { role: "student" })).toBe("/student");
	});

	it("teacher cannot access /student routes", () => {
		expect(getAuthRedirect("/student", { role: "teacher" })).toBe("/teacher");
	});
});

describe("AC-011: authenticated teacher access", () => {
	it("allows authenticated teacher to access /teacher", () => {
		expect(getAuthRedirect("/teacher", { role: "teacher" })).toBeNull();
	});

	it("allows request with session cookie to pass middleware", () => {
		const response = handleMiddlewareAuth(
			createRequest("/teacher", "session=valid-token"),
		);

		expect(response).toBeNull();
	});
});
