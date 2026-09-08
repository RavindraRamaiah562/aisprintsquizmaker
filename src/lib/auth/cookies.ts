export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function buildSessionCookie(
	token: string,
	isProduction = process.env.NODE_ENV === "production",
): string {
	const parts = [
		`${SESSION_COOKIE_NAME}=${token}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		`Max-Age=${SESSION_MAX_AGE_SECONDS}`,
	];

	if (isProduction) {
		parts.push("Secure");
	}

	return parts.join("; ");
}

export function clearSessionCookie(
	isProduction = process.env.NODE_ENV === "production",
): string {
	const parts = [
		`${SESSION_COOKIE_NAME}=`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		"Max-Age=0",
	];

	if (isProduction) {
		parts.push("Secure");
	}

	return parts.join("; ");
}

export function getSessionTokenFromRequest(request: Request): string | null {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) {
		return null;
	}

	const cookies = cookieHeader.split(";").map((part) => part.trim());
	for (const cookie of cookies) {
		if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
			return cookie.slice(SESSION_COOKIE_NAME.length + 1);
		}
	}

	return null;
}
