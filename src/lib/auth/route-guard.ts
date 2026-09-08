import type { UserRole } from "@/lib/auth/types";

export interface AuthContext {
	role: UserRole;
}

export function getAuthRedirect(
	pathname: string,
	auth: AuthContext | null,
): string | null {
	const isTeacherRoute = pathname.startsWith("/teacher");
	const isStudentRoute = pathname.startsWith("/student");

	if (!isTeacherRoute && !isStudentRoute) {
		return null;
	}

	if (!auth) {
		return "/login";
	}

	if (isTeacherRoute && auth.role !== "teacher") {
		return "/student";
	}

	if (isStudentRoute && auth.role !== "student") {
		return "/teacher";
	}

	return null;
}

export function isProtectedPath(pathname: string): boolean {
	return pathname.startsWith("/teacher") || pathname.startsWith("/student");
}
