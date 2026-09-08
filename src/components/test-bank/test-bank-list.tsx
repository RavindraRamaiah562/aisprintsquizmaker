import Link from "next/link";

import { Button } from "@/components/ui/button";
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

type TestBankListProps = {
	testBanks: TestBankSummary[];
};

export function TestBankList({ testBanks }: TestBankListProps) {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Test Banks</h1>
					<p className="text-muted-foreground text-sm">
						Create and manage MCQ question banks for your quizzes. Open a bank
						to use Edit, Preview, and Delete on each question.
					</p>
				</div>
				<Link href="/teacher/test-banks/new">
					<Button>Create test bank</Button>
				</Link>
			</div>

			{testBanks.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>No test banks yet</CardTitle>
						<CardDescription>
							Create your first test bank to start adding MCQ questions.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Link href="/teacher/test-banks/new">
							<Button>Create test bank</Button>
						</Link>
					</CardContent>
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
												href={`/teacher/test-banks/${bank.id}`}
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
