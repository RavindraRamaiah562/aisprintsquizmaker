import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
	await requireRole("student");

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-semibold">Welcome, Student</h1>
			<p className="text-muted-foreground">
				Browse question banks created by your teachers and review the MCQ
				questions inside each bank.
			</p>
			<Link href="/student/test-banks">
				<Button>Question banks</Button>
			</Link>
		</div>
	);
}
