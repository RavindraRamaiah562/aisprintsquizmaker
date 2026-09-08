// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/auth/login-form";

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

describe("AC-004: Login page", () => {
	beforeEach(() => {
		push.mockReset();
		vi.stubGlobal("fetch", vi.fn());
	});

	it("renders username and password fields with helper text", () => {
		render(<LoginForm />);

		expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
		expect(
			screen.getByText(/enter your name, email, or mobile number/i),
		).toBeInTheDocument();
	});

	it("calls login API on submit", async () => {
		const fetchMock = vi.mocked(fetch);
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ user: { role: "teacher" } }),
		} as Response);

		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText(/username/i), "jane@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "SecurePass123!");
		await user.click(screen.getByRole("button", { name: /log in/i }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/auth/login",
				expect.objectContaining({ method: "POST" }),
			);
		});
	});
});

describe("AC-007: Login errors", () => {
	beforeEach(() => {
		push.mockReset();
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => ({ message: "Invalid username or password" }),
			} as Response),
		);
	});

	it("shows generic error on 401 response", async () => {
		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText(/username/i), "jane@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "WrongPass123!");
		await user.click(screen.getByRole("button", { name: /log in/i }));

		expect(
			await screen.findByText(/invalid username or password/i),
		).toBeInTheDocument();
	});
});

describe("AC-011: Login redirects", () => {
	beforeEach(() => {
		push.mockReset();
	});

	it("redirects teacher to /teacher on success", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ user: { role: "teacher" } }),
			} as Response),
		);

		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText(/username/i), "jane@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "SecurePass123!");
		await user.click(screen.getByRole("button", { name: /log in/i }));

		await waitFor(() => {
			expect(push).toHaveBeenCalledWith("/teacher");
		});
	});

	it("redirects student to /student on success", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ user: { role: "student" } }),
			} as Response),
		);

		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText(/username/i), "sam@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "SecurePass123!");
		await user.click(screen.getByRole("button", { name: /log in/i }));

		await waitFor(() => {
			expect(push).toHaveBeenCalledWith("/student");
		});
	});
});
