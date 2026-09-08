import { NextResponse } from "next/server";

import { getAuthEnv } from "@/lib/auth/context";
import { validateRegistrationPayload } from "@/lib/auth/validation";
import { DuplicateUserError } from "@/lib/db/errors";
import { createUser } from "@/lib/db/users";

export async function POST(request: Request) {
	try {
		const { db } = await getAuthEnv();
		const body = (await request.json()) as Record<string, unknown>;

		const validation = validateRegistrationPayload({
			name: String(body.name ?? ""),
			email: String(body.email ?? ""),
			mobile: String(body.mobile ?? ""),
			password: String(body.password ?? ""),
			role: body.role as "teacher" | "student",
		});

		if (!validation.success) {
			return NextResponse.json({ errors: validation.errors }, { status: 400 });
		}

		const user = await createUser(db, validation.data);

		return NextResponse.json({ user }, { status: 201 });
	} catch (error) {
		if (error instanceof DuplicateUserError) {
			return NextResponse.json(
				{ message: `${error.field} already registered` },
				{ status: 409 },
			);
		}

		throw error;
	}
}
