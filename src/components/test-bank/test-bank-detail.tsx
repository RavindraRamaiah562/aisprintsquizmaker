"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { QuestionForm } from "@/components/test-bank/question-form";
import { QuestionGrid } from "@/components/test-bank/question-grid";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type {
	QuestionRecord,
	TestBankRecord,
} from "@/lib/test-bank/types";

type TestBankDetailProps = {
	bankId: string;
	testBank: TestBankRecord;
	questions: QuestionRecord[];
};

export function TestBankDetail({
	bankId,
	testBank,
	questions: initialQuestions,
}: TestBankDetailProps) {
	const router = useRouter();
	const [questions, setQuestions] = useState(initialQuestions);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	function refreshQuestions() {
		router.refresh();
		fetch(`/api/teacher/test-banks/${bankId}`)
			.then((response) => response.json())
			.then((data) => {
				const payload = data as { questions?: QuestionRecord[] };
				if (payload.questions) {
					setQuestions(payload.questions);
				}
			})
			.catch(() => undefined);
	}

	async function handleDeleteBank() {
		if (!window.confirm("Delete this test bank and all its questions?")) {
			return;
		}

		setDeleteError(null);
		setIsDeleting(true);

		try {
			const response = await fetch(`/api/teacher/test-banks/${bankId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const data = (await response.json()) as { message?: string };
				setDeleteError(data.message ?? "Failed to delete test bank");
				return;
			}

			router.push("/teacher/test-banks");
			router.refresh();
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-1">
					<Link
						href="/teacher/test-banks"
						className="text-muted-foreground text-sm hover:underline"
					>
						Back to test banks
					</Link>
					<h1 className="text-2xl font-semibold">{testBank.title}</h1>
					{testBank.description ? (
						<p className="text-muted-foreground">{testBank.description}</p>
					) : null}
				</div>
				<Button
					variant="destructive"
					onClick={handleDeleteBank}
					disabled={isDeleting}
				>
					{isDeleting ? "Deleting..." : "Delete test bank"}
				</Button>
			</div>

			{deleteError ? (
				<p className="text-destructive text-sm" role="alert">
					{deleteError}
				</p>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Questions</CardTitle>
					<CardDescription>
						{questions.length === 0
							? "No questions yet. Add your first MCQ below."
							: `${questions.length} question${questions.length === 1 ? "" : "s"}. Use the Actions menu on each row for Edit, Preview, or Delete.`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{questions.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Use the form below to add your first question.
						</p>
					) : (
						<QuestionGrid
							bankId={bankId}
							questions={questions}
							onQuestionsChange={refreshQuestions}
						/>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Add question</CardTitle>
					<CardDescription>
						Each question needs 2–6 choices with exactly one correct answer.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<QuestionForm bankId={bankId} onSuccess={refreshQuestions} />
				</CardContent>
			</Card>
		</div>
	);
}
