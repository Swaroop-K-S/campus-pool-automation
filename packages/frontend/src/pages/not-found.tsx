import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-8xl font-black text-slate-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Page not found</h1>
        <p className="text-slate-500 mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <button onClick={() => navigate('/admin/dashboard')}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-colors">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
