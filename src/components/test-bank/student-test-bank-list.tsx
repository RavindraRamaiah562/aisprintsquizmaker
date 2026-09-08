import Link from "next/link";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { TestBankSummary } from "@/lib/test-bank/types";

type StudentTestBankListProps = {
	testBanks: TestBankSummary[];
};

export function StudentTestBankList({ testBanks }: StudentTestBankListProps) {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Question Banks</h1>
				<p className="text-muted-foreground text-sm">
					Browse available question banks and review the MCQ questions inside
					each bank.
				</p>
			</div>

			{testBanks.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>No question banks yet</CardTitle>
						<CardDescription>
							Your teacher has not published any question banks yet.
						</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<Card>
					<CardContent className="pt-6">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Title</TableHead>
									<TableHead>Description</TableHead>
									<TableHead>Questions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{testBanks.map((bank) => (
									<TableRow key={bank.id}>
										<TableCell>
											<Link
												href={`/student/test-banks/${bank.id}`}
												className="text-primary font-medium hover:underline"
											>
												{bank.title}
											</Link>
										</TableCell>
										<TableCell className="max-w-xs truncate">
											{bank.description ?? "—"}
										</TableCell>
										<TableCell>{bank.questionCount}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
