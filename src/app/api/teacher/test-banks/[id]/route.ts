import { NextResponse } from "next/server";

import { requireTeacherApiUser } from "@/lib/auth/require-teacher-api";
import {
	deleteTestBank,
	getTestBankById,
	TestBankValidationError,
	updateTestBank,
} from "@/lib/db/test-banks";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
	const auth = await requireTeacherApiUser(request);
	if (!auth.ok) {
		return auth.response;
	}

	const { id } = await context.params;
	const detail = await getTestBankById(auth.db, id, auth.user.id);

	if (!detail) {
		return NextResponse.json({ message: "Not found" }, { status: 404 });
	}

	const { questions, ...testBank } = detail;

	return NextResponse.json({ testBank, questions });
}

export async function PATCH(request: Request, context: RouteContext) {
	const auth = await requireTeacherApiUser(request);
	if (!auth.ok) {
		return auth.response;
	}

	const { id } = await context.params;
	const body = (await request.json()) as Record<string, unknown>;

	try {
		const testBank = await updateTestBank(auth.db, id, auth.user.id, {
			title: typeof body.title === "string" ? body.title : undefined,
			description:
				typeof body.description === "string"
					? body.description
					: body.description === null
						? null
						: undefined,
		});

		if (!testBank) {
			return NextResponse.json({ message: "Not found" }, { status: 404 });
		}

		return NextResponse.json({ testBank });
	} catch (error) {
		if (error instanceof TestBankValidationError) {
			return NextResponse.json({ message: error.message }, { status: 400 });
		}

		throw error;
	}
}

export async function DELETE(request: Request, context: RouteContext) {
	const auth = await requireTeacherApiUser(request);
	if (!auth.ok) {
		return auth.response;
	}

	const { id } = await context.params;
	const deleted = await deleteTestBank(auth.db, id, auth.user.id);

	if (!deleted) {
		return NextResponse.json({ message: "Not found" }, { status: 404 });
	}

	return NextResponse.json({ success: true });
}
