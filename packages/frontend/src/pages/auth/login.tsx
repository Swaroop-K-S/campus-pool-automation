import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { jwtDecode } from 'jwt-decode';

const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required")
});

type LoginFormData = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await api.post('/auth/login', data) as { success: boolean, data: { accessToken: string, refreshToken: string, user: any } };
      
      if (response.success && response.data) {
        const { accessToken, refreshToken, user } = response.data;
        const decoded = jwtDecode<{ userId: string, collegeId: string, email: string }>(accessToken);
        
        setAuth({
          userId: decoded.userId,
          collegeId: decoded.collegeId,
          name: user?.name,
          email: decoded.email
        }, accessToken, refreshToken);
        
        toast.success("Login successful");
        navigate('/admin/dashboard');
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
          <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight">CampusPool</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-slate-500 dark:text-slate-400 text-sm">Need help?</span>
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
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Welcome Back</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center">Sign in to your CampusPool admin account</p>
          </div>
          
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
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
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock</span>
                <input 
                  {...register('password')}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                  id="password" 
                  placeholder="••••••••" 
                  type="password"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" type="button">
                  <span className="material-symbols-outlined text-xl">visibility</span>
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            
            <div className="flex items-center gap-2">
              <input className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-4 w-4" id="remember" type="checkbox" />
              <label className="text-sm text-slate-600 dark:text-slate-400" htmlFor="remember">Remember this device</label>
            </div>
            
            <button 
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 mt-2" 
              type="submit"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
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
