import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, ArrowRight, Check, X, Plus, CheckCircle, GraduationCap, BookOpen, Award, GripVertical, Calendar, Clock, MapPin } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

const BRANCH_OPTIONS = ['CSE', 'ISE', 'ECE', 'ME', 'CV', 'EEE', 'MBA', 'MCA'];

const AVAILABLE_ROUNDS = [
  { type: 'ppt', label: 'PPT / Seminar', icon: '🎯', desc: 'Company presentation' },
  { type: 'aptitude', label: 'Aptitude Test', icon: '📝', desc: 'Written/online test' },
  { type: 'coding', label: 'Coding Round', icon: '💻', desc: 'Programming challenge' },
  { type: 'gd', label: 'Group Discussion', icon: '👥', desc: 'Group activity' },
  { type: 'technical_interview', label: 'Technical Interview', icon: '⚙️', desc: 'Tech Q&A with panel' },
  { type: 'hr_interview', label: 'HR Interview', icon: '🤝', desc: 'Final HR round' },
];

const DriveSchema = z.object({
  companyName: z.string().min(1, 'Company Name is required'),
  jobRole: z.string().min(1, 'Job Role/Position is required'),
  ctc: z.string().min(1, 'CTC Package is required')
});

interface SelectedRound {
  id: string;
  type: string;
  label: string;
  icon: string;
  order: number;
  status: string;
  isCustom: boolean;
}

/* ── Sortable Round Item ── */
function SortableRound({ round, onRemove }: { round: SelectedRound; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: round.id });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 mb-2 shadow-sm">
      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{round.order}</div>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex-shrink-0"><GripVertical size={18}/></div>
      <span className="text-lg">{round.icon}</span>
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-800">{round.label}</div>
        {round.isCustom && <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-medium">Custom</span>}
      </div>
      <button type="button" onClick={() => onRemove(round.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X size={15}/></button>
    </div>
  );
}

export default function NewDriveWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [locations, setLocations] = useState<string[]>([]);
  const [locInput, setLocInput] = useState('');

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');  
  const [eligibility, setEligibility] = useState({
    cgpa: 6.5,
    branches: [...BRANCH_OPTIONS],
    tenth: { required: false, minPercentage: 60 },
    twelfth: { required: false, minPercentage: 60 },
    diploma: { required: false, minCGPA: 6.0 }
  });

  const [customBranchInput, setCustomBranchInput] = useState('');
  const [customBranches, setCustomBranches] = useState<string[]>([]);

  const [selectedRounds, setSelectedRounds] = useState<SelectedRound[]>([]);
  const [customRoundInput, setCustomRoundInput] = useState('');

  const [eventSetup, setEventSetup] = useState({
    eventDate: '',
    reportTime: '',
    hallName: '',
    capacity: 100
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { register, formState: { errors }, trigger, getValues } = useForm({
    resolver: zodResolver(DriveSchema),
    defaultValues: { companyName: '', jobRole: '', ctc: '' }
  });

  /* ── Navigation ── */
  const handleNext = async () => {
    if (step === 1) {
      const valid = await trigger();
      if (locations.length === 0) { toast.error("Please add at least one location"); return; }
      if (valid) setStep(2);
    } else if (step === 2) {
      const allBranches = [...eligibility.branches, ...customBranches];
      if (allBranches.length === 0) { toast.error("Select at least one branch"); return; }
      setStep(3);
    } else if (step === 3) {
      if (selectedRounds.length === 0) { toast.error("Select at least one round"); return; }
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  /* ── Location & Tag helpers ── */
  const handleKeyDownLocation = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (locInput.trim() && !locations.includes(locInput.trim())) {
        setLocations([...locations, locInput.trim()]);
        setLocInput('');
      }
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  /* ── Round helpers ── */
  const isRoundSelected = (type: string) => selectedRounds.some(r => r.type === type);

  const addRound = (round: typeof AVAILABLE_ROUNDS[0]) => {
    if (isRoundSelected(round.type)) return;
    setSelectedRounds(prev => [...prev, {
      id: `${round.type}-${Date.now()}`,
      type: round.type,
      label: round.label,
      icon: round.icon,
      order: prev.length + 1,
      status: 'pending',
      isCustom: false
    }]);
  };

  const addCustomRound = () => {
    const label = customRoundInput.trim();
    if (!label) return;
    setSelectedRounds(prev => [...prev, {
      id: `custom-${Date.now()}`,
      type: `custom_${label.toLowerCase().replace(/\s+/g, '_')}`,
      label,
      icon: '⭐',
      order: prev.length + 1,
      status: 'pending',
      isCustom: true
    }]);
    setCustomRoundInput('');
  };

  const removeRound = (id: string) => {
    setSelectedRounds(prev => prev.filter(r => r.id !== id).map((r, i) => ({ ...r, order: i + 1 })));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSelectedRounds(rounds => {
        const oldIndex = rounds.findIndex(r => r.id === active.id);
        const newIndex = rounds.findIndex(r => r.id === over.id);
        return arrayMove(rounds, oldIndex, newIndex).map((r, i) => ({ ...r, order: i + 1 }));
      });
    }
  };

  /* ── Custom Branch helpers ── */
  const addCustomBranch = () => {
    const branch = customBranchInput.trim().toUpperCase();
    if (!branch) return;
    if (BRANCH_OPTIONS.includes(branch) || customBranches.includes(branch)) {
      toast.error(`${branch} already exists`);
      setCustomBranchInput('');
      return;
    }
    setCustomBranches(prev => [...prev, branch]);
    setCustomBranchInput('');
  };

  const removeCustomBranch = (branch: string) => {
    setCustomBranches(prev => prev.filter(b => b !== branch));
  };

  /* ── Submit ── */
  const submitDrive = async () => {
    try {
      const loadingToast = toast.loading('Creating placement drive...');
      const allBranches = [...eligibility.branches, ...customBranches];
      const payload = {
        companyName: getValues('companyName'),
        jobRole: getValues('jobRole'),
        ctc: getValues('ctc'),
        locations: locations.join(', '),
        description: 'New CampusPool Drive',
        eligibilityCriteria: {
          minCgpa: eligibility.cgpa,
          allowedBranches: allBranches,
          tenth: eligibility.tenth,
          twelfth: eligibility.twelfth,
          diploma: eligibility.diploma
        },
        rounds: selectedRounds.map(r => ({
          type: r.type,
          label: r.label,
          order: r.order,
          status: 'pending',
          isCustom: r.isCustom
        })),
        tags,
        eventDate: eventSetup.eventDate || null,
        reportTime: eventSetup.reportTime || null,
        venueDetails: eventSetup.hallName ? {
          hallName: eventSetup.hallName,
          capacity: eventSetup.capacity
        } : null
      };
      const res = await api.post('/drives', payload);
      toast.dismiss(loadingToast);
      if ((res as any).success) {
        toast.success('Drive created successfully!');
        navigate('/admin/dashboard');
      }
    } catch (err) {
      toast.error('Failed to create drive. Please try again.');
    }
  };

  const stepLabels = ['INFO', 'ELIGIBILITY', 'ROUNDS', 'EVENT SETUP', 'CONFIRM'];
  const allBranches = [...eligibility.branches, ...customBranches];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 min-h-screen relative">
      {/* Decorative Glows */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none -z-10"></div>

      {/* Header */}
      <h1 className="text-3xl font-black text-slate-900 mb-10 text-center tracking-tight">Create Placement Drive</h1>

      {/* Visual Progress Stepper */}
      <div className="flex items-center justify-between mb-12 max-w-3xl mx-auto relative px-4 md:px-8">
        {/* Connecting Line Track */}
        <div className="absolute left-[10%] right-[10%] top-6 h-1.5 bg-slate-200/50 -z-10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${((step - 1) / (stepLabels.length - 1)) * 100}%` }}></div>
        </div>
        
        {stepLabels.map((label, i) => {
          const isCompleted = i + 1 < step;
          const isCurrent = i + 1 === step;
          
          return (
            <div key={label} className="flex flex-col items-center relative group z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black mb-3 transition-all duration-500 ease-out ${
                isCompleted 
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-100 ring-offset-2' 
                  : isCurrent 
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-xl shadow-indigo-600/40 scale-110 ring-4 ring-indigo-100' 
                  : 'bg-white text-slate-400 border-2 border-slate-200/80 shadow-sm'
              }`}>
                {isCompleted ? <Check size={20} className="animate-in zoom-in duration-300" strokeWidth={3}/> : i + 1}
              </div>
              <span className={`text-[10px] font-extrabold tracking-widest uppercase transition-colors duration-300 ${
                isCurrent ? 'text-indigo-700 font-black' : isCompleted ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 shadow-[0_8px_40px_rgb(0,0,0,0.04)] p-8 md:p-12 mb-8 relative overflow-hidden">
        
        {/* Subtle inner top glare */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-60"></div>

        {/* ═══ STEP 1 — INFO ═══ */}
        {step === 1 && (
          <form className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500" onSubmit={e => e.preventDefault()}>
            <h2 className="text-2xl font-black text-slate-800 mb-8 tracking-tight">Company Details</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Company Name</label>
                <input {...register('companyName')} placeholder="e.g. Google, Microsoft..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors"/>
                {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Job Role / Position</label>
                <input {...register('jobRole')} placeholder="e.g. Software Engineer, Data Analyst..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors"/>
                {errors.jobRole && <p className="text-red-500 text-xs mt-1">{errors.jobRole.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">CTC Package</label>
                <input {...register('ctc')} placeholder="e.g. 12 LPA, 8-10 LPA..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors"/>
                {errors.ctc && <p className="text-red-500 text-xs mt-1">{errors.ctc.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Job Locations</label>
                <input value={locInput} onChange={e => setLocInput(e.target.value)} onKeyDown={handleKeyDownLocation} placeholder="Type location and press Enter" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors"/>
                <div className="flex flex-wrap gap-2 mt-3">
                  {locations.map(loc => (
                    <span key={loc} className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-bold px-3 py-1.5 rounded-full">
                      {loc}
                      <button type="button" onClick={() => setLocations(locations.filter(l => l !== loc))}><X size={14} className="text-indigo-400 hover:text-indigo-700"/></button>
                    </span>
                  ))}
                  {locations.length === 0 && <span className="text-xs text-slate-400 font-medium">No locations added yet</span>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Drive Tags / Categories</label>
                <div className="p-2 border border-slate-200 rounded-xl bg-white min-h-[50px] flex flex-wrap gap-2 items-center focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50">
                  {tags.map((tag: string) => (
                    <span key={tag} className="bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                      {tag} <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12}/></button>
                    </span>
                  ))}
                  <input 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={tags.length === 0 ? "Type a tag (e.g. Dream, Phase-1) and press Enter" : "Add another tag"}
                    className="flex-1 min-w-[200px] outline-none text-sm px-2 py-1 bg-transparent text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ═══ STEP 2 — ELIGIBILITY ═══ */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Eligibility Criteria</h2>
            <p className="text-slate-500 text-sm mb-8">Set minimum score requirements. Check the boxes to enable each criterion.</p>

            {/* Graduation CGPA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><GraduationCap size={16} className="text-indigo-600"/></div>
                <div><h3 className="font-semibold text-slate-800 text-sm">Graduation CGPA</h3><p className="text-slate-400 text-xs">Current degree / B.E / B.Tech</p></div>
                <span className="ml-auto text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Required</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-500 text-sm w-8">5.0</span>
                <input type="range" min="5" max="10" step="0.1" value={eligibility.cgpa} onChange={e => setEligibility({...eligibility, cgpa: parseFloat(e.target.value)})} className="flex-1 accent-indigo-600 h-2 cursor-pointer"/>
                <span className="text-slate-500 text-sm w-8">10.0</span>
              </div>
              <div className="text-center mt-2"><span className="text-2xl font-bold text-indigo-600">{eligibility.cgpa.toFixed(1)}</span><span className="text-slate-400 text-sm"> / 10.0 minimum</span></div>
            </div>

            {/* 10th Standard */}
            <div className={`bg-white rounded-2xl border-2 transition-all mb-4 ${eligibility.tenth.required ? 'border-indigo-300 shadow-sm shadow-indigo-50' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3 p-5 cursor-pointer" onClick={() => setEligibility({...eligibility, tenth: {...eligibility.tenth, required: !eligibility.tenth.required}})}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${eligibility.tenth.required ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>{eligibility.tenth.required && <Check size={12} className="text-white" strokeWidth={3}/>}</div>
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><BookOpen size={16} className="text-blue-600"/></div>
                  <div><h3 className="font-semibold text-slate-800 text-sm">10th Standard</h3><p className="text-slate-400 text-xs">SSC / Matriculation percentage</p></div>
                </div>
                {eligibility.tenth.required && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Enabled</span>}
              </div>
              {eligibility.tenth.required && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <label className="text-sm font-medium text-slate-700 block mb-3">Minimum Percentage Required</label>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 text-sm w-6">0%</span>
                    <input type="range" min="0" max="100" step="1" value={eligibility.tenth.minPercentage} onChange={e => setEligibility({...eligibility, tenth: {...eligibility.tenth, minPercentage: parseInt(e.target.value)}})} className="flex-1 accent-blue-600 h-2 cursor-pointer"/>
                    <span className="text-slate-500 text-sm w-10">100%</span>
                  </div>
                  <div className="text-center mt-2"><span className="text-2xl font-bold text-blue-600">{eligibility.tenth.minPercentage}%</span><span className="text-slate-400 text-sm"> minimum</span></div>
                  <div className="mt-3 flex items-center gap-3"><div className="flex-1 h-px bg-slate-200"/><span className="text-xs text-slate-400">or type directly</span><div className="flex-1 h-px bg-slate-200"/></div>
                  <div className="mt-3 relative">
                    <input type="number" min="0" max="100" value={eligibility.tenth.minPercentage} onChange={e => setEligibility({...eligibility, tenth: {...eligibility.tenth, minPercentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))}})} className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-slate-800 bg-white text-sm font-medium focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"/>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">%</span>
                  </div>
                </div>
              )}
            </div>

            {/* 12th Standard */}
            <div className={`bg-white rounded-2xl border-2 transition-all mb-4 ${eligibility.twelfth.required ? 'border-indigo-300 shadow-sm shadow-indigo-50' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3 p-5 cursor-pointer" onClick={() => setEligibility({...eligibility, twelfth: {...eligibility.twelfth, required: !eligibility.twelfth.required}})}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${eligibility.twelfth.required ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>{eligibility.twelfth.required && <Check size={12} className="text-white" strokeWidth={3}/>}</div>
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><BookOpen size={16} className="text-purple-600"/></div>
                  <div><h3 className="font-semibold text-slate-800 text-sm">12th Standard</h3><p className="text-slate-400 text-xs">HSC / PUC / Intermediate percentage</p></div>
                </div>
                {eligibility.twelfth.required && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">Enabled</span>}
              </div>
              {eligibility.twelfth.required && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <label className="text-sm font-medium text-slate-700 block mb-3">Minimum Percentage Required</label>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 text-sm w-6">0%</span>
                    <input type="range" min="0" max="100" step="1" value={eligibility.twelfth.minPercentage} onChange={e => setEligibility({...eligibility, twelfth: {...eligibility.twelfth, minPercentage: parseInt(e.target.value)}})} className="flex-1 accent-purple-600 h-2 cursor-pointer"/>
                    <span className="text-slate-500 text-sm w-10">100%</span>
                  </div>
                  <div className="text-center mt-2"><span className="text-2xl font-bold text-purple-600">{eligibility.twelfth.minPercentage}%</span><span className="text-slate-400 text-sm"> minimum</span></div>
                  <div className="mt-3 flex items-center gap-3"><div className="flex-1 h-px bg-slate-200"/><span className="text-xs text-slate-400">or type directly</span><div className="flex-1 h-px bg-slate-200"/></div>
                  <div className="mt-3 relative">
                    <input type="number" min="0" max="100" value={eligibility.twelfth.minPercentage} onChange={e => setEligibility({...eligibility, twelfth: {...eligibility.twelfth, minPercentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))}})} className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-slate-800 bg-white text-sm font-medium focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50"/>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Diploma */}
            <div className={`bg-white rounded-2xl border-2 transition-all mb-6 ${eligibility.diploma.required ? 'border-indigo-300 shadow-sm shadow-indigo-50' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3 p-5 cursor-pointer" onClick={() => setEligibility({...eligibility, diploma: {...eligibility.diploma, required: !eligibility.diploma.required}})}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${eligibility.diploma.required ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>{eligibility.diploma.required && <Check size={12} className="text-white" strokeWidth={3}/>}</div>
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center"><Award size={16} className="text-amber-600"/></div>
                  <div><h3 className="font-semibold text-slate-800 text-sm">Diploma</h3><p className="text-slate-400 text-xs">Polytechnic / Diploma CGPA (for lateral entry students)</p></div>
                </div>
                {eligibility.diploma.required && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">Enabled</span>}
              </div>
              {eligibility.diploma.required && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <label className="text-sm font-medium text-slate-700 block mb-3">Minimum CGPA Required</label>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 text-sm w-6">0</span>
                    <input type="range" min="0" max="10" step="0.1" value={eligibility.diploma.minCGPA} onChange={e => setEligibility({...eligibility, diploma: {...eligibility.diploma, minCGPA: parseFloat(e.target.value)}})} className="flex-1 accent-amber-500 h-2 cursor-pointer"/>
                    <span className="text-slate-500 text-sm w-8">10.0</span>
                  </div>
                  <div className="text-center mt-2"><span className="text-2xl font-bold text-amber-600">{eligibility.diploma.minCGPA.toFixed(1)}</span><span className="text-slate-400 text-sm"> / 10.0 minimum</span></div>
                  <div className="mt-3 flex items-center gap-3"><div className="flex-1 h-px bg-slate-200"/><span className="text-xs text-slate-400">or type directly</span><div className="flex-1 h-px bg-slate-200"/></div>
                  <div className="mt-3 relative">
                    <input type="number" min="0" max="10" step="0.1" value={eligibility.diploma.minCGPA} onChange={e => setEligibility({...eligibility, diploma: {...eligibility.diploma, minCGPA: Math.min(10, Math.max(0, parseFloat(e.target.value) || 0))}})} className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-16 text-slate-800 bg-white text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-50"/>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">CGPA</span>
                  </div>
                </div>
              )}
            </div>

            {/* Eligible Branches */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-bold text-slate-700">Eligible Branches</label>
                <button onClick={() => setEligibility({...eligibility, branches: eligibility.branches.length === BRANCH_OPTIONS.length ? [] : [...BRANCH_OPTIONS]})} className="text-indigo-600 text-sm font-bold hover:underline">
                  {eligibility.branches.length === BRANCH_OPTIONS.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {BRANCH_OPTIONS.map(branch => {
                  const isSelected = eligibility.branches.includes(branch);
                  return (
                    <div key={branch} onClick={() => setEligibility({ ...eligibility, branches: isSelected ? eligibility.branches.filter(b => b !== branch) : [...eligibility.branches, branch] })}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between font-bold ${isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {branch}
                      {isSelected && <CheckCircle size={18} className="text-indigo-600" />}
                    </div>
                  )
                })}
              </div>

              {/* Custom Branches */}
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Add Other Branch</p>
                <div className="flex gap-2">
                  <input value={customBranchInput} onChange={e => setCustomBranchInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter' && customBranchInput.trim()) { e.preventDefault(); addCustomBranch(); } }}
                    placeholder="Type branch name e.g. AIML, DS..." maxLength={20}
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 uppercase"/>
                  <button type="button" onClick={addCustomBranch} disabled={!customBranchInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">Add</button>
                </div>
                {customBranches.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {customBranches.map(branch => (
                      <div key={branch} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full">
                        {branch}
                        <button type="button" onClick={() => removeCustomBranch(branch)} className="text-indigo-400 hover:text-indigo-700 ml-0.5"><X size={13}/></button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">Press Enter or click Add. Custom branches will be included alongside the selected ones above.</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 3 — ROUNDS (DnD) ═══ */}
        {step === 3 && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Select Rounds</h2>
            <p className="text-slate-500 mb-8 font-medium">Choose rounds and drag to set the order.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT — Available Rounds */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700">Available Rounds</h3>
                  <span className="text-xs text-slate-400">Click to add →</span>
                </div>
                <div className="space-y-0">
                  {AVAILABLE_ROUNDS.map(round => (
                    <div key={round.type} onClick={() => addRound(round)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all mb-2 ${
                        isRoundSelected(round.type) ? 'border-indigo-200 bg-indigo-50 opacity-50 cursor-not-allowed' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                      }`}>
                      <span className="text-xl">{round.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-800">{round.label}</div>
                        <div className="text-xs text-slate-400">{round.desc}</div>
                      </div>
                      {isRoundSelected(round.type) ? <Check size={16} className="text-indigo-400"/> : <Plus size={16} className="text-slate-400"/>}
                    </div>
                  ))}
                </div>

                {/* Custom Round Input */}
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Add Custom Round</p>
                  <div className="flex gap-2">
                    <input value={customRoundInput} onChange={e => setCustomRoundInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomRound(); } }}
                      placeholder="e.g. Case Study, Assignment..."
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-indigo-400"/>
                    <button type="button" onClick={addCustomRound} disabled={!customRoundInput.trim()}
                      className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-indigo-700">Add</button>
                  </div>
                </div>
              </div>

              {/* RIGHT — Selected Rounds (Sortable) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700">Drive Rounds</h3>
                  <span className="text-xs text-slate-400">Drag to set order ↕</span>
                </div>

                {selectedRounds.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="text-slate-400 text-sm">Click rounds on the left to add them</p>
                    <p className="text-slate-300 text-xs mt-1">Drag to set the order</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={selectedRounds.map(r => r.id)} strategy={verticalListSortingStrategy}>
                      {selectedRounds.map(round => (
                        <SortableRound key={round.id} round={round} onRemove={removeRound}/>
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 4 — EVENT SETUP ═══ */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Event Setup</h2>
            <p className="text-slate-500 mb-8 font-medium">Set the initial event date, report time, and primary seminar/test hall configuration.</p>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Event Date (Optional)</label>
                  <div className="relative">
                    <input type="date" value={eventSetup.eventDate} onChange={e => setEventSetup({...eventSetup, eventDate: e.target.value})} className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50" />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Reporting Time (Optional)</label>
                  <div className="relative">
                    <input type="time" value={eventSetup.reportTime} onChange={e => setEventSetup({...eventSetup, reportTime: e.target.value})} className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50" />
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Primary Hall Name (Optional)</label>
                <div className="relative">
                  <input type="text" placeholder="e.g. Main Auditorium" value={eventSetup.hallName} onChange={e => setEventSetup({...eventSetup, hallName: e.target.value})} className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50" />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Hall Seating Capacity</label>
                <input type="number" min="10" placeholder="e.g. 500" value={eventSetup.capacity || ''} onChange={e => setEventSetup({...eventSetup, capacity: parseInt(e.target.value) || 0})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50" />
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 5 — CONFIRM ═══ */}
        {step === 5 && (
          <div className="max-w-2xl mx-auto animate-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-black text-slate-800">Confirm Drive Details</h2>
              <p className="text-slate-500 font-medium mt-1">Please review everything before finalizing.</p>
            </div>

            <div className="space-y-4">
              {/* Company Details */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Company Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-xs font-bold text-slate-400 uppercase">Company</span><p className="font-bold text-slate-800 text-lg">{getValues('companyName')}</p></div>
                  <div><span className="text-xs font-bold text-slate-400 uppercase">Role</span><p className="font-bold text-slate-800 text-lg">{getValues('jobRole')}</p></div>
                  <div><span className="text-xs font-bold text-slate-400 uppercase">CTC</span><p className="font-bold text-slate-800 text-lg">{getValues('ctc')} LPA</p></div>
                  <div className="col-span-2 mt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase mb-1 block">Locations</span>
                    <div className="flex gap-2 flex-wrap">{locations.map(l => <span key={l} className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-sm font-bold text-slate-700">{l}</span>)}</div>
                  </div>
                </div>
              </div>

              {/* Eligibility */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Eligibility</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Min CGPA</span><span className="font-medium text-slate-800">{eligibility.cgpa.toFixed(1)} / 10.0</span></div>
                  {eligibility.tenth.required && <div className="flex justify-between text-sm"><span className="text-slate-500 flex items-center gap-1"><Check size={12} className="text-green-500"/>10th Percentage</span><span className="font-medium text-slate-800">≥ {eligibility.tenth.minPercentage}%</span></div>}
                  {eligibility.twelfth.required && <div className="flex justify-between text-sm"><span className="text-slate-500 flex items-center gap-1"><Check size={12} className="text-green-500"/>12th Percentage</span><span className="font-medium text-slate-800">≥ {eligibility.twelfth.minPercentage}%</span></div>}
                  {eligibility.diploma.required && <div className="flex justify-between text-sm"><span className="text-slate-500 flex items-center gap-1"><Check size={12} className="text-green-500"/>Diploma CGPA</span><span className="font-medium text-slate-800">≥ {eligibility.diploma.minCGPA.toFixed(1)}</span></div>}
                  {!eligibility.tenth.required && !eligibility.twelfth.required && !eligibility.diploma.required && <div className="text-xs text-slate-400 italic">No 10th/12th/Diploma requirement set</div>}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-400 uppercase mb-1 block">Branches</span>
                    <div className="flex gap-1 flex-wrap">{allBranches.map(b => <span key={b} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{b}</span>)}</div>
                  </div>
                </div>
              </div>

              {/* Selected Rounds */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Selected Rounds</h3>
                <div className="space-y-2">
                  {selectedRounds.map(r => (
                    <div key={r.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">{r.order}</span>
                      <span className="text-lg">{r.icon}</span>
                      <span className="font-bold text-slate-700 flex-1">{r.label}</span>
                      {r.isCustom && <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-medium">Custom</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Details */}
              {(eventSetup.eventDate || eventSetup.hallName) && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Event Setup</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {eventSetup.eventDate && <div><span className="text-xs font-bold text-slate-400 uppercase">Date & Time</span><p className="font-bold text-slate-800 text-lg">{eventSetup.eventDate} <span className="text-sm font-medium text-slate-500">{eventSetup.reportTime}</span></p></div>}
                    {eventSetup.hallName && <div><span className="text-xs font-bold text-slate-400 uppercase">Primary Hall</span><p className="font-bold text-slate-800 text-lg">{eventSetup.hallName} <span className="text-sm font-medium text-slate-500">({eventSetup.capacity} seats)</span></p></div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center mt-2 px-2 max-w-3xl mx-auto relative z-10">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="px-6 py-3.5 rounded-xl font-bold text-slate-600 bg-white/80 backdrop-blur-sm border-2 border-slate-200/60 hover:bg-white hover:border-slate-300 shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center gap-2 group">
            <ArrowLeft size={18} strokeWidth={3} className="text-slate-400 group-hover:text-slate-600 group-hover:-translate-x-1 transition-all"/> Back
          </button>
        ) : <div aria-hidden="true"></div>}
        
        {step < 5 ? (
          <button onClick={handleNext} className="px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-95 hover:-translate-y-0.5 transition-all flex items-center gap-2 group">
            Next Step <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform"/>
          </button>
        ) : (
          <button onClick={submitDrive} className="px-8 py-3.5 rounded-xl font-bold text-white bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/40 active:scale-95 hover:-translate-y-0.5 transition-all flex items-center gap-2 group">
            <Check size={18} strokeWidth={3} className="group-hover:scale-110 transition-transform"/> Create Placement Drive
          </button>
        )}
      </div>
    </div>
  );
}
