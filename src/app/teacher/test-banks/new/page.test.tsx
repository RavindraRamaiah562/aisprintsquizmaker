// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TestBankForm } from "@/components/test-bank/test-bank-form";

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

describe("AC-001: create test bank page", () => {
	beforeEach(() => {
		push.mockReset();
		vi.stubGlobal("fetch", vi.fn());
	});

	it("submits create bank API on valid form", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ testBank: { id: "bank-123" } }),
		} as Response);

		const user = userEvent.setup();
		render(<TestBankForm />);

		await user.type(screen.getByLabelText(/^title$/i), "Science Quiz");
		await user.type(screen.getByLabelText(/^description$/i), "Unit 1");
		await user.click(screen.getByRole("button", { name: /create test bank/i }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/teacher/test-banks",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({
						title: "Science Quiz",
						description: "Unit 1",
					}),
				}),
			);
		});

		expect(push).toHaveBeenCalledWith("/teacher/test-banks/bank-123");
	});
});
