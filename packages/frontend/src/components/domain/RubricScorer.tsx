import { XCircle } from 'lucide-react';
import type { Evaluation } from '@campuspool/shared';

interface RubricScorerProps {
  rubric: Evaluation['scores'];
  updateScore: (index: number, score: number) => void;
  removeTrait: (index: number) => void;
}

export const RubricScorer = ({ rubric, updateScore, removeTrait }: RubricScorerProps) => {
  return (
    <div className="space-y-4">
      {rubric.map((item, idx) => {
        const percent = (item.score - 1) / 9;
        const hue = percent * 120; // 0 to 120 (Red to Green)

        return (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundColor: `hsl(${hue}, 80%, 50%)` }} />
            <div className="flex justify-between items-center mb-4 relative z-10">
              <span className="font-bold text-slate-800 text-sm tracking-wide">{item.trait}</span>
              <div className="flex items-center gap-3">
                <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 flex items-baseline gap-1">
                  <span className="font-black text-xl" style={{ color: `hsl(${hue}, 70%, 45%)` }}>{item.score}</span>
                  <span className="text-slate-400 text-[10px] font-bold uppercase">/ 10</span>
                </div>
                <button onClick={() => removeTrait(idx)} className="text-slate-300 hover:text-rose-500 transition-colors p-2 -mr-2 bg-slate-50 hover:bg-rose-50 rounded-lg">
                  <XCircle size={16} />
                </button>
              </div>
            </div>

            <div className="relative z-10 pl-2 pr-2 pb-1">
              <input
                type="range" min="1" max="10" value={item.score}
                onChange={(e) => updateScore(idx, parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, hsl(${hue}, 80%, 50%) ${percent * 100}%, #e2e8f0 ${percent * 100}%)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-1">
              <span className={item.score <= 3 ? "text-rose-500" : ""}>Needs Work</span>
              <span className={item.score >= 8 ? "text-emerald-500" : ""}>Exceptional</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
