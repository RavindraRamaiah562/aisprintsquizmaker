import { LogoutButton } from "@/components/auth/logout-button";
import { requireRole } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = await requireRole("teacher");

	return (
		<div className="bg-background min-h-screen">
			<header className="border-b">
				<div className="mx-auto flex max-w-5xl items-center justify-between p-4">
					<div>
						<p className="text-sm font-medium">Teacher dashboard</p>
						<p className="text-muted-foreground text-sm">{user.name}</p>
					</div>
					<LogoutButton />
				</div>
			</header>
			<main className="mx-auto max-w-5xl p-6">{children}</main>
		</div>
	);
}
