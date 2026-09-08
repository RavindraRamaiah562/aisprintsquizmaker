"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	async function handleLogout() {
		setIsLoading(true);

		try {
			const response = await fetch("/api/auth/logout", { method: "POST" });

			if (response.ok) {
				router.push("/login");
				router.refresh();
			}
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Button
			type="button"
			variant="outline"
			onClick={handleLogout}
			disabled={isLoading}
		>
			{isLoading ? "Logging out..." : "Log out"}
		</Button>
	);
}
