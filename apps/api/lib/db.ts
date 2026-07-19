import { createDb } from "@lumen/db";

export const db = createDb(process.env.DATABASE_URL!);
