import type { SessionData } from "./types";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function toBase64Url(bytes: Uint8Array): string {
	return Buffer.from(bytes)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/");
	const padLength = (4 - (padded.length % 4)) % 4;
	return new Uint8Array(Buffer.from(padded + "=".repeat(padLength), "base64"));
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	return crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

export async function signSessionToken(
	sessionId: string,
	secret: string,
): Promise<string> {
	const key = await getSigningKey(secret);
	const encoder = new TextEncoder();
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(sessionId),
	);

	return `${sessionId}.${toBase64Url(new Uint8Array(signature))}`;
}

async function verifySessionToken(
	token: string,
	secret: string,
): Promise<string | null> {
	const separatorIndex = token.lastIndexOf(".");
	if (separatorIndex === -1) {
		return null;
	}

	const sessionId = token.slice(0, separatorIndex);
	const signature = token.slice(separatorIndex + 1);
	const key = await getSigningKey(secret);
	const encoder = new TextEncoder();

	const valid = await crypto.subtle.verify(
		"HMAC",
		key,
		new Uint8Array(fromBase64Url(signature)),
		encoder.encode(sessionId),
	);

	return valid ? sessionId : null;
}

export async function createSession(
	db: D1Database,
	userId: string,
	secret: string,
): Promise<string> {
	const sessionId = crypto.randomUUID();
	const expiresAt = new Date(
		Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
	).toISOString();

	await db
		.prepare(
			"INSERT INTO sessions (id, user_id, expires_at) VALUES (?1, ?2, ?3)",
		)
		.bind(sessionId, userId, expiresAt)
		.run();

	return signSessionToken(sessionId, secret);
}

export async function readSession(
	db: D1Database,
	token: string,
	secret: string,
): Promise<SessionData | null> {
	const sessionId = await verifySessionToken(token, secret);
	if (!sessionId) {
		return null;
	}

	const row = await db
		.prepare(
			"SELECT user_id, expires_at FROM sessions WHERE id = ?1 LIMIT 1",
		)
		.bind(sessionId)
		.first<{ user_id: string; expires_at: string }>();

	if (!row) {
		return null;
	}

	if (new Date(row.expires_at).getTime() <= Date.now()) {
		return null;
	}

	return { userId: row.user_id, sessionId };
}

export async function destroySession(
	db: D1Database,
	token: string,
	secret: string,
): Promise<void> {
	const sessionId = await verifySessionToken(token, secret);
	if (!sessionId) {
		return;
	}

	await db.prepare("DELETE FROM sessions WHERE id = ?1").bind(sessionId).run();
}
