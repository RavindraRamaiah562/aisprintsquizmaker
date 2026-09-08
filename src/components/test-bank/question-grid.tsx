"use client";

import { EyeIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { QuestionForm } from "@/components/test-bank/question-form";
import { QuestionPreviewDialog } from "@/components/test-bank/question-preview-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { QuestionRecord } from "@/lib/test-bank/types";

type QuestionGridProps = {
	bankId: string;
	questions: QuestionRecord[];
	onQuestionsChange: () => void;
};

function QuestionActionsMenu({
	question,
	index,
	deletingQuestionId,
	onEdit,
	onPreview,
	onDelete,
}: {
	question: QuestionRecord;
	index: number;
	deletingQuestionId: string | null;
	onEdit: (question: QuestionRecord) => void;
	onPreview: (question: QuestionRecord) => void;
	onDelete: (question: QuestionRecord) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						size="sm"
						aria-label={`Actions for question ${index + 1}`}
					/>
				}
			>
				<MoreHorizontalIcon className="size-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => onEdit(question)}>
					<PencilIcon />
					Edit
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onPreview(question)}>
					<EyeIcon />
					Preview
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					variant="destructive"
					disabled={deletingQuestionId === question.id}
					onClick={() => onDelete(question)}
				>
					<Trash2Icon />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function QuestionGrid({
	bankId,
	questions,
	onQuestionsChange,
}: QuestionGridProps) {
	const [previewQuestion, setPreviewQuestion] = useState<QuestionRecord | null>(
		null,
	);
	const [editQuestion, setEditQuestion] = useState<QuestionRecord | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(
		null,
	);

	async function handleDeleteQuestion(question: QuestionRecord) {
		if (
			!window.confirm(
				`Delete question "${question.prompt}"? This cannot be undone.`,
			)
		) {
			return;
		}

		setActionError(null);
		setDeletingQuestionId(question.id);

		try {
			const response = await fetch(
				`/api/teacher/test-banks/${bankId}/questions/${question.id}`,
				{ method: "DELETE" },
			);

			if (!response.ok) {
				const data = (await response.json()) as { message?: string };
				setActionError(data.message ?? "Failed to delete question");
				return;
			}

			onQuestionsChange();
		} finally {
			setDeletingQuestionId(null);
		}
	}

	return (
		<>
			{actionError ? (
				<p className="text-destructive text-sm" role="alert">
					{actionError}
				</p>
			) : null}

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-12">#</TableHead>
						<TableHead>Prompt</TableHead>
						<TableHead>Choices</TableHead>
						<TableHead>Correct answer</TableHead>
						<TableHead className="w-24 text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{questions.map((question, index) => {
						const correctChoice = question.choices.find(
							(choice) => choice.isCorrect,
						);

						return (
							<TableRow key={question.id}>
								<TableCell>{index + 1}</TableCell>
								<TableCell className="max-w-md whitespace-normal">
									{question.prompt}
								</TableCell>
								<TableCell>{question.choices.length}</TableCell>
								<TableCell>
									{correctChoice ? (
										<Badge variant="secondary">{correctChoice.choiceText}</Badge>
									) : (
										"—"
									)}
								</TableCell>
								<TableCell className="text-right">
									<QuestionActionsMenu
										question={question}
										index={index}
										deletingQuestionId={deletingQuestionId}
										onEdit={setEditQuestion}
										onPreview={setPreviewQuestion}
										onDelete={handleDeleteQuestion}
									/>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>

			<QuestionPreviewDialog
				question={previewQuestion}
				open={previewQuestion !== null}
				onOpenChange={(open) => {
					if (!open) {
						setPreviewQuestion(null);
					}
				}}
			/>

			<Dialog
				open={editQuestion !== null}
				onOpenChange={(open) => {
					if (!open) {
						setEditQuestion(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Edit question</DialogTitle>
						<DialogDescription>
							Update the prompt and choices for this MCQ.
						</DialogDescription>
					</DialogHeader>

					{editQuestion ? (
						<QuestionForm
							key={editQuestion.id}
							bankId={bankId}
							mode="edit"
							questionId={editQuestion.id}
							initialQuestion={editQuestion}
							onSuccess={() => {
								setEditQuestion(null);
								onQuestionsChange();
							}}
							onCancel={() => setEditQuestion(null)}
						/>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
