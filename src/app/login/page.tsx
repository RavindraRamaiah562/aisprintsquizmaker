import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
	return (
		<div className="bg-background flex min-h-screen items-center justify-center p-6">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Log in</CardTitle>
					<CardDescription>
						Use your name, email, or mobile number to sign in.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<LoginForm />
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
