import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { GraduationCap, FileText, CheckCircle, AlertTriangle, Image as ImageIcon, Copy, Check, Calendar, Zap, Download } from 'lucide-react';

interface FormFieldConfig {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    pattern?: string;
    customErrorMessage?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export default function PublicApplyPage() {
  const { formToken } = useParams();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [successData, setSuccessData] = useState<any>(null);

  const [ssoId, setSsoId] = useState('');
  const [ssoLoading, setSsoLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, trigger, setValue } = useForm();

  const pages = useMemo(() => {
    if (!config?.fields) return [];
    
    const result: { title: string, fields: FormFieldConfig[] }[] = [];
    let currentFields: FormFieldConfig[] = [];
    let currentTitle = 'Application Details';

    config.fields.forEach((field: FormFieldConfig) => {
      if (field.type === 'page_break') {
        // Only push if there are fields, to avoid empty pages if multiple breaks are back-to-back
        if (currentFields.length > 0) {
          result.push({ title: currentTitle, fields: currentFields });
          currentFields = [];
        }
        currentTitle = field.label || 'Next Step';
      } else {
        currentFields.push(field);
      }
    });

    if (currentFields.length > 0 || result.length === 0) {
      result.push({ title: currentTitle, fields: currentFields });
    }

    return result;
  }, [config?.fields]);

  const [currentPage, setCurrentPage] = useState(0);

  const handleNext = async () => {
    const fieldsOnPage = pages[currentPage].fields.map(f => f.id);
    const isValid = await trigger(fieldsOnPage);
    if (isValid) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    fetchForm();
  }, [formToken]);

  const fetchForm = async () => {
    try {
      const res = await api.get(`/form/${formToken}`);
      if ((res as any).success) setConfig((res as any).data);
    } catch (err: unknown) {
      const ae = err as { response?: { status: number } };
      if (ae.response?.status === 403) setErrorState('Applications for this drive are closed.');
      else if (ae.response?.status === 404) setErrorState('This form link is invalid or expired.');
      else setErrorState('Failed to load form. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: Record<string, string | FileList>) => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        const fieldConfig = config?.fields.find((f: { id: string, label: string, type: string }) => f.id === key);
        let submitKey = fieldConfig ? fieldConfig.label.replace(/\s+/g, '_') : key;

        if (fieldConfig?.type === 'file') {
           const fileList = data[key] as FileList;
           if (submitKey.toLowerCase().includes('resume') || submitKey.toLowerCase().includes('pdf') || submitKey.toLowerCase().includes('cv')) {
             submitKey = 'resume';
           } else {
             submitKey = 'photo';
           }
           if (fileList?.[0]) formData.append(submitKey, fileList[0]);
        } else {
           formData.append(submitKey, data[key] as string);
        }
      });

      const res = await api.post(`/form/${formToken}/submit`, formData);
      if ((res as any).success) {
        setSuccessData({
          referenceNumber: (res as any).data.referenceNumber,
          driveStudentId: (res as any).data.driveStudentId,
          ...config
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const ae = err as { response?: { status: number, data?: { referenceNumber: string, error: string } } };
      if (ae.response?.status === 409) {
        setErrorState(`You have already applied for this drive. Ref: ${ae.response.data?.referenceNumber}`);
      } else {
        toast.error(ae.response?.data?.error || message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSSOFetch = async () => {
    if (!ssoId.trim()) return;
    setSsoLoading(true);
    try {
      const res = await api.get(`/sso/profile/${ssoId.trim()}`);
      if ((res as any).success && (res as any).data) {
        const profile = (res as any).data;
        
        // Auto-fill matched fields based on labels or common keys
        config.fields.forEach((field: FormFieldConfig) => {
          const label = field.label.toLowerCase();
          
          if (label.includes('name') && !label.includes('company')) setValue(field.id, profile.name, { shouldValidate: true });
          else if (label.includes('usn') || label.includes('roll')) setValue(field.id, profile.usn, { shouldValidate: true });
          else if (label.includes('email')) setValue(field.id, profile.email, { shouldValidate: true });
          else if (label.includes('phone') || label.includes('mobile')) setValue(field.id, profile.phone, { shouldValidate: true });
          else if (label.includes('branch') || label.includes('department')) setValue(field.id, profile.branch, { shouldValidate: true });
          else if (label.includes('cgpa') || label.includes('gpa')) setValue(field.id, profile.cgpa, { shouldValidate: true });
          else if (label.includes('linkedin')) setValue(field.id, profile.linkedin, { shouldValidate: true });
          else if (label.includes('github')) setValue(field.id, profile.github, { shouldValidate: true });
        });
        
        toast.success(`Profile auto-filled for ${profile.name}!`);
      }
    } catch (error) {
      toast.error('Failed to find profile. Please enter your data manually.');
    } finally {
      setSsoLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-500 font-bold">Loading Form...</div>;

  if (errorState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 mx-auto bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Notice</h2>
          <p className="text-slate-600 font-medium">{errorState}</p>
        </div>
      </div>
    );
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">

          {/* Success header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={36} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Application Submitted!</h1>
            <p className="text-slate-500 mt-1">{successData.companyName} • {successData.jobRole}</p>
          </div>

          {/* DRIVE ID — Most prominent element */}
          <div className="bg-white rounded-2xl border-2 border-indigo-200 p-6 mb-4 shadow-sm">
            <div className="text-center mb-4">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Your Event Day Drive ID</p>
              <p className="text-xs text-slate-500 mb-3">You will need this to check in on event day</p>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl py-5 px-6 mb-4">
                <div className="text-4xl font-black text-indigo-700 tracking-widest font-mono select-all">
                  {successData.driveStudentId}
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(successData.driveStudentId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
              >
                {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy ID</>}
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700 text-xs leading-relaxed">
                <strong>Save this ID!</strong> Take a screenshot or note it down. You will be asked for this ID when you scan the QR code on event day. A copy has also been sent to your email.
              </p>
            </div>
          </div>

          {/* How to use on event day */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <Calendar size={15} className="text-indigo-500" />
              On Event Day
            </h3>
            <div className="space-y-2.5">
              {[
                { step: '1', text: 'Arrive at the venue' },
                { step: '2', text: 'Find and scan the QR code displayed on screen' },
                { step: '3', text: `Enter your Drive ID: ${successData.driveStudentId}` },
                { step: '4', text: "You're checked in — your schedule appears!" }
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <p className="text-sm text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors mb-6 print:hidden">
            <Download size={18} />
            Download PDF Receipt
          </button>

          <p className="text-center text-xs text-slate-400">Reference: {successData.referenceNumber}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
         <div className="flex items-center gap-2 text-indigo-700">
           <GraduationCap size={24} className="text-indigo-600" />
           <span className="font-black text-lg tracking-tight hidden sm:block">CampusPool Form</span>
         </div>
         <div className="text-center">
           <p className="font-bold text-slate-800 text-sm">{config?.companyName}</p>
           <p className="text-xs font-semibold text-slate-500 hidden sm:block">Recruitment Application</p>
         </div>
         <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
           Powered by <span className="font-black text-slate-700">CampusPool</span>
         </p>
      </header>

      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-0">
        <div className="bg-indigo-600 rounded-xl p-8 mb-8 text-white shadow-lg shadow-indigo-600/20 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <GraduationCap size={150} />
           </div>
           <h1 className="text-3xl font-black mb-2 relative z-10">{config?.companyName}</h1>
           <p className="text-indigo-200 font-bold mb-4 relative z-10 text-lg">{config?.jobRole} • {config?.ctc} • {config?.locations?.join(', ') || 'Various Locations'}</p>
           {config?.formStatus === 'scheduled' && config.formOpenDate && (
             <div className="bg-amber-500/20 border border-amber-400/50 text-amber-100 px-4 py-3 rounded-xl font-bold mb-2">
               ⏳ This form will open on {new Date(config.formOpenDate).toLocaleString()}
             </div>
           )}
           {config?.formStatus === 'closed' && (
             <div className="bg-red-500/20 border border-red-400/50 text-red-100 px-4 py-3 rounded-xl font-bold mb-2">
               ✕ This form is permanently closed.
             </div>
           )}
           {config?.formStatus === 'not_configured' && (
             <div className="bg-slate-800/20 border border-slate-600/50 text-slate-200 px-4 py-3 rounded-xl font-bold mb-2">
               This form is not currently accepting applications.
             </div>
           )}
           {(config?.formStatus === 'open' || config?.formStatus === 'extended') && config?.formCloseDate && (
             <div className="bg-green-500/20 border border-green-400/50 text-green-100 px-4 py-3 inline-block rounded-xl font-bold">
               ● Applications close: {new Date(config.formCloseDate).toLocaleString()}
             </div>
           )}
           {(!config?.formStatus || config.formStatus === 'draft') && config?.eventDate && (
             <p className="text-sm font-medium text-indigo-100 bg-indigo-500/50 inline-block px-3 py-1.5 rounded-lg border border-indigo-400/50">Event Date: {new Date(config.eventDate).toLocaleDateString()}</p>
           )}
        </div>

        {(!config?.formStatus || config.formStatus === 'open' || config.formStatus === 'extended') && (
        <div className="space-y-6">
          {currentPage === 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-4">
               <div className="flex-1">
                 <h3 className="font-black text-indigo-900 text-lg flex items-center gap-2"><Zap size={20} className="text-yellow-500 fill-yellow-500" /> Auto-Fill with CampusPool Passport</h3>
                 <p className="text-sm text-indigo-700 font-medium">Have a verified student profile? Enter your Passport ID to auto-fill your details.</p>
               </div>
               <div className="flex w-full md:w-auto gap-2">
                 <input 
                   type="text"
                   placeholder="Enter Passport ID"
                   value={ssoId}
                   onChange={e => setSsoId(e.target.value)}
                   className="px-4 py-3 rounded-xl border border-indigo-200 w-full md:w-48 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold bg-white"
                 />
                 <button 
                   type="button"
                   onClick={handleSSOFetch}
                   disabled={ssoLoading || !ssoId.trim()}
                   className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors whitespace-nowrap disabled:opacity-50"
                 >
                   {ssoLoading ? 'Fetching...' : 'Auto-Fill'}
                 </button>
               </div>
            </div>
          )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
            <h3 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-4">
              {pages[currentPage]?.title || 'Application Details'}
              {pages.length > 1 && (
                <span className="text-sm font-semibold text-slate-400 ml-3 bg-slate-100 px-2 py-1 rounded-md">
                  Step {currentPage + 1} of {pages.length}
                </span>
              )}
            </h3>

            {config?.fields?.map((field: FormFieldConfig) => {
              if (field.type === 'page_break') return null;
              const isOnCurrentPage = pages[currentPage]?.fields.some(f => f.id === field.id);
              
              return (
              <div key={field.id} className={isOnCurrentPage ? 'block animate-in fade-in duration-300' : 'hidden'}>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>

                {/* Text / Number / Email / Phone */}
                {['text', 'number', 'email', 'phone'].includes(field.type) && (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                    step={field.type === 'number' ? 'any' : undefined}
                    placeholder={field.placeholder || ''}
                    {...register(field.id, { 
                      required: field.required ? 'This field is required' : false,
                      ...(field.validation?.pattern ? {
                        pattern: {
                          value: new RegExp(field.validation.pattern),
                          message: field.validation.customErrorMessage || 'Invalid format'
                        }
                      } : {})
                    })}
                    className={`w-full border rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors ${errors[field.id] ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  />
                )}

                {/* Textarea */}
                {field.type === 'textarea' && (
                  <textarea
                    rows={4}
                    placeholder={field.placeholder || ''}
                    {...register(field.id, { required: field.required })}
                    className={`w-full border rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-colors ${errors[field.id] ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                  />
                )}

                {/* Dropdown */}
                {field.type === 'dropdown' && (
                  <select
                    {...register(field.id, { required: field.required })}
                    className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 bg-white transition-shadow ${errors[field.id] ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  >
                    <option value="">Select an option</option>
                    {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}

                {/* Radio */}
                {field.type === 'radio' && (
                  <div className="space-y-2">
                    {field.options?.map((opt: string) => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" value={opt} {...register(field.id, { required: field.required })} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-slate-700 font-medium">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Checkbox */}
                {field.type === 'checkbox' && (
                  <div className="space-y-2">
                    {field.options?.map((opt: string) => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" value={opt} {...register(field.id, { required: field.required })} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded" />
                        <span className="text-slate-700 font-medium">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Date */}
                {field.type === 'date' && (
                  <input
                    type="date"
                    {...register(field.id, { required: field.required })}
                    className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 transition-shadow ${errors[field.id] ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  />
                )}

                {/* file_pdf or file_image (using simple file input styled nicely) */}
                {(field.type === 'file_pdf' || field.type === 'file_image') && (
                  <div className="w-full">
                    <input
                      type="file"
                      id={`file_${field.id}`}
                      accept={field.type === 'file_pdf' ? 'application/pdf' : 'image/jpeg, image/png'}
                      {...register(field.id, { required: field.required })}
                      className="hidden"
                    />
                    <label htmlFor={`file_${field.id}`} className={`block cursor-pointer w-full border-2 border-dashed rounded-xl p-8 text-center transition-colors hover:bg-slate-50 ${errors[field.id] ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-indigo-400'}`}>
                      <div className="mx-auto w-12 h-12 mb-3 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center">
                         {field.type === 'file_pdf' ? <FileText size={24} /> : <ImageIcon size={24} />}
                      </div>
                      <p className="font-bold text-slate-700 text-sm mb-1">Click to upload {field.type === 'file_pdf' ? 'Resume (PDF)' : 'Photo (JPG/PNG)'}</p>
                      <p className="text-xs text-slate-500 font-medium">Max size: {field.type === 'file_pdf' ? '5MB' : '2MB'}</p>
                    </label>
                  </div>
                )}

                {errors[field.id] && (
                  <p className="text-red-500 text-xs font-bold mt-2">{errors[field.id]?.message as string || 'This field is required'}</p>
                )}
              </div>
            )})}
          </div>

          <div className="flex gap-4">
            {currentPage > 0 && (
              <button 
                type="button" 
                onClick={handlePrev}
                className="w-1/3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-lg transition-all"
               >
                 Back
               </button>
            )}
            
            {currentPage < pages.length - 1 ? (
              <button 
                type="button" 
                onClick={handleNext}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-lg transition-all"
              >
                Next Step
              </button>
            ) : (
              <button 
                type="submit" disabled={submitting || (config?.formStatus && config.formStatus !== 'open' && config.formStatus !== 'extended')}
                className={`flex-1 py-4 rounded-xl text-white font-black text-lg shadow-sm transition-all flex items-center justify-center gap-2 ${
                  (config?.formStatus && config.formStatus !== 'open' && config.formStatus !== 'extended') 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-600/30 disabled:opacity-50'
                }`}
              >
                {submitting ? 'Submitting Application...' : (config?.formStatus && config.formStatus !== 'open' && config.formStatus !== 'extended') ? 'Form Unavailable' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
        </div>
        )}
      </div>
    </div>
  );
}
