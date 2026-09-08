import { type NextRequest, NextResponse } from "next/server";

import { getSessionTokenFromRequest } from "@/lib/auth/cookies";
import { isProtectedPath } from "@/lib/auth/route-guard";

export function handleMiddlewareAuth(request: NextRequest): NextResponse | null {
	const { pathname } = request.nextUrl;

	if (!isProtectedPath(pathname)) {
		return null;
	}

	if (!getSessionTokenFromRequest(request)) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	return null;
}

export function middleware(request: NextRequest) {
	const response = handleMiddlewareAuth(request);
	return response ?? NextResponse.next();
}

export const config = {
	matcher: ["/teacher/:path*", "/student/:path*"],
};
