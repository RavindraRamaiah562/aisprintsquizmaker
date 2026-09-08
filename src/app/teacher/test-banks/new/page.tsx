import Link from "next/link";

import { TestBankForm } from "@/components/test-bank/test-bank-form";
import { requireRole } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export default async function NewTestBankPage() {
	await requireRole("teacher");

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<div>
				<Link
					href="/teacher/test-banks"
					className="text-muted-foreground text-sm hover:underline"
				>
					Back to test banks
				</Link>
				<h1 className="mt-2 text-2xl font-semibold">New test bank</h1>
			</div>
			<TestBankForm />
		</div>
	);
}
