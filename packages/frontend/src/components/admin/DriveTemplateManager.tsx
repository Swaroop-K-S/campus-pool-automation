import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import {
  BookTemplate, Save, Trash2, ChevronRight, X, Loader2,
  Building2, Briefcase, IndianRupee, Users, CheckCircle2,
  Plus, Clock
} from 'lucide-react';

interface DriveTemplate {
  id: string;
  name: string;
  companyName?: string;
  jobRole?: string;
  ctc?: string;
  locations?: string[];
  eligibility?: any;
  rounds?: any[];
  scorecardTraits?: string[];
  resources?: any[];
  createdAt?: string;
}

interface Props {
  /** Called with the template when user picks one — caller applies it to the form */
  onApply?: (template: DriveTemplate) => void;
  /** Current drive data, passed when "Save as Template" is triggered from drive-detail */
  currentDrive?: any;
  /** Show in pick mode (wizard) or manage mode (settings/drive-detail) */
  mode?: 'pick' | 'manage';
  trigger?: React.ReactNode;
}

export function DriveTemplateManager({ onApply, currentDrive, mode = 'manage', trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<DriveTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const d: any = await api.get('/college/templates');
      if (d.success) setTemplates(d.data);
    } catch { toast.error('Failed to load templates'); }
    setLoading(false);
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) return toast.error('Give your template a name');
    if (!currentDrive) return;
    setSaving(true);
    try {
      const d: any = await api.post('/college/templates', {
        name: templateName.trim(),
        companyName: currentDrive.companyName,
        jobRole: currentDrive.jobRole,
        ctc: currentDrive.ctc,
        locations: currentDrive.locations,
        eligibility: currentDrive.eligibility,
        rounds: currentDrive.rounds?.map((r: any) => ({ type: r.type, label: r.label, order: r.order, isCustom: r.isCustom })),
        scorecardTraits: currentDrive.scorecardTraits,
        resources: currentDrive.resources,
      });
      if (d.success) {
        toast.success(`✅ Template "${d.data.name}" saved!`);
        setTemplates(prev => [d.data, ...prev]);
        setTemplateName('');
        setShowSaveForm(false);
      } else toast.error(d.error);
    } catch { toast.error('Failed to save template'); }
    setSaving(false);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/college/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Template deleted');
    } catch { toast.error('Failed to delete'); }
    setDeletingId(null);
  };

  const applyTemplate = (t: DriveTemplate) => {
    onApply?.(t);
    setOpen(false);
    toast.success(`Applied template: ${t.name}`, { icon: '📋' });
  };

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300';

  return (
    <>
      {/* Trigger */}
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger || (
          <button className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-xl transition-all active:scale-95">
            <BookTemplate size={15} /> {mode === 'pick' ? 'Load Template' : 'Drive Templates'}
          </button>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <BookTemplate size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">Drive Templates</h2>
                  <p className="text-xs text-slate-500 font-medium">Reuse drive configurations instantly</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            {/* Save section (only in manage mode with current drive) */}
            {mode === 'manage' && currentDrive && (
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                {!showSaveForm ? (
                  <button
                    onClick={() => setShowSaveForm(true)}
                    className="w-full flex items-center justify-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                  >
                    <Save size={15} /> Save Current Drive as Template
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className={inputCls + ' flex-1'}
                      placeholder={`e.g. "${currentDrive.companyName} Standard"`}
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveAsTemplate()}
                      autoFocus
                    />
                    <button onClick={saveAsTemplate} disabled={saving} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {saving ? '…' : 'Save'}
                    </button>
                    <button onClick={() => setShowSaveForm(false)} className="text-slate-400 hover:text-slate-700 px-2">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Template List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="text-indigo-400 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12">
                  <BookTemplate size={48} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold text-sm">No templates yet</p>
                  <p className="text-slate-400 text-xs mt-1">Save a drive's configuration as a template to reuse it next time.</p>
                </div>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="group flex items-start gap-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 transition-all hover:shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 size={16} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-sm">{t.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {t.companyName && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Building2 size={10} /> {t.companyName}
                          </span>
                        )}
                        {t.jobRole && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Briefcase size={10} /> {t.jobRole}
                          </span>
                        )}
                        {t.ctc && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <IndianRupee size={10} /> {t.ctc}
                          </span>
                        )}
                        {t.rounds && t.rounds.length > 0 && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <CheckCircle2 size={10} /> {t.rounds.length} rounds
                          </span>
                        )}
                        {t.eligibility?.branches?.length > 0 && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Users size={10} /> {t.eligibility.branches.slice(0, 2).join(', ')}{t.eligibility.branches.length > 2 ? ` +${t.eligibility.branches.length - 2}` : ''}
                          </span>
                        )}
                      </div>
                      {t.createdAt && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock size={9} /> Saved {new Date(t.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {onApply && (
                        <button
                          onClick={() => applyTemplate(t)}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                        >
                          Apply <ChevronRight size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        disabled={deletingId === t.id}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        {deletingId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
