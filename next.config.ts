import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Pin the workspace root so a stray lockfile elsewhere on the machine cannot
	// make Turbopack infer the wrong project directory.
	turbopack: {
		root: __dirname,
	},
	// Allow cross-origin dev requests when using 127.0.0.1 or Workers preview (8787).
	allowedDevOrigins: [
		"127.0.0.1:3000",
		"127.0.0.1:8787",
		"localhost:8787",
	],
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
