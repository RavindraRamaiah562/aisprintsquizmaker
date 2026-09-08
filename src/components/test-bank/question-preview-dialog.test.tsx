// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { QuestionPreviewDialog } from "@/components/test-bank/question-preview-dialog";

const sampleQuestion = {
	id: "question-1",
	prompt: "What is 2 + 2?",
	sortOrder: 0,
	choices: [
		{
			id: "choice-1",
			choiceText: "3",
			isCorrect: false,
			sortOrder: 0,
		},
		{
			id: "choice-2",
			choiceText: "4",
			isCorrect: true,
			sortOrder: 1,
		},
	],
};

describe("QuestionPreviewDialog", () => {
	it("shows correct result when the right choice is submitted", async () => {
		const user = userEvent.setup();
		render(
			<QuestionPreviewDialog
				question={sampleQuestion}
				open
				onOpenChange={() => undefined}
			/>,
		);

		await user.click(screen.getByLabelText("4"));
		await user.click(screen.getByRole("button", { name: /submit answer/i }));

		expect(screen.getByText(/correct! well done/i)).toBeInTheDocument();
	});

	it("shows incorrect result with the correct answer", async () => {
		const user = userEvent.setup();
		render(
			<QuestionPreviewDialog
				question={sampleQuestion}
				open
				onOpenChange={() => undefined}
			/>,
		);

		await user.click(screen.getByLabelText("3"));
		await user.click(screen.getByRole("button", { name: /submit answer/i }));

		expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
		expect(
			screen.getByText(/the correct answer is: 4/i),
		).toBeInTheDocument();
	});

	it("requires a selected answer before submit", async () => {
		const user = userEvent.setup();
		render(
			<QuestionPreviewDialog
				question={sampleQuestion}
				open
				onOpenChange={() => undefined}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /submit answer/i }));

		expect(
			screen.getByText(/please select an answer/i),
		).toBeInTheDocument();
	});
});
