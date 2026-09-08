import { NextResponse } from "next/server";

import { getAuthEnv } from "@/lib/auth/context";
import { getSessionTokenFromRequest } from "@/lib/auth/cookies";
import { readSession } from "@/lib/auth/session";
import type { PublicUser } from "@/lib/auth/types";
import { findUserById } from "@/lib/db/users";

export type StudentAuthResult =
	| { ok: true; user: PublicUser; db: D1Database }
	| { ok: false; response: NextResponse };

export async function requireStudentApiUser(
	request: Request,
): Promise<StudentAuthResult> {
	const { db, sessionSecret } = await getAuthEnv();
	const token = getSessionTokenFromRequest(request);

	if (!token) {
		return {
			ok: false,
			response: NextResponse.json(
				{ message: "Not authenticated" },
				{ status: 401 },
			),
		};
	}

	const session = await readSession(db, token, sessionSecret);

	if (!session) {
		return {
			ok: false,
			response: NextResponse.json(
				{ message: "Not authenticated" },
				{ status: 401 },
			),
		};
	}

	const user = await findUserById(db, session.userId);

	if (!user) {
		return {
			ok: false,
			response: NextResponse.json(
				{ message: "Not authenticated" },
				{ status: 401 },
			),
		};
	}

	if (user.role !== "student") {
		return {
			ok: false,
			response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
		};
	}

	return { ok: true, user, db };
}
