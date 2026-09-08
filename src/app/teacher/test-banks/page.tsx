import { TestBankList } from "@/components/test-bank/test-bank-list";
import { getAuthEnv } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/require-auth";
import { listTestBanksByTeacher } from "@/lib/db/test-banks";

export const dynamic = "force-dynamic";

export default async function TestBanksPage() {
	const user = await requireRole("teacher");
	const { db } = await getAuthEnv();
	const testBanks = await listTestBanksByTeacher(db, user.id);

	return <TestBankList testBanks={testBanks} />;
}
