export interface CreateTestBankInput {
	title: string;
	description?: string | null;
}

export interface UpdateTestBankInput {
	title?: string;
	description?: string | null;
}

export interface QuestionChoiceInput {
	choiceText: string;
	isCorrect: boolean;
}

export interface CreateQuestionInput {
	prompt: string;
	choices: QuestionChoiceInput[];
}

export interface TestBankRecord {
	id: string;
	teacherId: string;
	title: string;
	description: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TestBankSummary {
	id: string;
	title: string;
	description: string | null;
	questionCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface QuestionChoiceRecord {
	id: string;
	choiceText: string;
	isCorrect: boolean;
	sortOrder: number;
}

export interface QuestionRecord {
	id: string;
	prompt: string;
	sortOrder: number;
	choices: QuestionChoiceRecord[];
}

export interface TestBankDetail extends TestBankRecord {
	questions: QuestionRecord[];
}

export interface StudentQuestionChoice {
	id: string;
	choiceText: string;
	sortOrder: number;
}

export interface StudentQuestionRecord {
	id: string;
	prompt: string;
	sortOrder: number;
	choices: StudentQuestionChoice[];
}

export interface StudentTestBankDetail {
	id: string;
	title: string;
	description: string | null;
	questions: StudentQuestionRecord[];
}

export interface ValidationErrors {
	title?: string;
	description?: string;
	prompt?: string;
	choices?: string;
}

export type TestBankValidationResult =
	| { success: true; data: CreateTestBankInput }
	| { success: false; errors: ValidationErrors };

export type QuestionValidationResult =
	| { success: true; data: CreateQuestionInput }
	| { success: false; errors: ValidationErrors };
