import { StudentTestBankList } from "@/components/test-bank/student-test-bank-list";
import { getAuthEnv } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/require-auth";
import { listAllTestBanks } from "@/lib/db/test-banks";

export const dynamic = "force-dynamic";

export default async function StudentTestBanksPage() {
	await requireRole("student");
	const { db } = await getAuthEnv();
	const testBanks = await listAllTestBanks(db);

	return <StudentTestBankList testBanks={testBanks} />;
}
