import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { currentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { todayISO } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response('Not signed in', { status: 401 });
  if (user.role !== 'owner') return new Response('Owner only', { status: 403 });

  // Fold the write-ahead log back into the main file so the copy is complete.
  try {
    getDb().exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {
    /* checkpoint is best-effort */
  }

  const dir = process.env.BILLNOVA_DATA_DIR || path.join(process.cwd(), 'data');
  const file = path.join(dir, 'billnova.db');
  if (!existsSync(file)) return new Response('No database yet', { status: 404 });

  const buf = readFileSync(file);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="billnova-backup-${todayISO()}.db"`,
    },
  });
}
