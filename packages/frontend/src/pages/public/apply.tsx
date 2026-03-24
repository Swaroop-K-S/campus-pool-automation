import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { GraduationCap, FileText, CheckCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react';

interface FormFieldConfig {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export default function PublicApplyPage() {
  const { formToken } = useParams();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [successData, setSuccessData] = useState<any>(null);

  const { register, handleSubmit, formState: { errors } } = useForm();

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
        let submitKey = fieldConfig ? fieldConfig.label : key;

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
        setSuccessData({ referenceNumber: (res as any).data.referenceNumber, ...config });
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white px-8 py-12 rounded-2xl shadow-sm border border-slate-200 text-center animate-in slide-in-from-bottom-8 duration-500">
           <div className="w-20 h-20 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
             <CheckCircle size={40} className="w-10 h-10" />
           </div>
           <h2 className="text-3xl font-black text-green-600 mb-4">Application Submitted!</h2>
           <p className="text-slate-500 font-medium mb-6">Your application for {successData.jobRole} at <span className="font-bold text-slate-800">{successData.companyName}</span> has been securely received.</p>
           
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your Reference Number</p>
           <div className="text-3xl font-mono font-black text-slate-800 bg-slate-100 border border-slate-200 py-4 px-6 rounded-xl inline-block mb-8 select-all">
             {successData.referenceNumber}
           </div>
           
           <p className="text-sm font-bold text-slate-500 bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200">
             ⚠️ Please save this number for future reference. Good luck! 🎉
           </p>
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
            <h3 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-4">Application Details</h3>

            {config?.fields?.map((field: FormFieldConfig) => (
              <div key={field.id}>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>

                {/* Text / Number / Email / Phone */}
                {['text', 'number', 'email', 'phone'].includes(field.type) && (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                    placeholder={field.placeholder || ''}
                    {...register(field.id, { required: field.required })}
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
                  <p className="text-red-500 text-xs font-bold mt-2">This field is required</p>
                )}
              </div>
            ))}
          </div>

          <button 
            type="submit" disabled={submitting || (config?.formStatus && config.formStatus !== 'open' && config.formStatus !== 'extended')}
            className={`w-full py-4 rounded-xl text-white font-black text-lg shadow-sm transition-all flex items-center justify-center gap-2 ${
              (config?.formStatus && config.formStatus !== 'open' && config.formStatus !== 'extended') 
              ? 'bg-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-600/30 disabled:opacity-50'
            }`}
          >
            {submitting ? 'Submitting Application...' : (config?.formStatus && config.formStatus !== 'open' && config.formStatus !== 'extended') ? 'Form Unavailable' : 'Submit Application'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
