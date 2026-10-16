import { redirect } from 'next/navigation';
import SimpleAuthForm from '@/components/SimpleAuthForm';
import { currentChallenge } from '@/lib/otp';

export const dynamic = 'force-dynamic';

export default async function ResetPage() {
  const c = await currentChallenge();
  if (!c || c.purpose !== 'reset' || !c.verified_at) redirect('/forgot-password');
  return <SimpleAuthForm mode="reset" />;
}
