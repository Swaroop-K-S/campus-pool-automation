import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, ArrowRight, Check, X, FileText, Monitor, Users, CheckCircle, GraduationCap, BookOpen, Award } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

const BRANCH_OPTIONS = ['CSE', 'ISE', 'ECE', 'ME', 'CV', 'EEE', 'MBA', 'MCA'];

const ROUND_OPTIONS = [
  { id: 'ppt', label: 'PPT/Seminar', icon: <Monitor size={20}/> },
  { id: 'aptitude', label: 'Aptitude Test', icon: <FileText size={20}/> },
  { id: 'coding', label: 'Coding Round', icon: <Monitor size={20}/> },
  { id: 'gd', label: 'Group Discussion', icon: <Users size={20}/> },
  { id: 'technical', label: 'Technical Interview', icon: <Monitor size={20}/> },
  { id: 'hr', label: 'HR Interview', icon: <Users size={20}/> }
];

const DriveSchema = z.object({
  companyName: z.string().min(1, 'Company Name is required'),
  jobRole: z.string().min(1, 'Job Role/Position is required'),
  ctc: z.string().min(1, 'CTC Package is required')
});

export default function NewDriveWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [locations, setLocations] = useState<string[]>([]);
  const [locInput, setLocInput] = useState('');
  
  const [eligibility, setEligibility] = useState({
    cgpa: 6.5,
    branches: [...BRANCH_OPTIONS],
    tenth: { required: false, minPercentage: 60 },
    twelfth: { required: false, minPercentage: 60 },
    diploma: { required: false, minCGPA: 6.0 }
  });
  const [selectedRounds, setSelectedRounds] = useState<string[]>([]);

  const { register, formState: { errors }, trigger, getValues } = useForm({
    resolver: zodResolver(DriveSchema),
    defaultValues: { companyName: '', jobRole: '', ctc: '' }
  });

  const handleNext = async () => {
    if (step === 1) {
      const valid = await trigger();
      if (locations.length === 0) { toast.error("Please add at least one location"); return; }
      if (valid) setStep(2);
    } else if (step === 2) {
      if (eligibility.branches.length === 0) { toast.error("Select at least one branch"); return; }
      setStep(3);
    } else if (step === 3) {
      if (selectedRounds.length === 0) { toast.error("Select at least one round"); return; }
      setStep(4);
    }
  };

  const handleKeyDownLocation = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (locInput.trim() && !locations.includes(locInput.trim())) {
        setLocations([...locations, locInput.trim()]);
        setLocInput('');
      }
    }
  };

  const toggleRound = (id: string) => {
    setSelectedRounds(prev => {
      if (prev.includes(id)) return prev.filter(r => r !== id);
      const updated = [...prev, id];
      // ensure ppt is always first if exists
      if (updated.includes('ppt')) {
         return ['ppt', ...updated.filter(r => r !== 'ppt')];
      }
      return updated;
    });
  };

  const submitDrive = async () => {
    try {
      const loadingToast = toast.loading('Creating placement drive...');
      const payload = {
        companyName: getValues('companyName'),
        jobRole: getValues('jobRole'),
        ctc: getValues('ctc'),
        locations: locations.join(', '),
        description: 'New CampusPool Drive',
        eligibilityCriteria: {
          minCgpa: eligibility.cgpa,
          allowedBranches: eligibility.branches,
          tenth: eligibility.tenth,
          twelfth: eligibility.twelfth,
          diploma: eligibility.diploma
        },
        rounds: selectedRounds.map(r => ({ type: r, name: r }))
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

  return (
    <div className="max-w-4xl mx-auto py-4">
      
      {/* ProgressBar */}
      <div className="mb-10 w-full relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2 rounded-full"></div>
        <div 
          className="absolute top-1/2 left-0 h-1 bg-indigo-600 -z-10 -translate-y-1/2 transition-all duration-300 rounded-full" 
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        ></div>
        
        <div className="flex justify-between">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white transition-colors duration-300 shadow-sm ${
                step > i ? 'bg-indigo-600 text-white' : step === i ? 'bg-white border-indigo-600 text-indigo-600' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > i ? <Check size={18} strokeWidth={3} /> : i}
              </div>
              <span className={`text-xs mt-2 font-bold uppercase tracking-wider ${
                step >= i ? 'text-indigo-600' : 'text-slate-400'
              }`}>
                {i === 1 ? 'Info' : i === 2 ? 'Eligibility' : i === 3 ? 'Rounds' : 'Confirm'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[400px]">
        {step === 1 && (
          <form className="max-w-2xl mx-auto animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Company Information</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Company Name *</label>
                <input {...register('companyName')} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors" placeholder="e.g. Google, Amazon" />
                {errors.companyName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.companyName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Job Role / Position *</label>
                <input {...register('jobRole')} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors" placeholder="e.g. SDE-1" />
                {errors.jobRole && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.jobRole.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">CTC Package *</label>
                <input {...register('ctc')} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors" placeholder="8.5 LPA" />
                {errors.ctc && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.ctc.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Job Locations * (Press Enter to add)</label>
                <input 
                  value={locInput} 
                  onChange={e => setLocInput(e.target.value)} 
                  onKeyDown={handleKeyDownLocation}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors" 
                  placeholder="e.g. Bangalore, Hyderabad" 
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {locations.map(loc => (
                    <span key={loc} className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 border border-indigo-200">
                      {loc} <X size={14} className="cursor-pointer hover:bg-indigo-200 rounded-full" onClick={() => setLocations(locations.filter(l => l !== loc))} />
                    </span>
                  ))}
                  {locations.length === 0 && <span className="text-xs text-slate-400 font-medium">No locations added yet</span>}
                </div>
              </div>
            </div>
          </form>
        )}

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
              <div className="text-center mt-2">
                <span className="text-2xl font-bold text-indigo-600">{eligibility.cgpa.toFixed(1)}</span>
                <span className="text-slate-400 text-sm"> / 10.0 minimum</span>
              </div>
            </div>

            {/* 10th Standard */}
            <div className={`bg-white rounded-2xl border-2 transition-all mb-4 ${eligibility.tenth.required ? 'border-indigo-300 shadow-sm shadow-indigo-50' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3 p-5 cursor-pointer" onClick={() => setEligibility({...eligibility, tenth: {...eligibility.tenth, required: !eligibility.tenth.required}})}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${eligibility.tenth.required ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                  {eligibility.tenth.required && <Check size={12} className="text-white" strokeWidth={3}/>}
                </div>
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
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${eligibility.twelfth.required ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                  {eligibility.twelfth.required && <Check size={12} className="text-white" strokeWidth={3}/>}
                </div>
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
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${eligibility.diploma.required ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                  {eligibility.diploma.required && <Check size={12} className="text-white" strokeWidth={3}/>}
                </div>
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
                <button 
                  onClick={() => setEligibility({...eligibility, branches: eligibility.branches.length === 8 ? [] : [...BRANCH_OPTIONS]})}
                  className="text-indigo-600 text-sm font-bold hover:underline"
                >
                  {eligibility.branches.length === 8 ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {BRANCH_OPTIONS.map(branch => {
                  const isSelected = eligibility.branches.includes(branch);
                  return (
                    <div 
                      key={branch}
                      onClick={() => setEligibility({
                        ...eligibility, 
                        branches: isSelected ? eligibility.branches.filter(b => b !== branch) : [...eligibility.branches, branch]
                      })}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between font-bold ${
                        isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {branch}
                      {isSelected && <CheckCircle size={18} className="text-indigo-600" />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Select Registration Rounds</h2>
            <p className="text-slate-500 mb-8 font-medium">Choose the selection rounds for this drive. Order is maintained automatically.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">
              {ROUND_OPTIONS.map(round => {
                const isSelected = selectedRounds.includes(round.id);
                return (
                  <div 
                    key={round.id}
                    onClick={() => toggleRound(round.id)}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                      isSelected ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                      {round.icon}
                    </div>
                    <span className={`font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{round.label}</span>
                    {isSelected && <CheckCircle size={20} className="text-indigo-600 ml-auto" />}
                  </div>
                )
              })}
            </div>

            {selectedRounds.length > 0 && (
              <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Round Order Preview</h3>
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedRounds.map((r, i) => (
                    <div key={r} className="flex items-center gap-2">
                      <span className="bg-indigo-600 text-white text-xs font-black px-2 py-1 rounded-md">{i+1}. {ROUND_OPTIONS.find(o => o.id === r)?.label}</span>
                      {i < selectedRounds.length - 1 && <ArrowRight size={14} className="text-slate-400" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="max-w-2xl mx-auto animate-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-black text-slate-800">Confirm Drive Details</h2>
              <p className="text-slate-500 font-medium mt-1">Please review everything before finalizing.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Company Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Company</span>
                    <p className="font-bold text-slate-800 text-lg">{getValues('companyName')}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Role</span>
                    <p className="font-bold text-slate-800 text-lg">{getValues('jobRole')}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">CTC</span>
                    <p className="font-bold text-slate-800 text-lg">{getValues('ctc')} LPA</p>
                  </div>
                  <div className="col-span-2 mt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase mb-1 block">Locations</span>
                    <div className="flex gap-2 flex-wrap">
                      {locations.map(l => <span key={l} className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-sm font-bold text-slate-700">{l}</span>)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Eligibility</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Min CGPA</span>
                    <span className="font-medium text-slate-800">{eligibility.cgpa.toFixed(1)} / 10.0</span>
                  </div>
                  {eligibility.tenth.required && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1"><Check size={12} className="text-green-500"/>10th Percentage</span>
                      <span className="font-medium text-slate-800">≥ {eligibility.tenth.minPercentage}%</span>
                    </div>
                  )}
                  {eligibility.twelfth.required && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1"><Check size={12} className="text-green-500"/>12th Percentage</span>
                      <span className="font-medium text-slate-800">≥ {eligibility.twelfth.minPercentage}%</span>
                    </div>
                  )}
                  {eligibility.diploma.required && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1"><Check size={12} className="text-green-500"/>Diploma CGPA</span>
                      <span className="font-medium text-slate-800">≥ {eligibility.diploma.minCGPA.toFixed(1)}</span>
                    </div>
                  )}
                  {!eligibility.tenth.required && !eligibility.twelfth.required && !eligibility.diploma.required && (
                    <div className="text-xs text-slate-400 italic">No 10th/12th/Diploma requirement set</div>
                  )}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-400 uppercase mb-1 block">Branches</span>
                    <div className="flex gap-1 flex-wrap">
                      {eligibility.branches.map(b => <span key={b} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{b}</span>)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Selected Rounds</h3>
                <div className="space-y-2">
                  {selectedRounds.map((r, i) => (
                    <div key={r} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black">{i+1}</span>
                      <span className="font-bold text-slate-700">{ROUND_OPTIONS.find(o => o.id === r)?.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center mt-8 px-2">
        {step > 1 ? (
          <button 
            onClick={() => setStep(step - 1)}
            className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={18} strokeWidth={3} /> Back
          </button>
        ) : <div></div>}
        
        {step < 4 ? (
          <button 
            onClick={handleNext}
            className="px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            Next Step <ArrowRight size={18} strokeWidth={3} />
          </button>
        ) : (
          <button 
            onClick={submitDrive}
            className="px-8 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_14px_0_rgb(5,150,105,0.39)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.23)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <Check size={18} strokeWidth={3} /> Create Placement Drive
          </button>
        )}
      </div>

    </div>
  );
}
