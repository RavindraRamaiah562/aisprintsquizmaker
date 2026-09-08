import { NextResponse } from "next/server";

import { getAuthEnv } from "@/lib/auth/context";
import { getSessionTokenFromRequest } from "@/lib/auth/cookies";
import { readSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";

export async function GET(request: Request) {
	const { db, sessionSecret } = await getAuthEnv();
	const token = getSessionTokenFromRequest(request);

	if (!token) {
		return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
	}

	const session = await readSession(db, token, sessionSecret);

	if (!session) {
		return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
	}

	const user = await findUserById(db, session.userId);

	if (!user) {
		return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
	}

	return NextResponse.json({ user });
}
