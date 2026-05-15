import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, UploadCloud } from 'lucide-react';

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface Drive {
  company_name: string;
  status: string;
}

export default function StudentRegistration() {
  const { driveId } = useParams<{ driveId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [drive, setDrive] = useState<Drive | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File>>({});

  useEffect(() => {
    fetchDriveDetails();
  }, [driveId]);

  const fetchDriveDetails = async () => {
    try {
      // Fetch Drive
      const dRes = await fetch(`/api/v1/drives/${driveId}`);
      if (!dRes.ok) throw new Error('Drive not found');
      const dData = await dRes.json();
      setDrive(dData);

      if (dData.status !== 'active' && dData.status !== 'event_day') {
        throw new Error('Registration is closed for this drive.');
      }

      // Fetch Form Schema
      const fRes = await fetch(`/api/v1/drives/${driveId}/form`);
      if (fRes.ok) {
        const fData = await fRes.json();
        setFields(fData.fields || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load registration form.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (name: string, file: File | null) => {
    if (file) {
      setFiles(prev => ({ ...prev, [name]: file }));
    } else {
      const newFiles = { ...files };
      delete newFiles[name];
      setFiles(newFiles);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // 1. Upload all files to Cloudinary first
      const fileUrls: Record<string, string> = {};
      
      for (const [name, file] of Object.entries(files)) {
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadRes = await fetch('/api/v1/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${name}`);
        }
        
        const uploadData = await uploadRes.json();
        fileUrls[name] = uploadData.url;
      }

      // 2. Prepare payload
      // Separate standard fields from custom fields based on backend expectations
      // Our backend expects: full_name, email, phone, custom_data
      const standardKeys = ['full_name', 'email', 'phone'];
      const payload: any = {
        full_name: formData['full_name'] || '',
        email: formData['email'] || '',
        phone: formData['phone'] || '',
        custom_data: { ...fileUrls }
      };

      for (const [key, value] of Object.entries(formData)) {
        if (!standardKeys.includes(key)) {
          payload.custom_data[key] = value;
        }
      }

      // 3. Submit Registration
      const regRes = await fetch(`/api/v1/drives/${driveId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!regRes.ok) {
        const errData = await regRes.json();
        throw new Error(errData.detail || 'Registration failed');
      }

      setSuccess(true);

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin" size={24} />
          <span className="font-medium">Loading Registration...</span>
        </div>
      </div>
    );
  }

  if (error && !drive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border border-destructive/20 rounded-xl p-8 max-w-md w-full text-center shadow-lg">
          <AlertCircle size={48} className="mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Unavailable</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border border-green-500/20 rounded-xl p-8 max-w-md w-full text-center shadow-lg">
          <CheckCircle size={64} className="mx-auto text-green-500 mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Registration Successful!</h2>
          <p className="text-muted-foreground mb-8">You have successfully registered for the {drive?.company_name} placement drive. Good luck!</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border border-t-[4px] border-t-primary rounded-2xl shadow-xl overflow-hidden">
          
          <div className="px-8 py-10 bg-primary/5 border-b border-border">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
              {drive?.company_name} Registration
            </h1>
            <p className="text-muted-foreground">Please fill out the form below carefully. All fields marked with an asterisk (*) are required.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                </label>
                
                {field.type === 'text' && (
                  <input
                    type="text"
                    required={field.required}
                    className="w-full bg-background border border-border rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    placeholder={`Enter ${field.label}`}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  />
                )}
                
                {field.type === 'email' && (
                  <input
                    type="email"
                    required={field.required}
                    className="w-full bg-background border border-border rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    placeholder="example@college.edu"
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  />
                )}
                
                {field.type === 'tel' && (
                  <input
                    type="tel"
                    required={field.required}
                    className="w-full bg-background border border-border rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    placeholder="+91"
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  />
                )}
                
                {field.type === 'number' && (
                  <input
                    type="number"
                    step="0.01"
                    required={field.required}
                    className="w-full bg-background border border-border rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  />
                )}
                
                {field.type === 'select' && (
                  <select
                    required={field.required}
                    className="w-full bg-background border border-border rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none"
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  >
                    <option value="">Select an option...</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {field.type === 'file' && (
                  <div className="relative group">
                    <input
                      type="file"
                      required={field.required}
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => handleFileChange(field.name, e.target.files?.[0] || null)}
                    />
                    <div className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center group-hover:border-primary group-hover:bg-primary/5 transition-colors">
                      <UploadCloud size={28} className="mx-auto text-muted-foreground group-hover:text-primary mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        {files[field.name] ? files[field.name].name : `Upload ${field.label}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {files[field.name] ? 'Click or drag to replace' : 'PDF, JPG or PNG (max 5MB)'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-6 border-t border-border">
              <button
                type="submit"
                disabled={submitting || fields.length === 0}
                className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-lg shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="animate-spin" size={20} /> Processing Registration...</>
                ) : (
                  'Submit Registration'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
