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

export function LoginForm() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const formData = new FormData(event.currentTarget);
		const payload = {
			identifier: String(formData.get("identifier") ?? ""),
			password: String(formData.get("password") ?? ""),
		};

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data = (await response.json()) as {
				message?: string;
				user: { role: "teacher" | "student" };
			};

			if (!response.ok) {
				setError(data.message ?? "Invalid username or password");
				return;
			}

			router.push(data.user.role === "teacher" ? "/teacher" : "/student");
			router.refresh();
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="identifier">Username</FieldLabel>
					<Input
						id="identifier"
						name="identifier"
						required
						autoComplete="username"
					/>
					<FieldDescription>
						Enter your name, email, or mobile number
					</FieldDescription>
				</Field>

				<Field>
					<FieldLabel htmlFor="password">Password</FieldLabel>
					<Input
						id="password"
						name="password"
						type="password"
						required
						autoComplete="current-password"
					/>
				</Field>

				{error ? <FieldError role="alert">{error}</FieldError> : null}

				<Button type="submit" disabled={isSubmitting} className="w-full">
					{isSubmitting ? "Signing in..." : "Log in"}
				</Button>

				<FieldDescription>
					Need an account?{" "}
					<Link
						href="/register"
						className="text-primary underline-offset-4 hover:underline"
					>
						Register
					</Link>
				</FieldDescription>
			</FieldGroup>
		</form>
	);
}
