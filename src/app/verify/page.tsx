import { redirect } from 'next/navigation';
import OtpForm from '@/components/OtpForm';
import { currentUser } from '@/lib/auth';
import { currentChallenge } from '@/lib/otp';

export const dynamic = 'force-dynamic';

export default async function VerifyPage() {
  if (await currentUser()) redirect('/');
  const c = await currentChallenge();
  if (!c) redirect('/login?error=' + encodeURIComponent('Your verification expired. Please start again.'));
  if (c.purpose === 'reset' && c.verified_at) redirect('/reset-password');
  return <OtpForm email={c.email} purpose={c.purpose} />;
}
