import { describe, expect, it } from "vitest";

import {
	validateCreateTestBankInput,
	validateQuestionInput,
} from "./validation";

const validBank = {
	title: "Chapter 5 Review",
	description: "Fractions unit",
};

const validQuestion = {
	prompt: "What is 2 + 2?",
	choices: [
		{ choiceText: "3", isCorrect: false },
		{ choiceText: "4", isCorrect: true },
		{ choiceText: "5", isCorrect: false },
	],
};

describe("AC-001: test bank validation", () => {
	it("rejects title shorter than 3 characters", () => {
		const result = validateCreateTestBankInput({ title: "AB" });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.title).toBeDefined();
		}
	});

	it("accepts valid bank payload", () => {
		const result = validateCreateTestBankInput(validBank);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.title).toBe("Chapter 5 Review");
		}
	});
});

describe("AC-004: question choice count validation", () => {
	it("rejects question with fewer than 2 choices", () => {
		const result = validateQuestionInput({
			prompt: "Pick one",
			choices: [{ choiceText: "Only one", isCorrect: true }],
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.choices).toBeDefined();
		}
	});

	it("rejects question with more than 6 choices", () => {
		const result = validateQuestionInput({
			prompt: "Pick one",
			choices: Array.from({ length: 7 }, (_, index) => ({
				choiceText: `Choice ${index + 1}`,
				isCorrect: index === 0,
			})),
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.choices).toBeDefined();
		}
	});

	it("accepts valid question payload", () => {
		const result = validateQuestionInput(validQuestion);

		expect(result.success).toBe(true);
	});
});

describe("AC-005: correct answer validation", () => {
	it("rejects question with zero correct choices", () => {
		const result = validateQuestionInput({
			prompt: "What is 2 + 2?",
			choices: [
				{ choiceText: "3", isCorrect: false },
				{ choiceText: "5", isCorrect: false },
			],
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.choices).toBeDefined();
		}
	});

	it("rejects question with multiple correct choices", () => {
		const result = validateQuestionInput({
			prompt: "What is 2 + 2?",
			choices: [
				{ choiceText: "4", isCorrect: true },
				{ choiceText: "four", isCorrect: true },
			],
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors.choices).toBeDefined();
		}
	});
});
