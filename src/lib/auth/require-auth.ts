import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthEnv } from "@/lib/auth/context";
import { readSession } from "@/lib/auth/session";
import type { PublicUser, UserRole } from "@/lib/auth/types";
import { findUserById } from "@/lib/db/users";

import { SESSION_COOKIE_NAME } from "./cookies";

export async function getCurrentUser(): Promise<PublicUser | null> {
	const { db, sessionSecret } = await getAuthEnv();
	const cookieStore = await cookies();
	const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

	if (!token) {
		return null;
	}

	const session = await readSession(db, token, sessionSecret);

	if (!session) {
		return null;
	}

	return findUserById(db, session.userId);
}

export async function requireRole(role: UserRole): Promise<PublicUser> {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	if (user.role !== role) {
		redirect(user.role === "teacher" ? "/teacher" : "/student");
	}

	return user;
}
