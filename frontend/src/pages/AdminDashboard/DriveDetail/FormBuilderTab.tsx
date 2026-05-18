import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2, Plus, Trash2, Save, Type, Hash,
  CheckSquare, FileUp, Copy, PenTool, Eye,
  ChevronUp, ChevronDown, CheckCircle, GitMerge, ArrowUpDown
} from 'lucide-react';

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  depends_on_field?: string;
  depends_on_value?: string;
}

const FIELD_TYPES = [
  { value: 'text',   label: 'Short Text',      icon: <Type size={16} /> },
  { value: 'email',  label: 'Email',            icon: <Type size={16} /> },
  { value: 'tel',    label: 'Phone Number',     icon: <Type size={16} /> },
  { value: 'number', label: 'Number',           icon: <Hash size={16} /> },
  { value: 'select', label: 'Dropdown Select',  icon: <CheckSquare size={16} /> },
  { value: 'file',   label: 'File Upload',      icon: <FileUp size={16} /> },
];

const PRESET_FIELDS: FormField[] = [
  { label: 'Full Name',          name: 'full_name',        type: 'text',   required: true },
  { label: 'Email Address',      name: 'email',            type: 'email',  required: true },
  { label: 'Phone Number',       name: 'phone',            type: 'tel',    required: true },
  { label: 'USN',                name: 'usn',              type: 'text',   required: true },
  { label: 'CGPA',               name: 'cgpa',             type: 'number', required: true },
  { label: 'Branch / Dept',      name: 'branch',           type: 'select', required: true, options: ['CSE', 'ISE', 'ECE', 'ME', 'CE', 'EEE'] },
  { label: '10th Percentage',    name: 'tenth_marks',      type: 'number', required: true },
  { label: 'Education Route',    name: 'education_route',  type: 'select', required: true, options: ['12th Standard', 'Diploma'] },
  { label: '12th Percentage',    name: 'twelfth_marks',    type: 'number', required: true, depends_on_field: 'education_route', depends_on_value: '12th Standard' },
  { label: 'Diploma % / Marks',  name: 'diploma_marks',    type: 'number', required: true, depends_on_field: 'education_route', depends_on_value: 'Diploma' },
  { label: 'Resume / CV',        name: 'resume',           type: 'file',   required: true },
  { label: 'Passport Photo',     name: 'photo',            type: 'file',   required: true },
];

export default function FormBuilderTab() {
  const { id } = useParams<{ id: string }>();

  const [drive, setDrive] = useState<any>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const [showCondition, setShowCondition] = useState<Set<number>>(new Set());
  const [previewMode, setPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const [schemaRes, driveRes] = await Promise.all([
        fetch(`/api/v1/drives/${id}/form`),
        fetch(`/api/v1/drives/${id}`),
      ]);
      if (schemaRes.ok) {
        const data = await schemaRes.json();
        setFields(data.fields || []);
      }
      if (driveRes.ok) {
        setDrive(await driveRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    const next = [...fields, { name: '', label: '', type: 'text', required: false }];
    setFields(next);
    setExpandedField(next.length - 1);
  };

  const addPresetField = (preset: FormField) => {
    if (fields.some(f => f.name === preset.name)) return;

    let insertAt = fields.length; // default: append at end

    // If this field depends on another field, insert it right after the parent
    if (preset.depends_on_field) {
      const parentIdx = fields.findLastIndex(f => f.name === preset.depends_on_field);
      if (parentIdx !== -1) {
        // Insert after the last sibling conditional field of the same parent
        let insertAfter = parentIdx;
        for (let i = parentIdx + 1; i < fields.length; i++) {
          if (fields[i].depends_on_field === preset.depends_on_field) insertAfter = i;
          else break;
        }
        insertAt = insertAfter + 1;
      }
    }

    const next = [
      ...fields.slice(0, insertAt),
      { ...preset },
      ...fields.slice(insertAt),
    ];
    setFields(next);
    setExpandedField(insertAt);
  };

  const updateField = (index: number, key: keyof FormField, value: any) => {
    const next = [...fields];
    next[index] = { ...next[index], [key]: value };
    setFields(next);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
    if (expandedField === index) setExpandedField(null);
  };

  const moveField = (index: number, dir: 'up' | 'down') => {
    if (dir === 'up' && index === 0) return;
    if (dir === 'down' && index === fields.length - 1) return;
    const next = [...fields];
    const target = dir === 'up' ? index - 1 : index + 1;
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
    if (expandedField === index) setExpandedField(target);
    else if (expandedField === target) setExpandedField(index);
  };

  const autoSort = () => {
    const presetOrder = PRESET_FIELDS.map(p => p.name);
    const sorted = [...fields].sort((a, b) => {
      const ai = presetOrder.indexOf(a.name);
      const bi = presetOrder.indexOf(b.name);
      if (ai === -1 && bi === -1) return 0; // both custom → keep relative order
      if (ai === -1) return 1;              // custom goes after presets
      if (bi === -1) return -1;
      return ai - bi;                       // sort by preset order
    });
    setFields(sorted);
    setExpandedField(null);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/register/${id}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/v1/drives/${id}/form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error('Failed to save form schema');
      setSuccess('Form schema saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Re-groups conditional fields right after their parent at render time
  // so the form always looks correct regardless of saved order
  const getOrderedFields = (rawFields: FormField[]): FormField[] => {
    const result: FormField[] = [];
    const added = new Set<string>();
    for (const field of rawFields) {
      if (added.has(field.name)) continue;
      if (field.depends_on_field) continue; // will be inserted after parent
      result.push(field);
      added.add(field.name);
      // Insert all children of this field immediately after it
      for (const child of rawFields) {
        if (child.depends_on_field === field.name && !added.has(child.name)) {
          result.push(child);
          added.add(child.name);
        }
      }
    }
    // Any orphaned conditional fields (parent not in form) go at end
    for (const field of rawFields) {
      if (!added.has(field.name)) result.push(field);
    }
    return result;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={24} />
        Loading Form Builder...
      </div>
    );
  }

  // ── Preview Mode ──────────────────────────────────────────────────────────
  const renderPreview = () => (
    <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-xl overflow-hidden mt-6">
      <div className="px-8 py-8 bg-primary/5 border-b border-border">
        <h2 className="text-2xl font-bold text-foreground mb-2">Student Registration Preview</h2>
        <p className="text-sm text-muted-foreground">This is exactly how the form will appear to students.</p>
      </div>
      <div className="p-8 space-y-6">
        {getOrderedFields(fields).map((field) => {
          if (field.depends_on_field && previewData[field.depends_on_field] !== field.depends_on_value) {
            return null;
          }
          return (
            <div key={field.name} className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </label>
              {['text', 'email', 'tel', 'number'].includes(field.type) && (
                <input
                  type={field.type}
                  className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:border-primary outline-none"
                  placeholder={`Enter ${field.label}`}
                  onChange={(e) => { const v = e.target.value; setPreviewData(prev => ({ ...prev, [field.name]: v })); }}
                />
              )}
              {field.type === 'select' && (
                <select
                  className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:border-primary outline-none"
                  onChange={(e) => { const v = e.target.value; setPreviewData(prev => ({ ...prev, [field.name]: v })); }}
                >
                  <option value="">Select an option...</option>
                  {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
              {field.type === 'file' && (
                <div className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary">
                  <FileUp size={24} className="mx-auto text-muted-foreground mb-2" />
                  <span className="text-sm text-foreground">Upload {field.label}</span>
                </div>
              )}
            </div>
          );
        })}
        <div className="pt-4 border-t border-border">
          <button disabled className="w-full py-3 bg-primary/50 text-primary-foreground font-bold rounded-lg cursor-not-allowed">
            Submit Registration (Disabled in Preview)
          </button>
        </div>
      </div>
    </div>
  );

  // ── Builder Mode ──────────────────────────────────────────────────────────
  return (
    <div className="bg-background border border-border rounded-xl p-8 shadow-sm">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Registration Form Builder</h2>
          <p className="text-sm text-muted-foreground">Configure the data points you want to collect from students.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Copy link — only shown when drive is active */}
          {drive?.status === 'active' && (
            <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden h-10 shadow-sm shrink-0">
              <div className="px-3 bg-secondary/30 text-xs font-mono text-muted-foreground border-r border-border flex items-center h-full">
                .../register/{id?.substring(0, 6)}...
              </div>
              <button
                onClick={copyLink}
                className="px-3 hover:bg-secondary/50 text-foreground transition-colors h-full flex items-center gap-1.5 text-sm font-medium"
              >
                {linkCopied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                {linkCopied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          )}

          {/* Builder / Preview toggle */}
          <div className="flex items-center bg-secondary/30 rounded-lg p-1 border border-border shrink-0">
            <button
              onClick={() => setPreviewMode(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${!previewMode ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <PenTool size={16} /> Builder
            </button>
            <button
              onClick={() => setPreviewMode(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${previewMode ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Eye size={16} /> Preview
            </button>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 h-10 bg-primary text-primary-foreground rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 shrink-0"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Form
          </button>
        </div>
      </div>

      {error   && <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-500/10 text-green-500 rounded-lg text-sm">{success}</div>}

      {/* ── Preview ── */}
      {previewMode ? renderPreview() : (
        <div className="space-y-6">

          {/* Quick Add Presets */}
          <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">⚡ Quick Add Presets</p>
              {fields.length > 1 && (
                <button
                  onClick={autoSort}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                  title="Re-order fields into the recommended logical sequence"
                >
                  <ArrowUpDown size={13} /> Auto-Sort
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_FIELDS.map((preset) => {
                const isAdded = fields.some(f => f.name === preset.name);
                return (
                  <button
                    key={preset.name}
                    onClick={() => addPresetField(preset)}
                    disabled={isAdded}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                      isAdded
                        ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed border border-transparent'
                        : 'bg-card hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary text-foreground shadow-sm hover:shadow'
                    }`}
                  >
                    {!isAdded && <Plus size={14} />}
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field list */}
          <div className="space-y-3">
            {fields.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-card">
                <p className="text-muted-foreground mb-4">No fields added yet.</p>
                <button
                  onClick={addField}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80"
                >
                  Start Building Form
                </button>
              </div>
            ) : (
              fields.map((field, index) => {
                const isExpanded = expandedField === index;
                return (
                  <div
                    key={field.name}
                    className={`border ${isExpanded ? 'border-primary shadow-md' : 'border-border shadow-sm'} rounded-xl bg-card overflow-hidden transition-all duration-200`}
                  >
                    {/* Compact header */}
                    <div
                      className="flex items-center p-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                      onClick={() => setExpandedField(isExpanded ? null : index)}
                    >
                      <div className="flex-1 flex items-center gap-3 pl-2">
                        <div className="text-primary/70">
                          {FIELD_TYPES.find(ft => ft.value === field.type)?.icon ?? <Type size={16} />}
                        </div>
                        <span className="font-semibold text-foreground">{field.label || 'Unnamed Field'}</span>
                        {field.required && (
                          <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded font-bold uppercase tracking-wider">Required</span>
                        )}
                        {field.depends_on_field && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Conditional</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <div className="flex mr-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }}
                            disabled={index === 0}
                            className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }}
                            disabled={index === fields.length - 1}
                            className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeField(index); }}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded editor */}
                    {isExpanded && (
                      <div className="p-5 bg-background/50 border-t border-border space-y-4">
                        {/* Label + Variable name */}
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Field Label</label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateField(index, 'label', e.target.value)}
                              className="w-full bg-card border border-border rounded-lg p-2 text-sm focus:border-primary outline-none"
                              placeholder="e.g. CGPA"
                            />
                          </div>
                          <div className="w-full md:w-1/3">
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Variable Name (Internal)</label>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => updateField(index, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                              className="w-full bg-card border border-border rounded-lg p-2 text-sm focus:border-primary outline-none font-mono text-muted-foreground"
                              placeholder="e.g. cgpa"
                            />
                          </div>
                        </div>

                        {/* Type + Options + Required */}
                        <div className="flex flex-col md:flex-row md:items-end gap-4">
                          <div className="w-full md:w-48">
                            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Input Type</label>
                            <select
                              value={field.type}
                              onChange={(e) => updateField(index, 'type', e.target.value)}
                              className="w-full bg-card border border-border rounded-lg p-2 text-sm focus:border-primary outline-none"
                            >
                              {FIELD_TYPES.map(ft => (
                                <option key={ft.value} value={ft.value}>{ft.label}</option>
                              ))}
                            </select>
                          </div>

                          {field.type === 'select' && (
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Dropdown Options (comma separated)</label>
                              <input
                                type="text"
                                value={field.options?.join(', ') || ''}
                                onChange={(e) => updateField(index, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                className="w-full bg-card border border-border rounded-lg p-2 text-sm focus:border-primary outline-none"
                                placeholder="Option 1, Option 2"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-lg">
                            <input
                              type="checkbox"
                              id={`req_${index}`}
                              checked={field.required}
                              onChange={(e) => updateField(index, 'required', e.target.checked)}
                              className="rounded text-primary focus:ring-primary h-4 w-4"
                            />
                            <label htmlFor={`req_${index}`} className="text-sm font-medium text-foreground cursor-pointer">Required Field</label>
                          </div>
                        </div>

                        {/* Conditional logic — collapsed by default */}
                        {(() => {
                          const hasCondition = fields.filter((f, i) => i !== index && f.type === 'select').length > 0;
                          const isConditionOpen = showCondition.has(index) || !!field.depends_on_field;
                          if (!hasCondition) return null;
                          return (
                            <div className="pt-2">
                              {!isConditionOpen ? (
                                <button
                                  type="button"
                                  onClick={() => setShowCondition(prev => { const n = new Set(prev); n.add(index); return n; })}
                                  className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1.5 font-medium transition-colors"
                                >
                                  <GitMerge size={13} /> Add Conditional Logic
                                </button>
                              ) : (
                                <div className="border-t border-border pt-3 flex flex-col md:flex-row gap-3 items-center">
                                  <span className="text-xs font-bold uppercase tracking-wider text-amber-500 w-20 shrink-0">Show IF</span>
                                  <div className="flex-1 flex flex-col sm:flex-row items-center gap-2 w-full">
                                    <select
                                      value={field.depends_on_field || ''}
                                      onChange={(e) => {
                                        updateField(index, 'depends_on_field', e.target.value || undefined);
                                        if (!e.target.value) updateField(index, 'depends_on_value', undefined);
                                      }}
                                      className="w-full bg-background border border-border rounded-lg p-2 text-xs focus:border-primary outline-none"
                                    >
                                      <option value="">(Always Show This Field)</option>
                                      {fields
                                        .filter((f, i) => i !== index && f.type === 'select')
                                        .map(f => (
                                          <option key={f.name} value={f.name}>{f.label || f.name}</option>
                                        ))
                                      }
                                    </select>

                                    {field.depends_on_field && (
                                      <>
                                        <span className="text-xs text-muted-foreground font-semibold shrink-0">EQUALS</span>
                                        <select
                                          value={field.depends_on_value || ''}
                                          onChange={(e) => updateField(index, 'depends_on_value', e.target.value || undefined)}
                                          className="w-full bg-background border border-border rounded-lg p-2 text-xs focus:border-primary outline-none"
                                        >
                                          <option value="">(Select Value)</option>
                                          {fields
                                            .find(f => f.name === field.depends_on_field)
                                            ?.options?.map(opt => (
                                              <option key={opt} value={opt}>{opt}</option>
                                            ))
                                          }
                                        </select>
                                      </>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateField(index, 'depends_on_field', undefined);
                                        updateField(index, 'depends_on_value', undefined);
                                        setShowCondition(prev => { const n = new Set(prev); n.delete(index); return n; });
                                      }}
                                      className="text-xs text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Add blank field button */}
            {fields.length > 0 && (
              <button
                onClick={addField}
                className="w-full py-3 mt-4 border-2 border-dashed border-border rounded-xl text-muted-foreground font-medium flex items-center justify-center gap-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Plus size={18} /> Add Blank Field
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
