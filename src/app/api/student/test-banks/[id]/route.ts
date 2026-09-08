import { NextResponse } from "next/server";

import { requireStudentApiUser } from "@/lib/auth/require-student-api";
import { getTestBankForStudent } from "@/lib/db/test-banks";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
	const auth = await requireStudentApiUser(request);
	if (!auth.ok) {
		return auth.response;
	}

	const { id } = await context.params;
	const testBank = await getTestBankForStudent(auth.db, id);

	if (!testBank) {
		return NextResponse.json({ message: "Not found" }, { status: 404 });
	}

	return NextResponse.json({ testBank, questions: testBank.questions });
}
