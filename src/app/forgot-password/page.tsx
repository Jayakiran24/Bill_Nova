import { redirect } from 'next/navigation';
import SimpleAuthForm from '@/components/SimpleAuthForm';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ForgotPage() {
  if (await currentUser()) redirect('/');
  return <SimpleAuthForm mode="forgot" />;
}
