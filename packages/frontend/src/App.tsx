import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from './router';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: '#1e293b',
            padding: '16px 20px',
            borderRadius: '16px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02)',
            fontWeight: '600',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#14b8a6', secondary: '#fff' },
            style: { borderLeft: '4px solid #14b8a6' }
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#fff' },
            style: { borderLeft: '4px solid #f43f5e' }
          },
          loading: {
            style: { borderLeft: '4px solid #6366f1' }
          }
        }}
      />
    </>
  );
}
