import { useState } from 'react';
import { signIn, signUp } from '@/server/functions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { UpvoteLogo } from '@/components/brand/UpvoteLogo';

interface AuthPageProps {
  onSuccess?: () => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await signIn({ data: { email, password } });
      } else {
        await signUp({ data: { email, password, name } });
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <UpvoteLogo size="lg" variant="light" />
          <div>
            <h1 className="text-xl font-bold leading-[0.96] tracking-[-0.02em] text-foreground sm:text-2xl">
              {isLogin ? 'Sign in to Upvote' : 'Create your account'}
            </h1>
            <p className="mt-2 text-sm leading-[1.5] text-muted-foreground">
              {isLogin ? 'Vote on features and submit ideas' : 'Join your team on Upvote'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isLogin}
              className="h-11 rounded-[8px] sm:h-9"
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 rounded-[8px] sm:h-9"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-11 rounded-[8px] sm:h-9"
          />
          <Button
            type="submit"
            className="w-full bg-foreground text-background font-semibold hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : isLogin ? 'Sign in' : 'Sign up'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-[oklch(0.45_0.12_290)] hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
