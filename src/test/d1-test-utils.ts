import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type PreparedStatement = {
	bind: (...args: unknown[]) => PreparedStatement;
	run: () => Promise<D1Result>;
	first: <T = unknown>() => Promise<T | null>;
	all: <T = unknown>() => Promise<D1Result<T>>;
};

function normalizeQuery(query: string): string {
	return query.replace(/\?\d+/g, "?");
}

function wrapStatement(stmt: Database.Statement): PreparedStatement {
	let bound: unknown[] = [];

	const prepared: PreparedStatement = {
		bind(...args: unknown[]) {
			bound = args;
			return prepared;
		},
		async run() {
			const result = stmt.run(...bound);
			return {
				success: true,
				meta: {
					changes: result.changes,
					last_row_id: Number(result.lastInsertRowid),
				},
			};
		},
		async first<T>() {
			const row = stmt.get(...bound) as T | undefined;
			return row ?? null;
		},
		async all<T>() {
			const results = stmt.all(...bound) as T[];
			return { results, success: true };
		},
	};

	return prepared;
}

function createSqliteAdapter(sqlite: Database.Database): D1Database {
	return {
		prepare(query: string) {
			return wrapStatement(sqlite.prepare(normalizeQuery(query)));
		},
		async batch(statements) {
			const results = [];
			for (const statement of statements) {
				results.push(await statement.run());
			}
			return results;
		},
		async exec(query: string) {
			sqlite.exec(query);
		},
	} as D1Database;
}

function applyMigration(sqlite: Database.Database, filename: string): void {
	const migrationPath = join(process.cwd(), "migrations", filename);
	sqlite.exec(readFileSync(migrationPath, "utf-8"));
}

export function createTestDatabase(): D1Database {
	const sqlite = new Database(":memory:");
	applyMigration(sqlite, "0001_create_users_and_sessions.sql");
	applyMigration(sqlite, "0002_create_test_bank_tables.sql");
	return createSqliteAdapter(sqlite);
}
