import { WifiOff } from 'lucide-react';
import { useSocketConnection } from '../../hooks/use-socket';

export const GlobalOfflineBanner = () => {
  const isConnected = useSocketConnection();

  if (isConnected) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top duration-300">
      <WifiOff size={16} className="animate-pulse" />
      <span className="text-sm font-bold tracking-wide">
        SYSTEM OFFLINE: Socket connection lost. Retrying...
      </span>
    </div>
  );
};
