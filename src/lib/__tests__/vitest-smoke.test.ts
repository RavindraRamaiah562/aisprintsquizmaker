import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("Phase 0: Vitest foundation", () => {
	it("executes tests and reports pass/fail", () => {
		expect(true).toBe(true);
	});

	it("resolves @/ path alias in test imports", () => {
		expect(cn("px-2", "py-1")).toBe("px-2 py-1");
	});
});
