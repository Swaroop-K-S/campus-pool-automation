import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search, Check } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
}

export function MultiSelect({ options, selected, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()) && !selected.includes(o));
  const toggle = (item: string) => onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);

  return (
    <div ref={ref} className={`relative ${open ? 'z-50' : ''}`}>
      {/* Selected tags */}
      <div
        className="min-h-[42px] w-full bg-background border border-border rounded-lg px-3 py-2 flex flex-wrap gap-1.5 cursor-pointer focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all"
        onClick={() => setOpen(true)}
      >
        {selected.map(item => (
          <span
            key={item}
            className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-md"
          >
            {item}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); toggle(item); }}
              className="hover:text-destructive transition-colors"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {selected.length === 0 && (
          <span className="text-muted-foreground text-sm self-center">{placeholder}</span>
        )}
        <ChevronDown size={15} className={`ml-auto self-center text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5">
              <Search size={14} className="text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search..."
                className="flex-1 text-sm outline-none bg-transparent text-foreground"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No results</p>
            ) : (
              filtered.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { toggle(item); setQuery(''); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-primary/5 hover:text-primary flex items-center justify-between transition-colors"
                >
                  {item}
                  {selected.includes(item) && <Check size={14} className="text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
