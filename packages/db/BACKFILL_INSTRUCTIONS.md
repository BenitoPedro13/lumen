# Multi-User Backfill Instructions

After running `pnpm --filter @lumen/db db:migrate`, run the following SQL commands against your Neon database to set up your initial user and backfill existing entries.

Replace the `<token_hash>` value in step 1 with an actual SHA256 hash. You can generate one locally:

```bash
node -e "const c=require('crypto'); const t=c.randomBytes(24).toString('hex'); console.log('Token:', t); console.log('Hash:', c.createHash('sha256').update(t).digest('hex'));"
```

This will output a token and its hash. Keep the token safe — it's your bearer token for API requests.

## SQL Backfill

Run these queries in your Neon SQL editor:

```sql
-- Step 1: Create the user (Benito)
INSERT INTO users (name, token_hash, ntfy_topic, created_at)
VALUES ('Benito', '<token_hash_from_above>', NULL, now())
RETURNING id;

-- Step 2: Copy the user id from the result above, then create the default "Mine" space
-- Assuming the user id is 1 (adjust if needed)
INSERT INTO spaces (name, kind, created_by, invite_code, created_at)
VALUES ('Mine', 'journal', 1, NULL, now())
RETURNING id;

-- Step 3: Add user to their default space
-- Assuming space id is 1 (adjust if needed)
INSERT INTO space_members (space_id, user_id, is_default, joined_at)
VALUES (1, 1, true, now());

-- Step 4: Create the "Legacy" space for backfilled data
INSERT INTO spaces (name, kind, created_by, invite_code, created_at)
VALUES ('Legacy', 'journal', 1, 'legacy-code-12345', now())
RETURNING id;

-- Step 5: Add user to Legacy space
-- Assuming space id is 2 (adjust if needed)
INSERT INTO space_members (space_id, user_id, is_default, joined_at)
VALUES (2, 1, false, now());

-- Step 6: Backfill existing entries to Legacy space
UPDATE entries
SET space_id = 2, created_by = 1, kind = 'log'
WHERE space_id IS NULL;

-- Verify backfill
SELECT COUNT(*) as total_entries, COUNT(space_id) as entries_with_space
FROM entries;
```

## Update .env

After running the backfill, add your generated token to `.env`:

```bash
LUMEN_API_TOKEN=<your_generated_token>
ADMIN_SECRET=<generate_another_random_token>
CRON_SECRET=<generate_another_random_token>
```

You can generate random tokens with:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Done! Your system is now multi-user ready. You can create additional users via:
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name": "Their Name", "ntfyTopic": "optional-ntfy-topic"}'
```
