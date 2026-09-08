// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RegisterForm } from "@/components/auth/register-form";

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

describe("AC-001: Register page", () => {
	beforeEach(() => {
		push.mockReset();
		vi.stubGlobal("fetch", vi.fn());
	});

	it("renders all required fields", () => {
		render(<RegisterForm />);

		expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/mobile number/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
	});

	it("calls register API on valid submit", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ user: { role: "teacher" } }),
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ user: { role: "teacher" } }),
			} as Response);

		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/full name/i), "Jane Teacher");
		await user.type(screen.getByLabelText(/^email$/i), "jane@school.edu");
		await user.type(screen.getByLabelText(/mobile number/i), "+919876543210");
		await user.type(screen.getByLabelText(/^password$/i), "SecurePass123!");
		await user.type(
			screen.getByLabelText(/confirm password/i),
			"SecurePass123!",
		);
		await user.selectOptions(screen.getByLabelText(/role/i), "teacher");
		await user.click(screen.getByRole("button", { name: /register/i }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/auth/register",
				expect.objectContaining({ method: "POST" }),
			);
		});
	});
});

describe("AC-003: Register validation", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	it("shows validation error when passwords do not match", async () => {
		render(<RegisterForm />);

		fireEvent.change(screen.getByLabelText(/^password$/i), {
			target: { value: "SecurePass123!" },
		});
		fireEvent.change(screen.getByLabelText(/confirm password/i), {
			target: { value: "DifferentPass123!" },
		});

		fireEvent.submit(
			screen.getByRole("button", { name: /register/i }).closest("form")!,
		);

		expect(
			await screen.findByText(/passwords do not match/i),
		).toBeInTheDocument();
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe("AC-002: Register server errors", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => ({ message: "email already registered" }),
			} as Response),
		);
	});

	it("displays server error on duplicate email", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/full name/i), "Jane Teacher");
		await user.type(screen.getByLabelText(/^email$/i), "jane@school.edu");
		await user.type(screen.getByLabelText(/mobile number/i), "+919876543210");
		await user.type(screen.getByLabelText(/^password$/i), "SecurePass123!");
		await user.type(
			screen.getByLabelText(/confirm password/i),
			"SecurePass123!",
		);
		await user.click(screen.getByRole("button", { name: /register/i }));

		expect(
			await screen.findByText(/email already registered/i),
		).toBeInTheDocument();
	});
});
