"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function TestBankForm() {
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setServerError(null);

		const formData = new FormData(event.currentTarget);
		const title = String(formData.get("title") ?? "").trim();
		const description = String(formData.get("description") ?? "").trim();

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/teacher/test-banks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title,
					description: description.length > 0 ? description : null,
				}),
			});

			const data = (await response.json()) as {
				message?: string;
				testBank?: { id: string };
			};

			if (!response.ok) {
				setServerError(data.message ?? "Failed to create test bank");
				return;
			}

			if (data.testBank?.id) {
				router.push(`/teacher/test-banks/${data.testBank.id}`);
				router.refresh();
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create test bank</CardTitle>
				<CardDescription>
					Add a title and optional description for your new question bank.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-6">
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="title">Title</FieldLabel>
							<Input id="title" name="title" required />
						</Field>

						<Field>
							<FieldLabel htmlFor="description">Description</FieldLabel>
							<Input id="description" name="description" />
						</Field>

						{serverError ? (
							<FieldError role="alert">{serverError}</FieldError>
						) : null}

						<div className="flex gap-3">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Creating..." : "Create test bank"}
							</Button>
							<Link href="/teacher/test-banks">
								<Button type="button" variant="outline">
									Cancel
								</Button>
							</Link>
						</div>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
