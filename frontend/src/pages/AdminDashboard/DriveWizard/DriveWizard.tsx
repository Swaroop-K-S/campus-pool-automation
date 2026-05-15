import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Loader2, FileText, Settings, SkipForward, Copy, ExternalLink } from 'lucide-react';
import { MultiSelect } from '../../../components/MultiSelect';
import { LOCATIONS } from '../../../data/driveOptions';

interface FormData {
  // Step 1 — Company Details
  company_name: string;
  drive_date: string;
  package_offered: string;
  reporting_time: string;
  locations: string[];
  // Step 2 — Registration window
  form_start_date: string;
  form_end_date: string;
  // Step 3 — Rounds (tracked separately)
  rounds: { name: string; round_type: string; sequence: number }[];
  // Step 4 — QR type
  qr_type: 'static' | 'dynamic';
  // Form Builder
  form_type: 'template' | 'custom' | 'skip';
}

const ROUND_OPTIONS = [
  { label: 'Pre-Placement Talk (Seminar)', round_type: 'seminar' },
  { label: 'Online Aptitude Test',         round_type: 'aptitude' },
  { label: 'Group Discussion',              round_type: 'gd' },
  { label: 'Technical Interview',           round_type: 'technical' },
  { label: 'HR Interview',                  round_type: 'hr' },
];

export default function DriveWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    company_name: '',
    drive_date: '',
    package_offered: '',
    reporting_time: '09:00',
    locations: [],
    form_start_date: '',
    form_end_date: '',
    rounds: [
      { name: 'Pre-Placement Talk (Seminar)', round_type: 'seminar', sequence: 1 },
      { name: 'Online Aptitude Test',         round_type: 'aptitude', sequence: 2 },
    ],
    qr_type: 'static',
    form_type: 'template',
  });

  const totalSteps = 4;
  const steps = [
    { id: 1, title: 'Company Details' },
    { id: 2, title: 'Registration Form' },
    { id: 3, title: 'Round Sequence' },
    { id: 4, title: 'Room Logistics' },
  ];

  const set = (key: keyof FormData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleRound = (option: { label: string; round_type: string }) => {
    const exists = form.rounds.find(r => r.round_type === option.round_type);
    if (exists) {
      const updated = form.rounds
        .filter(r => r.round_type !== option.round_type)
        .map((r, i) => ({ ...r, sequence: i + 1 }));
      set('rounds', updated);
    } else {
      set('rounds', [
        ...form.rounds,
        { name: option.label, round_type: option.round_type, sequence: form.rounds.length + 1 },
      ]);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
    else handleSubmit();
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!form.company_name.trim()) {
      setCurrentStep(1);
      setSubmitError('Company name is required.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        company_name: form.company_name,
        package_offered: form.package_offered || null,
        locations: form.locations,
        drive_date: form.drive_date ? new Date(form.drive_date).toISOString() : null,
        reporting_time: form.reporting_time || null,
        form_start_date: form.form_start_date ? new Date(form.form_start_date).toISOString() : null,
        form_end_date: form.form_end_date ? new Date(form.form_end_date).toISOString() : null,
        qr_type: form.qr_type,
      };

      const res = await fetch('/api/v1/drives/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create drive');
      }

      const data = await res.json();
      const driveId = data.id || data._id;

      // Create the rounds in parallel
      if (form.rounds.length > 0) {
        await Promise.all(
          form.rounds.map(r =>
            fetch(`/api/v1/drives/${driveId}/rounds`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...r, drive_id: driveId }),
            })
          )
        );
      }

      // Also create the form template if selected
      if (form.form_type === 'template') {
        const standardFields = [
          { name: 'full_name', label: 'Full Name', type: 'text', required: true },
          { name: 'email', label: 'Email Address', type: 'email', required: true },
          { name: 'phone', label: 'Phone Number', type: 'tel', required: true },
          { name: 'usn', label: 'USN / Roll Number', type: 'text', required: true },
          { name: 'branch', label: 'Branch / Specialization', type: 'text', required: true },
          { name: 'cgpa', label: 'CGPA', type: 'number', required: true },
          { name: 'resume', label: 'Upload Resume (PDF)', type: 'file', required: true },
          { name: 'photo', label: 'Upload Photo (JPG/PNG)', type: 'file', required: false },
        ];
        await fetch(`/api/v1/drives/${driveId}/form`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: standardFields }),
        });
      }

      navigate(`/admin/drives/${driveId}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = 'w-full bg-background border border-border text-foreground rounded-lg p-2.5 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all text-sm';
  const labelCls = 'block text-sm font-semibold text-foreground mb-1.5';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Create New Placement Drive</h1>
        <p className="text-muted-foreground mt-2">Configure company details, rounds, and logistics for the event day.</p>
      </div>

      {/* Stepper */}
      <div className="mb-10">
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center">
            {steps.map((step, idx) => (
              <li key={step.title} className={`relative ${idx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="flex items-center">
                  <div className={`relative flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm transition-all
                    ${currentStep > step.id  ? 'bg-primary text-primary-foreground shadow-md'
                    : currentStep === step.id ? 'border-2 border-primary bg-card text-primary'
                    : 'border-2 border-border bg-card text-muted-foreground'}`}
                  >
                    {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                  </div>
                  {idx !== steps.length - 1 && (
                    <div className={`absolute top-[18px] left-9 -ml-px h-0.5 w-full transition-colors ${currentStep > step.id ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
                <div className="absolute top-11 text-xs font-medium text-muted-foreground w-max -ml-3">
                  {step.title}
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          ⚠ {submitError}
        </div>
      )}

      {/* Card */}
      <div className="bg-card rounded-xl shadow-md border border-border border-b-[3px] border-b-primary min-h-[420px] flex flex-col">
        <div className="p-8 flex-1">

          {/* Step 1 — Company Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Company Details</h2>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Company Name <span className="text-destructive">*</span></label>
                  <input type="text" className={inputCls} placeholder="e.g. Google" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Drive Date</label>
                  <input type="date" className={inputCls} value={form.drive_date} onChange={e => set('drive_date', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Package Offered (LPA)</label>
                  <input type="text" className={inputCls} placeholder="e.g. 14.5" value={form.package_offered} onChange={e => set('package_offered', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Reporting Time</label>
                  <input type="time" className={inputCls} value={form.reporting_time} onChange={e => set('reporting_time', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Locations</label>
                  <MultiSelect
                    options={LOCATIONS}
                    selected={form.locations}
                    onChange={val => set('locations', val)}
                    placeholder="Search and select cities / countries…"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Registration Form */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Registration Configuration</h2>
              <p className="text-muted-foreground text-sm">Configure the student registration window and form layout.</p>
              
              <div className="grid grid-cols-2 gap-5 mb-6">
                <div>
                  <label className={labelCls}>Registration Opens</label>
                  <input type="datetime-local" className={inputCls} value={form.form_start_date} onChange={e => set('form_start_date', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Registration Closes</label>
                  <input type="datetime-local" className={inputCls} value={form.form_end_date} onChange={e => set('form_end_date', e.target.value)} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Registration Form Setup</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div 
                    onClick={() => set('form_type', 'template')}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${form.form_type === 'template' ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--color-primary),0.1)]' : 'border-border bg-card hover:border-primary/50'}`}
                  >
                    <div className="flex items-center mb-2">
                      <FileText size={20} className={form.form_type === 'template' ? 'text-primary' : 'text-muted-foreground'} />
                      <span className={`ml-2 font-semibold ${form.form_type === 'template' ? 'text-primary' : 'text-foreground'}`}>Standard Template</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Auto-generates fields for Name, CGPA, USN, Branch, Resume (PDF), and Photo.</p>
                  </div>

                  <div 
                    onClick={() => set('form_type', 'custom')}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${form.form_type === 'custom' ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--color-primary),0.1)]' : 'border-border bg-card hover:border-primary/50'}`}
                  >
                    <div className="flex items-center mb-2">
                      <Settings size={20} className={form.form_type === 'custom' ? 'text-primary' : 'text-muted-foreground'} />
                      <span className={`ml-2 font-semibold ${form.form_type === 'custom' ? 'text-primary' : 'text-foreground'}`}>Custom Form</span>
                    </div>
                    <p className="text-xs text-muted-foreground">You will be redirected to the Form Builder after Drive creation.</p>
                  </div>

                  <div 
                    onClick={() => set('form_type', 'skip')}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${form.form_type === 'skip' ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--color-primary),0.1)]' : 'border-border bg-card hover:border-primary/50'}`}
                  >
                    <div className="flex items-center mb-2">
                      <SkipForward size={20} className={form.form_type === 'skip' ? 'text-primary' : 'text-muted-foreground'} />
                      <span className={`ml-2 font-semibold ${form.form_type === 'skip' ? 'text-primary' : 'text-foreground'}`}>Skip For Now</span>
                    </div>
                    <p className="text-xs text-muted-foreground">No form will be created. You can build it later from the Drive Details page.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Round Sequence */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Round Sequence</h2>
              <p className="text-muted-foreground text-sm">Select the rounds for this drive. They will be created in order.</p>
              <div className="space-y-3">
                {ROUND_OPTIONS.map(option => {
                  const isSelected = form.rounds.some(r => r.round_type === option.round_type);
                  const seq = form.rounds.findIndex(r => r.round_type === option.round_type) + 1;
                  return (
                    <button
                      key={option.round_type}
                      type="button"
                      onClick={() => toggleRound(option)}
                      className={`w-full p-4 rounded-lg border flex items-center justify-between transition-all text-left
                        ${isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-background hover:bg-secondary/30'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                          {isSelected ? seq : '–'}
                        </div>
                        <span className={`font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {option.label}
                        </span>
                      </div>
                      {isSelected && <Check size={18} className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4 — Room Logistics / QR Type */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Event Day Settings</h2>
              <p className="text-muted-foreground text-sm">Configure QR check-in mode. Rooms can be added after the drive is created.</p>
              <div>
                <label className={labelCls}>QR Code Type</label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {(['static', 'dynamic'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => set('qr_type', type)}
                      className={`p-5 rounded-xl border-2 text-left transition-all
                        ${form.qr_type === type ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-secondary/20'}`}
                    >
                      <p className={`font-bold capitalize mb-1 ${form.qr_type === type ? 'text-primary' : 'text-foreground'}`}>
                        {type} QR
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {type === 'static'
                          ? 'One fixed QR code for the entire event. Simple and reliable.'
                          : 'QR rotates every 30 seconds. More secure against screenshot sharing.'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-secondary/40 rounded-xl p-5 border border-border mt-4">
                <h3 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wider">Drive Summary</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Company</dt>
                    <dd className="font-semibold text-foreground">{form.company_name || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="font-semibold text-foreground">{form.drive_date || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Package</dt>
                    <dd className="font-semibold text-foreground">{form.package_offered ? `₹${form.package_offered} LPA` : '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Rounds</dt>
                    <dd className="font-semibold text-foreground">{form.rounds.length} selected</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-secondary/20 p-6 border-t border-border rounded-b-xl flex justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
              currentStep === 1
                ? 'bg-secondary/50 text-muted-foreground/50 cursor-not-allowed'
                : 'bg-card border border-border text-foreground hover:bg-secondary'
            }`}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-70"
          >
            {isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" /> Saving...</>
            ) : currentStep === totalSteps ? (
              'Complete & Save'
            ) : (
              <>Next Step <ChevronRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
