import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; reset?: string; email?: string; role?: string }>;
}) {
  if (await currentUser()) redirect('/');
  const { error, created, reset, email, role } = await searchParams;
  return (
    <AuthForm
      mode="login"
      role={role === 'owner' || role === 'staff' ? role : undefined}
      notice={error}
      success={reset ? 'Password updated. Sign in with your new password.' : created ? 'Account created. Please sign in.' : undefined}
      identifier={email}
    />
  );
}
