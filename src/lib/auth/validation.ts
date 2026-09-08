import type { RegisterInput, UserRole } from "./types";

export interface RegistrationErrors {
	name?: string;
	email?: string;
	mobile?: string;
	password?: string;
	role?: string;
}

export type RegistrationValidationResult =
	| { success: true; data: RegisterInput }
	| { success: false; errors: RegistrationErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeMobile(mobile: string): string {
	const digits = mobile.replace(/\D/g, "");

	if (digits.length === 10) {
		return `91${digits}`;
	}

	return digits;
}

function validatePassword(password: string): string | undefined {
	if (password.length < 8) {
		return "Password must be at least 8 characters";
	}

	if (!/[a-zA-Z]/.test(password)) {
		return "Password must include at least one letter";
	}

	if (!/\d/.test(password)) {
		return "Password must include at least one number";
	}

	return undefined;
}

function isUserRole(value: string): value is UserRole {
	return value === "teacher" || value === "student";
}

export function validateRegistrationPayload(
	input: RegisterInput,
): RegistrationValidationResult {
	const errors: RegistrationErrors = {};
	const name = input.name.trim();
	const email = input.email.trim().toLowerCase();
	const mobile = normalizeMobile(input.mobile.trim());
	const password = input.password;
	const role = input.role;

	if (name.length < 2 || name.length > 100) {
		errors.name = "Name must be between 2 and 100 characters";
	}

	if (!EMAIL_PATTERN.test(email)) {
		errors.email = "Invalid email format";
	}

	if (mobile.length < 10) {
		errors.mobile = "Invalid mobile number";
	}

	const passwordError = validatePassword(password);
	if (passwordError) {
		errors.password = passwordError;
	}

	if (!isUserRole(role)) {
		errors.role = "Role must be teacher or student";
	}

	if (Object.keys(errors).length > 0) {
		return { success: false, errors };
	}

	return {
		success: true,
		data: { name, email, mobile, password, role },
	};
}
