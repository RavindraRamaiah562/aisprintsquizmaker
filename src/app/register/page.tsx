import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
	return (
		<div className="bg-background flex min-h-screen items-center justify-center p-6">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Create your account</CardTitle>
					<CardDescription>
						Register as a teacher or student to use the quiz platform.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<RegisterForm />
					<p className="text-muted-foreground mt-4 text-center text-sm">
						<Link href="/" className="hover:underline">
							Back to home
						</Link>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
