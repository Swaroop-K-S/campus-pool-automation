import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Folder, Settings, LogOut, CornerDownLeft } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../services/api';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);

  // Toggle with Cmd/Ctrl + K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Autofocus input
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Mock search / static routes
  useEffect(() => {
    if (!query) {
      const defaultActions = [
        { type: 'Navigation', title: 'Dashboard', icon: Folder, action: () => navigate('/admin/dashboard') },
        { type: 'Navigation', title: 'Analytics', icon: Folder, action: () => navigate('/admin/analytics') },
        { type: 'Navigation', title: 'Student Watchlist', icon: Folder, action: () => navigate('/admin/students') },
        { type: 'Navigation', title: 'New Placement Drive', icon: Folder, action: () => navigate('/admin/drives/new') },
        { type: 'System', title: 'Settings', icon: Settings, action: () => navigate('/admin/settings') },
        { type: 'System', title: 'Sign Out', icon: LogOut, action: () => logout() }
      ];
      setResults(defaultActions);
      return;
    }

    const searchStr = query.toLowerCase();
    
    // First, search static routes
    let found = [
      { type: 'Navigation', title: 'Dashboard', icon: Folder, action: () => navigate('/admin/dashboard') },
      { type: 'Navigation', title: 'Analytics', icon: Folder, action: () => navigate('/admin/analytics') },
      { type: 'Navigation', title: 'Student Watchlist', icon: Folder, action: () => navigate('/admin/students') },
      { type: 'Navigation', title: 'New Placement Drive', icon: Folder, action: () => navigate('/admin/drives/new') },
      { type: 'System', title: 'Settings', icon: Settings, action: () => navigate('/admin/settings') }
    ].filter(item => item.title.toLowerCase().includes(searchStr));

    // Then, ping backend for Drives (quick naive search)
    api.get('/drives').then((res: any) => {
      if (res.success && res.data) {
        const matchingDrives = res.data
          .filter((d: any) => d.companyName.toLowerCase().includes(searchStr))
          .map((d: any) => ({
            type: 'Placement Drive',
            title: d.companyName,
            subtitle: d.jobRole,
            icon: Folder,
            action: () => navigate(`/admin/drives/${d._id}`)
          }));
        setResults([...found, ...matchingDrives].slice(0, 8)); // Max 8 results
      } else {
        setResults(found);
      }
    }).catch(() => setResults(found));

  }, [query, navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
          setIsOpen(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-all duration-300"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-slate-100">
          <Search className="w-6 h-6 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none px-4 text-lg text-slate-800 placeholder-slate-400 font-medium"
            placeholder="Search drives, students, settings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-500 ml-2">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              No results found for "{query}"
            </div>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={index}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => { item.action(); setIsOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl transition-colors duration-150 ${
                    isSelected ? 'bg-indigo-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-500/50 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div className={`text-xs font-semibold mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  
                  <div className={`text-xs font-bold tracking-wider uppercase ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>
                    {item.type}
                  </div>
                  {isSelected && <CornerDownLeft className="w-4 h-4 text-white/50 ml-2" />}
                </div>
              );
            })
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><kbd className="bg-white border rounded px-1.5 py-0.5 font-sans">↑</kbd> <kbd className="bg-white border rounded px-1.5 py-0.5 font-sans">↓</kbd> to navigate</span>
            <span className="flex items-center gap-1"><kbd className="bg-white border rounded px-1.5 py-0.5 font-sans">↵</kbd> to select</span>
          </div>
          <span>CampusPool Command</span>
        </div>
      </div>
    </div>
  );
}
