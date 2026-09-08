import { hashPassword } from "@/lib/auth/password";
import type { PublicUser, RegisterInput, UserRow } from "@/lib/auth/types";
import { normalizeMobile } from "@/lib/auth/validation";

import { DuplicateUserError } from "./errors";

function toPublicUser(row: UserRow): PublicUser {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		mobile: row.mobile,
		role: row.role,
	};
}

function isUniqueConstraintError(error: unknown): boolean {
	return (
		error instanceof Error &&
		(error.message.includes("UNIQUE constraint failed") ||
			error.message.includes("idx_users_email") ||
			error.message.includes("idx_users_mobile"))
	);
}

export async function createUser(
	db: D1Database,
	input: RegisterInput,
): Promise<PublicUser> {
	const passwordHash = await hashPassword(input.password);
	const email = input.email.trim().toLowerCase();
	const mobile = normalizeMobile(input.mobile);
	const name = input.name.trim();

	try {
		await db
			.prepare(
				`INSERT INTO users (name, email, mobile, password_hash, role)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
			)
			.bind(name, email, mobile, passwordHash, input.role)
			.run();
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			const existingEmail = await db
				.prepare("SELECT id FROM users WHERE email = ?1 LIMIT 1")
				.bind(email)
				.first();

			if (existingEmail) {
				throw new DuplicateUserError("email");
			}

			throw new DuplicateUserError("mobile");
		}

		throw error;
	}

	const row = await db
		.prepare(
			`SELECT id, name, email, mobile, password_hash, role, created_at, updated_at
       FROM users
       WHERE email = ?1
       LIMIT 1`,
		)
		.bind(email)
		.first<UserRow>();

	if (!row) {
		throw new Error("Failed to create user");
	}

	return toPublicUser(row);
}

export async function findUserByIdentifier(
	db: D1Database,
	identifier: string,
): Promise<UserRow | null> {
	const trimmed = identifier.trim();
	const emailCandidate = trimmed.toLowerCase();
	const mobileCandidate = normalizeMobile(trimmed);
	const nameCandidate = trimmed;

	const result = await db
		.prepare(
			`SELECT id, name, email, mobile, password_hash, role, created_at, updated_at
       FROM users
       WHERE email = ?1 OR mobile = ?2 OR name = ?3
       LIMIT 1`,
		)
		.bind(emailCandidate, mobileCandidate, nameCandidate)
		.first<UserRow>();

	return result ?? null;
}

export async function findUserById(
	db: D1Database,
	id: string,
): Promise<PublicUser | null> {
	const row = await db
		.prepare(
			`SELECT id, name, email, mobile, password_hash, role, created_at, updated_at
       FROM users
       WHERE id = ?1
       LIMIT 1`,
		)
		.bind(id)
		.first<UserRow>();

	return row ? toPublicUser(row) : null;
}
