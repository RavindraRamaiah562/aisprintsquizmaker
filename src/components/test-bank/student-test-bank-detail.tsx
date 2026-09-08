import Link from "next/link";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { StudentTestBankDetail } from "@/lib/test-bank/types";

type StudentTestBankDetailViewProps = {
	testBank: StudentTestBankDetail;
};

export function StudentTestBankDetailView({
	testBank,
}: StudentTestBankDetailViewProps) {
	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<Link
					href="/student/test-banks"
					className="text-muted-foreground text-sm hover:underline"
				>
					Back to question banks
				</Link>
				<h1 className="text-2xl font-semibold">{testBank.title}</h1>
				{testBank.description ? (
					<p className="text-muted-foreground">{testBank.description}</p>
				) : null}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Questions</CardTitle>
					<CardDescription>
						{testBank.questions.length === 0
							? "This question bank does not have any questions yet."
							: `${testBank.questions.length} question${testBank.questions.length === 1 ? "" : "s"} in this bank`}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{testBank.questions.map((question, index) => (
						<div
							key={question.id}
							className="space-y-3 rounded-lg border p-4"
						>
							<p className="font-medium">
								{index + 1}. {question.prompt}
							</p>
							<div className="space-y-2">
								{question.choices.map((choice) => (
									<label
										key={choice.id}
										className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
									>
										<input
											type="radio"
											disabled
											name={`question-${question.id}`}
										/>
										<span>{choice.choiceText}</span>
									</label>
								))}
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
