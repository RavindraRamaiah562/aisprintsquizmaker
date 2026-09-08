// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TestBankList } from "@/components/test-bank/test-bank-list";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

const sampleBank = {
	id: "bank-1",
	title: "Chapter 5 Review",
	description: "Fractions unit",
	questionCount: 2,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("AC-002: test bank list page", () => {
	it("renders list and create button", () => {
		render(<TestBankList testBanks={[sampleBank]} />);

		expect(screen.getByRole("heading", { name: /test banks/i })).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /create test bank/i }),
		).toHaveAttribute("href", "/teacher/test-banks/new");
		expect(screen.getByText("Chapter 5 Review")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("shows empty state when no banks", () => {
		render(<TestBankList testBanks={[]} />);

		expect(screen.getByText(/no test banks yet/i)).toBeInTheDocument();
		expect(screen.getAllByRole("link", { name: /create test bank/i })).toHaveLength(
			2,
		);
	});
});
