"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);
	const [clientError, setClientError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setServerError(null);
		setClientError(null);

		const form = event.currentTarget;
		const formData = new FormData(form);
		const password = String(formData.get("password") ?? "");
		const confirmPassword = String(formData.get("confirmPassword") ?? "");

		if (password !== confirmPassword) {
			setClientError("Passwords do not match");
			return;
		}

		const payload = {
			name: String(formData.get("name") ?? ""),
			email: String(formData.get("email") ?? ""),
			mobile: String(formData.get("mobile") ?? ""),
			password,
			role: String(formData.get("role") ?? ""),
		};

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data = (await response.json()) as {
				message?: string;
				user?: { role: "teacher" | "student" };
			};

			if (!response.ok) {
				setServerError(data.message ?? "Registration failed");
				return;
			}

			const loginResponse = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					identifier: payload.email,
					password: payload.password,
				}),
			});

			if (!loginResponse.ok) {
				router.push("/login");
				return;
			}

			const loginData = (await loginResponse.json()) as {
				user: { role: "teacher" | "student" };
			};
			router.push(
				loginData.user.role === "teacher" ? "/teacher" : "/student",
			);
			router.refresh();
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} noValidate className="space-y-6">
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="name">Full name</FieldLabel>
					<Input id="name" name="name" required autoComplete="name" />
				</Field>

				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>
					<Input
						id="email"
						name="email"
						type="email"
						required
						autoComplete="email"
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="mobile">Mobile number</FieldLabel>
					<Input
						id="mobile"
						name="mobile"
						type="tel"
						required
						autoComplete="tel"
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="password">Password</FieldLabel>
					<Input
						id="password"
						name="password"
						type="password"
						required
						autoComplete="new-password"
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
					<Input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						required
						autoComplete="new-password"
					/>
					{clientError ? (
						<FieldError role="alert">{clientError}</FieldError>
					) : null}
				</Field>

				<Field>
					<FieldLabel htmlFor="role">Role</FieldLabel>
					<select
						id="role"
						name="role"
						required
						className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
						defaultValue="teacher"
					>
						<option value="teacher">Teacher</option>
						<option value="student">Student</option>
					</select>
				</Field>

				{serverError ? (
					<FieldError role="alert">{serverError}</FieldError>
				) : null}

				<Button type="submit" disabled={isSubmitting} className="w-full">
					{isSubmitting ? "Creating account..." : "Register"}
				</Button>

				<FieldDescription>
					Already have an account?{" "}
					<Link href="/login" className="text-primary underline-offset-4 hover:underline">
						Log in
					</Link>
				</FieldDescription>
			</FieldGroup>
		</form>
	);
}
