import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; role?: string }>;
}) {
  if (await currentUser()) redirect('/');
  const { error, role } = await searchParams;
  return (
    <AuthForm
      mode="signup"
      role={role === 'owner' || role === 'staff' ? role : undefined}
      notice={error}
    />
  );
}
