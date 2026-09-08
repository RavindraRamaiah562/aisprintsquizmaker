import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./src/test/vitest-setup.ts"],
		include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
	},
});
