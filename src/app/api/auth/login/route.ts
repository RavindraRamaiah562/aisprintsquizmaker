import { NextResponse } from "next/server";

import { getAuthEnv } from "@/lib/auth/context";
import {
	buildSessionCookie,
} from "@/lib/auth/cookies";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { findUserByIdentifier } from "@/lib/db/users";

const INVALID_CREDENTIALS_MESSAGE = "Invalid username or password";

export async function POST(request: Request) {
	const { db, sessionSecret } = await getAuthEnv();
	const body = (await request.json()) as Record<string, unknown>;
	const identifier =
		typeof body.identifier === "string" ? body.identifier.trim() : "";
	const password = typeof body.password === "string" ? body.password : "";

	if (!identifier || !password) {
		return NextResponse.json(
			{ message: "Identifier and password are required" },
			{ status: 400 },
		);
	}

	const user = await findUserByIdentifier(db, identifier);

	if (!user || !(await verifyPassword(password, user.password_hash))) {
		return NextResponse.json(
			{ message: INVALID_CREDENTIALS_MESSAGE },
			{ status: 401 },
		);
	}

	const token = await createSession(db, user.id, sessionSecret);
	const response = NextResponse.json({
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			mobile: user.mobile,
			role: user.role,
		},
	});

	response.headers.set("Set-Cookie", buildSessionCookie(token));

	return response;
}
