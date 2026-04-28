import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

/**
 * Silent SSO callback page.
 * The backend already set the HttpOnly cookies before redirecting here.
 * We just need to call /auth/me to hydrate the Zustand store, then bounce
 * the user to their dashboard — identical to a standard credential login.
 */
export default function AuthSuccessPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    (async () => {
      try {
        const response = (await api.get('/auth/me')) as { success: boolean; data: any };
        if (response.success && response.data) {
          const user = response.data;
          setUser({
            userId: user.userId,
            collegeId: user.collegeId,
            name: user.name,
            email: user.email,
            role: user.role,
          });
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/login?error=sso_failed', { replace: true });
        }
      } catch {
        navigate('/login?error=sso_failed', { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-[#121121] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Completing sign-in…</p>
      </div>
    </div>
  );
}
