import "server-only";

import postgres from "postgres";

let client: postgres.Sql | undefined;

export type DatabaseClient = postgres.Sql | postgres.TransactionSql;

export function getDatabase(): postgres.Sql {
  if (client) return client;

  const url = process.env.SUPABASE_DATABASE_URL;
  if (!url) {
    throw new Error("SUPABASE_DATABASE_URL is required");
  }

  // Production must use Supabase's transaction pooler URL. Keeping one
  // connection per serverless instance prevents connection fan-out.
  client = postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return client;
}

export async function closeDatabase(): Promise<void> {
  if (!client) return;
  const current = client;
  client = undefined;
  await current.end();
}
