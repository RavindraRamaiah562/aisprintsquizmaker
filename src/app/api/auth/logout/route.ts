import { NextResponse } from "next/server";

import { getAuthEnv } from "@/lib/auth/context";
import {
	clearSessionCookie,
	getSessionTokenFromRequest,
} from "@/lib/auth/cookies";
import { destroySession, readSession } from "@/lib/auth/session";

export async function POST(request: Request) {
	const { db, sessionSecret } = await getAuthEnv();
	const token = getSessionTokenFromRequest(request);

	if (!token) {
		return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
	}

	const session = await readSession(db, token, sessionSecret);

	if (!session) {
		return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
	}

	await destroySession(db, token, sessionSecret);

	const response = NextResponse.json({ success: true });
	response.headers.set("Set-Cookie", clearSessionCookie());

	return response;
}
