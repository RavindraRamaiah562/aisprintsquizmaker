import Database from "better-sqlite3";
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const LEGACY_DB_PATH = join(
	process.cwd(),
	".wrangler/state/v3/d1/miniflare-D1DatabaseObject/a36f84ea60804f30bb0c7f7cad9f5336a6cca0165abdab8b9241d93dbf0b6006.sqlite",
);

const TABLES_IN_ORDER = [
	"users",
	"sessions",
	"test_banks",
	"questions",
	"question_choices",
];

function sqlString(value) {
	return `'${String(value).replace(/'/g, "''")}'`;
}

function exportInsertStatements(legacyDb) {
	const statements = ["PRAGMA foreign_keys = OFF;"];

	for (const table of TABLES_IN_ORDER) {
		const rows = legacyDb.prepare(`SELECT * FROM ${table}`).all();
		if (rows.length === 0) {
			continue;
		}

		const columns = Object.keys(rows[0]);
		for (const row of rows) {
			const values = columns.map((column) => {
				const value = row[column];
				if (value === null || value === undefined) {
					return "NULL";
				}

				if (typeof value === "number") {
					return String(value);
				}

				return sqlString(value);
			});

			statements.push(
				`INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")});`,
			);
		}
	}

	statements.push("PRAGMA foreign_keys = ON;");
	return statements;
}

function migrateLocalDatabase(statements) {
	const currentDbPath = join(
		process.cwd(),
		".wrangler/state/v3/d1/miniflare-D1DatabaseObject/b0ef4a8bcfcec4ada6b43a5756a79990ee1b026ba7423f9f772f35421583afcf.sqlite",
	);

	if (!existsSync(currentDbPath)) {
		throw new Error(
			`Current local D1 database not found at ${currentDbPath}. Run "npx wrangler d1 migrations apply rndquizmaker-db --local" first.`,
		);
	}

	const db = new Database(currentDbPath);
	db.exec(statements.join("\n"));
	db.close();
}

function migrateRemoteDatabase(statements) {
	const sqlFile = join(tmpdir(), "rndquizmaker-legacy-d1-migration.sql");
	writeFileSync(sqlFile, statements.join("\n"));

	execFileSync(
		"npx",
		["wrangler", "d1", "execute", "rndquizmaker-db", "--remote", "--file", sqlFile, "-y"],
		{
			cwd: process.cwd(),
			stdio: "inherit",
			shell: true,
		},
	);
}

function main() {
	const target = process.argv[2] ?? "local";

	if (!existsSync(LEGACY_DB_PATH)) {
		throw new Error(`Legacy D1 database not found at ${LEGACY_DB_PATH}`);
	}

	const legacyDb = new Database(LEGACY_DB_PATH, { readonly: true });
	const statements = exportInsertStatements(legacyDb);
	legacyDb.close();

	if (target === "local") {
		migrateLocalDatabase(statements);
		console.log("Migrated legacy D1 data into the current local database.");
		return;
	}

	if (target === "remote") {
		migrateRemoteDatabase(statements);
		console.log("Migrated legacy D1 data into the remote database.");
		return;
	}

	throw new Error('Usage: node scripts/migrate-legacy-d1-data.mjs [local|remote]');
}

main();
