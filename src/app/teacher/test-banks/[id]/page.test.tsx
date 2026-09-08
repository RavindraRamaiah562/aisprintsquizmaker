// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TestBankDetail } from "@/components/test-bank/test-bank-detail";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push,
		refresh: vi.fn(),
	}),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

const testBank = {
	id: "bank-1",
	teacherId: "teacher-1",
	title: "Math Quiz",
	description: "Chapter 5",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const sampleQuestions = [
	{
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
	},
];

describe("AC-003: test bank detail page", () => {
	it("displays questions for a bank", () => {
		render(
			<TestBankDetail
				bankId="bank-1"
				testBank={testBank}
				questions={sampleQuestions}
			/>,
		);

		expect(screen.getByText(/what is 2 \+ 2\?/i)).toBeInTheDocument();
		expect(screen.getByText("4")).toBeInTheDocument();
		expect(screen.getByText("Correct answer")).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
	});
});

describe("AC-004: add question form", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	it("calls POST API when adding a valid question", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({
				question: {
					id: "question-2",
					prompt: "What is 3 + 3?",
					sortOrder: 1,
					choices: [],
				},
			}),
		} as Response);

		const user = userEvent.setup();
		render(
			<TestBankDetail bankId="bank-1" testBank={testBank} questions={[]} />,
		);

		await user.type(
			screen.getByLabelText(/question prompt/i),
			"What is 3 + 3?",
		);
		await user.type(screen.getByPlaceholderText(/choice 1/i), "5");
		await user.type(screen.getByPlaceholderText(/choice 2/i), "6");
		await user.click(
			screen.getByRole("radio", { name: /mark choice 2 as correct/i }),
		);
		await user.click(screen.getByRole("button", { name: /add question/i }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/teacher/test-banks/bank-1/questions",
				expect.objectContaining({ method: "POST" }),
			);
		});
	});
});

describe("AC-005: question validation", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	it("shows validation error when no correct choice is selected", async () => {
		render(
			<TestBankDetail bankId="bank-1" testBank={testBank} questions={[]} />,
		);

		fireEvent.change(screen.getByLabelText(/question prompt/i), {
			target: { value: "What is 2 + 2?" },
		});
		fireEvent.change(screen.getByPlaceholderText(/choice 1/i), {
			target: { value: "3" },
		});
		fireEvent.change(screen.getByPlaceholderText(/choice 2/i), {
			target: { value: "5" },
		});

		fireEvent.submit(
			screen.getByRole("button", { name: /add question/i }).closest("form")!,
		);

		expect(
			await screen.findByText(/exactly one choice must be marked correct/i),
		).toBeInTheDocument();
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe("question menu actions", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
		vi.spyOn(window, "confirm").mockReturnValue(true);
	});

	it("shows Edit, Preview, and Delete in the question menu", async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<TestBankDetail
				bankId="bank-1"
				testBank={testBank}
				questions={sampleQuestions}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /actions for question 1/i }),
		);

		expect(await screen.findByText("Edit")).toBeInTheDocument();
		expect(screen.getByText("Preview")).toBeInTheDocument();
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("calls DELETE question API from menu", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true }),
		} as Response);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<TestBankDetail
				bankId="bank-1"
				testBank={testBank}
				questions={sampleQuestions}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /actions for question 1/i }),
		);
		await user.click(await screen.findByText("Delete"));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/teacher/test-banks/bank-1/questions/question-1",
				expect.objectContaining({ method: "DELETE" }),
			);
		});
	});
});

describe("AC-007: delete test bank", () => {
	beforeEach(() => {
		push.mockReset();
		vi.spyOn(window, "confirm").mockReturnValue(true);
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ success: true }),
			} as Response),
		);
	});

	it("calls DELETE API when confirmed", async () => {
		const user = userEvent.setup();
		render(
			<TestBankDetail
				bankId="bank-1"
				testBank={testBank}
				questions={sampleQuestions}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /delete test bank/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				"/api/teacher/test-banks/bank-1",
				expect.objectContaining({ method: "DELETE" }),
			);
			expect(push).toHaveBeenCalledWith("/teacher/test-banks");
		});
	});
});
