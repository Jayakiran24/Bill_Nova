import { currentUser } from '@/lib/auth';
import { dumpAll } from '@/lib/db';
import { todayISO } from '@/lib/money';

export const dynamic = 'force-dynamic';

/** Owner-only full export: every table as JSON. The database itself lives in Turso. */
export async function GET() {
  const user = await currentUser();
  if (!user) return new Response('Not signed in', { status: 401 });
  if (user.role !== 'owner') return new Response('Owner only', { status: 403 });

  const data = await dumpAll();
  return new Response(JSON.stringify({ exported_at: new Date().toISOString(), tables: data }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="billnova-backup-${todayISO()}.json"`,
    },
  });
}
