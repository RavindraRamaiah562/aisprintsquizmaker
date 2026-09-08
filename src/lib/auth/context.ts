import { getCloudflareContext } from "@opennextjs/cloudflare";

export class AuthConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AuthConfigError";
	}
}

export async function getAuthEnv(): Promise<{
	db: D1Database;
	sessionSecret: string;
}> {
	const { env } = await getCloudflareContext({ async: true });
	const sessionSecret = env.SESSION_SECRET;

	if (!sessionSecret) {
		throw new AuthConfigError("SESSION_SECRET is not configured");
	}

	return {
		db: env.DB,
		sessionSecret,
	};
}
