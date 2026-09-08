export class DuplicateUserError extends Error {
	constructor(public field: "email" | "mobile") {
		super(`Duplicate ${field}`);
		this.name = "DuplicateUserError";
	}
}
