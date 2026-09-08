import type {
	CreateQuestionInput,
	CreateTestBankInput,
	QuestionValidationResult,
	TestBankValidationResult,
	ValidationErrors,
} from "./types";

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 200;
const MIN_PROMPT_LENGTH = 5;
const MAX_PROMPT_LENGTH = 2000;
const MIN_CHOICES = 2;
const MAX_CHOICES = 6;
const MAX_CHOICE_LENGTH = 500;

function validateTitle(title: string): string | undefined {
	const trimmed = title.trim();

	if (trimmed.length < MIN_TITLE_LENGTH || trimmed.length > MAX_TITLE_LENGTH) {
		return `Title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters`;
	}

	return undefined;
}

function validateChoices(
	choices: CreateQuestionInput["choices"],
): string | undefined {
	if (choices.length < MIN_CHOICES || choices.length > MAX_CHOICES) {
		return `Each question must have between ${MIN_CHOICES} and ${MAX_CHOICES} choices`;
	}

	for (const choice of choices) {
		const trimmed = choice.choiceText.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_CHOICE_LENGTH) {
			return "Each choice must be between 1 and 500 characters";
		}
	}

	const correctCount = choices.filter((choice) => choice.isCorrect).length;
	if (correctCount === 0) {
		return "Exactly one choice must be marked correct";
	}

	if (correctCount > 1) {
		return "Only one choice may be marked correct";
	}

	return undefined;
}

export function validateCreateTestBankInput(
	input: CreateTestBankInput,
): TestBankValidationResult {
	const errors: ValidationErrors = {};
	const titleError = validateTitle(input.title);

	if (titleError) {
		errors.title = titleError;
	}

	if (Object.keys(errors).length > 0) {
		return { success: false, errors };
	}

	return {
		success: true,
		data: {
			title: input.title.trim(),
			description: input.description?.trim() || null,
		},
	};
}

export function validateQuestionInput(
	input: CreateQuestionInput,
): QuestionValidationResult {
	const errors: ValidationErrors = {};
	const prompt = input.prompt.trim();

	if (prompt.length < MIN_PROMPT_LENGTH || prompt.length > MAX_PROMPT_LENGTH) {
		errors.prompt = `Prompt must be between ${MIN_PROMPT_LENGTH} and ${MAX_PROMPT_LENGTH} characters`;
	}

	const choicesError = validateChoices(input.choices);
	if (choicesError) {
		errors.choices = choicesError;
	}

	if (Object.keys(errors).length > 0) {
		return { success: false, errors };
	}

	return {
		success: true,
		data: {
			prompt,
			choices: input.choices.map((choice) => ({
				choiceText: choice.choiceText.trim(),
				isCorrect: choice.isCorrect,
			})),
		},
	};
}
