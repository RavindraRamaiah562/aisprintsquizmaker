"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import type { QuestionRecord } from "@/lib/test-bank/types";

type PreviewResult = "correct" | "incorrect";

type QuestionPreviewDialogProps = {
	question: QuestionRecord | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function QuestionPreviewDialog({
	question,
	open,
	onOpenChange,
}: QuestionPreviewDialogProps) {
	const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
	const [result, setResult] = useState<PreviewResult | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);

	function resetPreviewState() {
		setSelectedChoiceId(null);
		setResult(null);
		setSubmitError(null);
	}

	function handleOpenChange(next: boolean) {
		if (!next) {
			resetPreviewState();
		}
		onOpenChange(next);
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!question) {
			return;
		}

		if (!selectedChoiceId) {
			setSubmitError("Please select an answer");
			return;
		}

		const selectedChoice = question.choices.find(
			(choice) => choice.id === selectedChoiceId,
		);

		setSubmitError(null);
		setResult(selectedChoice?.isCorrect ? "correct" : "incorrect");
	}

	function handleTryAgain() {
		resetPreviewState();
	}

	const correctChoice = question?.choices.find((choice) => choice.isCorrect);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Question preview</DialogTitle>
					<DialogDescription>
						Attempt this question as a student would, then submit to validate
						your answer.
					</DialogDescription>
				</DialogHeader>

				{question ? (
					<form
						key={question.id}
						onSubmit={handleSubmit}
						className="space-y-4"
					>
						<p className="font-medium">{question.prompt}</p>

						<div className="space-y-2">
							{question.choices.map((choice) => (
								<label
									key={choice.id}
									className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
								>
									<input
										type="radio"
										name={`preview-choice-${question.id}`}
										value={choice.id}
										checked={selectedChoiceId === choice.id}
										disabled={result !== null}
										onChange={() => setSelectedChoiceId(choice.id)}
									/>
									<span>{choice.choiceText}</span>
								</label>
							))}
						</div>

						{submitError ? (
							<FieldError role="alert">{submitError}</FieldError>
						) : null}

						{result === "correct" ? (
							<p className="text-sm font-medium text-green-700" role="status">
								Correct! Well done.
							</p>
						) : null}

						{result === "incorrect" ? (
							<p className="text-destructive text-sm font-medium" role="status">
								Incorrect. The correct answer is: {correctChoice?.choiceText}
							</p>
						) : null}

						<div className="flex gap-3">
							{result === null ? (
								<Button type="submit">Submit answer</Button>
							) : (
								<Button type="button" variant="outline" onClick={handleTryAgain}>
									Try again
								</Button>
							)}
						</div>
					</form>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
