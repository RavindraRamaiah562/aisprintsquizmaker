// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LogoutButton } from "@/components/auth/logout-button";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push,
		refresh: vi.fn(),
	}),
}));

describe("AC-010: logout control", () => {
	beforeEach(() => {
		push.mockReset();
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ success: true }),
			} as Response),
		);
	});

	it("triggers logout API and redirects to /login", async () => {
		const user = userEvent.setup();
		render(<LogoutButton />);

		await user.click(screen.getByRole("button", { name: /log out/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				"/api/auth/logout",
				expect.objectContaining({ method: "POST" }),
			);
			expect(push).toHaveBeenCalledWith("/login");
		});
	});
});
