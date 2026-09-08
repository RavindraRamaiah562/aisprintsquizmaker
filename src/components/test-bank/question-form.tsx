"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { QuestionRecord } from "@/lib/test-bank/types";

type ChoiceDraft = {
	choiceText: string;
	isCorrect: boolean;
};

const MIN_CHOICES = 2;
const MAX_CHOICES = 6;

function createDefaultChoices(): ChoiceDraft[] {
	return [
		{ choiceText: "", isCorrect: false },
		{ choiceText: "", isCorrect: false },
	];
}

function toChoiceDrafts(question?: QuestionRecord): ChoiceDraft[] {
	if (!question) {
		return createDefaultChoices();
	}

	return question.choices.map((choice) => ({
		choiceText: choice.choiceText,
		isCorrect: choice.isCorrect,
	}));
}

type QuestionFormProps = {
	bankId: string;
	onSuccess: () => void;
	mode?: "create" | "edit";
	questionId?: string;
	initialQuestion?: QuestionRecord;
	onCancel?: () => void;
};

export function QuestionForm({
	bankId,
	onSuccess,
	mode = "create",
	questionId,
	initialQuestion,
	onCancel,
}: QuestionFormProps) {
	const isEdit = mode === "edit";
	const [prompt, setPrompt] = useState(initialQuestion?.prompt ?? "");
	const [choices, setChoices] = useState<ChoiceDraft[]>(() =>
		toChoiceDrafts(initialQuestion),
	);
	const [clientError, setClientError] = useState<string | null>(null);
	const [serverError, setServerError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	function updateChoiceText(index: number, value: string) {
		setChoices((current) =>
			current.map((choice, choiceIndex) =>
				choiceIndex === index ? { ...choice, choiceText: value } : choice,
			),
		);
	}

	function setCorrectChoice(index: number) {
		setChoices((current) =>
			current.map((choice, choiceIndex) => ({
				...choice,
				isCorrect: choiceIndex === index,
			})),
		);
	}

	function addChoice() {
		setChoices((current) =>
			current.length >= MAX_CHOICES
				? current
				: [...current, { choiceText: "", isCorrect: false }],
		);
	}

	function removeChoice(index: number) {
		setChoices((current) => {
			if (current.length <= MIN_CHOICES) {
				return current;
			}

			const next = current.filter((_, choiceIndex) => choiceIndex !== index);
			if (current[index]?.isCorrect && next.length > 0) {
				next[0] = { ...next[0], isCorrect: true };
			}

			return next;
		});
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setClientError(null);
		setServerError(null);

		const correctCount = choices.filter((choice) => choice.isCorrect).length;
		if (correctCount !== 1) {
			setClientError("Exactly one choice must be marked correct");
			return;
		}

		setIsSubmitting(true);

		const payload = {
			prompt,
			choices: choices.map((choice) => ({
				choiceText: choice.choiceText,
				isCorrect: choice.isCorrect,
			})),
		};

		try {
			const url =
				isEdit && questionId
					? `/api/teacher/test-banks/${bankId}/questions/${questionId}`
					: `/api/teacher/test-banks/${bankId}/questions`;

			const response = await fetch(url, {
				method: isEdit ? "PATCH" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data = (await response.json()) as { message?: string };

			if (!response.ok) {
				setServerError(
					data.message ??
						(isEdit ? "Failed to update question" : "Failed to add question"),
				);
				return;
			}

			if (!isEdit) {
				setPrompt("");
				setChoices(createDefaultChoices());
			}

			onSuccess();
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor={`prompt-${questionId ?? "new"}`}>
						Question prompt
					</FieldLabel>
					<Input
						id={`prompt-${questionId ?? "new"}`}
						name="prompt"
						value={prompt}
						onChange={(event) => setPrompt(event.target.value)}
						required
					/>
				</Field>

				<div className="space-y-3">
					<p className="text-sm font-medium">Choices</p>
					{choices.map((choice, index) => (
						<div key={index} className="flex items-center gap-3">
							<input
								type="radio"
								name={`correctChoice-${questionId ?? "new"}`}
								checked={choice.isCorrect}
								onChange={() => setCorrectChoice(index)}
								aria-label={`Mark choice ${index + 1} as correct`}
							/>
							<Input
								value={choice.choiceText}
								onChange={(event) =>
									updateChoiceText(index, event.target.value)
								}
								placeholder={`Choice ${index + 1}`}
								required
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={choices.length <= MIN_CHOICES}
								onClick={() => removeChoice(index)}
							>
								Remove
							</Button>
						</div>
					))}
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={choices.length >= MAX_CHOICES}
						onClick={addChoice}
					>
						Add choice
					</Button>
				</div>

				{clientError ? (
					<FieldError role="alert">{clientError}</FieldError>
				) : null}
				{serverError ? (
					<FieldError role="alert">{serverError}</FieldError>
				) : null}

				<div className="flex gap-3">
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting
							? isEdit
								? "Saving..."
								: "Adding..."
							: isEdit
								? "Save changes"
								: "Add question"}
					</Button>
					{onCancel ? (
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					) : null}
				</div>
			</FieldGroup>
		</form>
	);
}
