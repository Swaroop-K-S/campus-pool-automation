import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Eye, EyeOff } from 'lucide-react';

const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

type LoginFormData = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const [showPassword, setShowPassword] = useState(false);

  // Show error toast if redirected back from a failed Google SSO attempt
  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'unauthorized') toast.error('Google account is not authorized as an admin.');
    if (err === 'sso_failed') toast.error('Google sign-in failed. Please try again.');
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = (await api.post('/auth/login', data)) as {
        success: boolean;
        data: { accessToken: string; refreshToken: string; user: any };
      };

      if (response.success && response.data) {
        const { user } = response.data;

        setUser({
          userId: user.userId,
          collegeId: user.collegeId,
          name: user.name,
          email: user.email,
          role: user.role,
        });

        toast.success('Login successful');
        // Route HR users to their dedicated portal
        if (user.role === 'company_hr') {
          navigate('/hr');
        } else {
          navigate('/admin/dashboard');
        }
      }
    } catch (err: unknown) {
      const ae = err as { error?: string };
      toast.error(ae.error || 'Login failed. Please verify credentials.');
    }
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#121121] min-h-screen flex flex-col font-sans">
      <header className="w-full flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4 lg:px-20">
        <div className="flex items-center gap-2 text-primary">
          <div className="w-8 h-8 flex items-center justify-center bg-primary rounded-lg text-white">
            <span className="material-symbols-outlined">school</span>
          </div>
          <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight">
            CampusPool
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-slate-500 dark:text-slate-400 text-sm">
            Need help?
          </span>
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
            Support
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-40">
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]"></div>
        </div>

        <div className="w-full max-w-[450px] bg-white dark:bg-slate-900 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-8 md:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary mb-4">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4F46E5"
                strokeWidth="2"
              >
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Welcome Back
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
              Sign in to your CampusPool admin account
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                htmlFor="email"
              >
                Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  mail
                </span>
                <input
                  {...register('email')}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  id="email"
                  placeholder="admin@campuspool.in"
                  type="email"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                  htmlFor="password"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  lock
                </span>
                <input
                  {...register('password')}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-50"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-4 w-4"
                id="remember"
                type="checkbox"
              />
              <label className="text-sm text-slate-600 dark:text-slate-400" htmlFor="remember">
                Remember this device
              </label>
            </div>

            <button
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 mt-2"
              type="submit"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* ── Google SSO ─────────────────────────────────────────────────── */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white dark:bg-slate-900 text-slate-400 text-xs font-medium uppercase tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
                window.location.href = `${apiBase.replace('/api/v1', '')}/api/v1/auth/google`;
              }}
              className="mt-4 w-full flex justify-center items-center gap-3 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-sm transition-all duration-200 hover:shadow-md group"
            >
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 px-6 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          © 2024 CampusPool Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
