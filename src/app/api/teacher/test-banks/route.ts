import { NextResponse } from "next/server";

import { requireTeacherApiUser } from "@/lib/auth/require-teacher-api";
import {
	createTestBank,
	listTestBanksByTeacher,
	TestBankValidationError,
} from "@/lib/db/test-banks";

export async function GET(request: Request) {
	const auth = await requireTeacherApiUser(request);
	if (!auth.ok) {
		return auth.response;
	}

	const testBanks = await listTestBanksByTeacher(auth.db, auth.user.id);

	return NextResponse.json({ testBanks });
}

export async function POST(request: Request) {
	const auth = await requireTeacherApiUser(request);
	if (!auth.ok) {
		return auth.response;
	}

	const body = (await request.json()) as Record<string, unknown>;

	try {
		const testBank = await createTestBank(auth.db, auth.user.id, {
			title: typeof body.title === "string" ? body.title : "",
			description:
				typeof body.description === "string"
					? body.description
					: body.description === null
						? null
						: undefined,
		});

		return NextResponse.json({ testBank }, { status: 201 });
	} catch (error) {
		if (error instanceof TestBankValidationError) {
			return NextResponse.json({ message: error.message }, { status: 400 });
		}

		throw error;
	}
}
