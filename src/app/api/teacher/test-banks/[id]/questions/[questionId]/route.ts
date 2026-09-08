import { NextResponse } from "next/server";

import { requireTeacherApiUser } from "@/lib/auth/require-teacher-api";
import {
	deleteQuestion,
	QuestionNotFoundError,
	QuestionValidationError,
	updateQuestion,
} from "@/lib/db/test-banks";
import type { QuestionChoiceInput } from "@/lib/test-bank/types";

type RouteContext = {
	params: Promise<{ id: string; questionId: string }>;
};

function parseChoices(value: unknown): QuestionChoiceInput[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.map((choice) => {
		const item = choice as Record<string, unknown>;
		return {
			choiceText:
				typeof item.choiceText === "string" ? item.choiceText : "",
			isCorrect: item.isCorrect === true,
		};
	});
}

export async function PATCH(request: Request, context: RouteContext) {
	const auth = await requireTeacherApiUser(request);
	if (!auth.ok) {
		return auth.response;
	}

	const { id, questionId } = await context.params;
	const body = (await request.json()) as Record<string, unknown>;

	try {
		const question = await updateQuestion(
			auth.db,
			id,
			questionId,
			auth.user.id,
			{
				prompt: typeof body.prompt === "string" ? body.prompt : "",
				choices: parseChoices(body.choices),
			},
		);

		return NextResponse.json({ question });
	} catch (error) {
		if (error instanceof QuestionNotFoundError) {
			return NextResponse.json({ message: "Not found" }, { status: 404 });
		}

		if (error instanceof QuestionValidationError) {
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

	const { id, questionId } = await context.params;
	const deleted = await deleteQuestion(
		auth.db,
		id,
		questionId,
		auth.user.id,
	);

	if (!deleted) {
		return NextResponse.json({ message: "Not found" }, { status: 404 });
	}

	return NextResponse.json({ success: true });
}
