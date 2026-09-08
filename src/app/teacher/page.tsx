import Link from "next/link";

import { Button } from "@/components/ui/button";import { requireRole } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
	await requireRole("teacher");

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-semibold">Welcome, Teacher</h1>
			<p className="text-muted-foreground">
				Manage your MCQ test banks and prepare quizzes for students.
			</p>
			<Link href="/teacher/test-banks">
				<Button>Test banks</Button>
			</Link>
		</div>
	);
}
