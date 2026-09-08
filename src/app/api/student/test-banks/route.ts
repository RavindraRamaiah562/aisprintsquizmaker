import { NextResponse } from "next/server";

import { requireStudentApiUser } from "@/lib/auth/require-student-api";
import { listAllTestBanks } from "@/lib/db/test-banks";

export async function GET(request: Request) {
	const auth = await requireStudentApiUser(request);
	if (!auth.ok) {
		return auth.response;
	}

	const testBanks = await listAllTestBanks(auth.db);

	return NextResponse.json({ testBanks });
}
