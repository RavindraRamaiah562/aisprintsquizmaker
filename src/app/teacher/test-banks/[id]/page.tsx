import { notFound } from "next/navigation";

import { TestBankDetail } from "@/components/test-bank/test-bank-detail";
import { getAuthEnv } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/require-auth";
import { getTestBankById } from "@/lib/db/test-banks";

export const dynamic = "force-dynamic";

type TestBankDetailPageProps = {
	params: Promise<{ id: string }>;
};

export default async function TestBankDetailPage({
	params,
}: TestBankDetailPageProps) {
	const user = await requireRole("teacher");
	const { id } = await params;
	const { db } = await getAuthEnv();
	const detail = await getTestBankById(db, id, user.id);

	if (!detail) {
		notFound();
	}

	const { questions, ...testBank } = detail;

	return (
		<TestBankDetail bankId={id} testBank={testBank} questions={questions} />
	);
}
