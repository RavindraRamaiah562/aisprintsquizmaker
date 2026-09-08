export type UserRole = "teacher" | "student";

export interface RegisterInput {
	name: string;
	email: string;
	mobile: string;
	password: string;
	role: UserRole;
}

export interface UserRow {
	id: string;
	name: string;
	email: string;
	mobile: string;
	password_hash: string;
	role: UserRole;
	created_at: string;
	updated_at: string;
}

export interface PublicUser {
	id: string;
	name: string;
	email: string;
	mobile: string;
	role: UserRole;
}

export interface SessionData {
	userId: string;
	sessionId: string;
}
