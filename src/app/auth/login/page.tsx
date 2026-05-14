import { AuthForm } from '@/components/auth-form';
import { AppLogo } from '@/components/shell';

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; message?: string }> }) {
  return (
    <main className="grid min-h-screen place-items-center bg-romantic-radial px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><AppLogo /></div>
        <AuthForm mode="login" searchParams={searchParams} />
      </div>
    </main>
  );
}
