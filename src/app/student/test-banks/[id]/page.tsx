import { notFound } from "next/navigation";

import { StudentTestBankDetailView } from "@/components/test-bank/student-test-bank-detail";
import { getAuthEnv } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/require-auth";
import { getTestBankForStudent } from "@/lib/db/test-banks";

export const dynamic = "force-dynamic";

type StudentTestBankDetailPageProps = {
	params: Promise<{ id: string }>;
};

export default async function StudentTestBankDetailPage({
	params,
}: StudentTestBankDetailPageProps) {
	await requireRole("student");
	const { id } = await params;
	const { db } = await getAuthEnv();
	const testBank = await getTestBankForStudent(db, id);

	if (!testBank) {
		notFound();
	}

	return <StudentTestBankDetailView testBank={testBank} />;
}
