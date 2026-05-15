import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Plus, Trash2, Save, Type, Hash, CheckSquare, FileUp } from 'lucide-react';

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text', icon: <Type size={16} /> },
  { value: 'number', label: 'Number', icon: <Hash size={16} /> },
  { value: 'select', label: 'Dropdown Select', icon: <CheckSquare size={16} /> },
  { value: 'file', label: 'File Upload', icon: <FileUp size={16} /> },
];

export default function FormBuilderTab() {
  const { id } = useParams<{ id: string }>();
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSchema();
  }, [id]);

  const fetchSchema = async () => {
    try {
      const res = await fetch(`/api/v1/drives/${id}/form`);
      if (res.ok) {
        const data = await res.json();
        setFields(data.fields || []);
      }
    } catch (err) {
      console.error("Failed to fetch form schema", err);
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    setFields([
      ...fields,
      { name: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false }
    ]);
  };

  const updateField = (index: number, key: keyof FormField, value: any) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
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
      if (!res.ok) {
        throw new Error('Failed to save form schema');
      }
      setSuccess('Form schema saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={24} />
        Loading Form Builder...
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Registration Form Builder</h2>
          <p className="text-sm text-muted-foreground">Configure the data points you want to collect from students during registration.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Form
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-500/10 text-green-500 rounded-lg text-sm">{success}</div>}

      <div className="space-y-4">
        {fields.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-background/50">
            <p className="text-muted-foreground mb-4">No fields added yet.</p>
            <button onClick={addField} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80">
              Start Building Form
            </button>
          </div>
        ) : (
          fields.map((field, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-4 p-4 border border-border rounded-xl bg-background/50 group transition-colors hover:border-primary/50 relative">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
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
                  <div className="w-1/3">
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Variable Name</label>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(index, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                      className="w-full bg-card border border-border rounded-lg p-2 text-sm focus:border-primary outline-none font-mono text-muted-foreground"
                      placeholder="e.g. cgpa"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-48">
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
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Options (comma separated)</label>
                      <input
                        type="text"
                        value={field.options?.join(', ') || ''}
                        onChange={(e) => updateField(index, 'options', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                        className="w-full bg-card border border-border rounded-lg p-2 text-sm focus:border-primary outline-none"
                        placeholder="Option 1, Option 2"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mt-5">
                    <input
                      type="checkbox"
                      id={`req_${index}`}
                      checked={field.required}
                      onChange={(e) => updateField(index, 'required', e.target.checked)}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor={`req_${index}`} className="text-sm font-medium text-foreground cursor-pointer">Required</label>
                  </div>
                </div>
              </div>

              <div className="md:border-l md:border-border md:pl-4 flex items-center justify-center">
                <button
                  onClick={() => removeField(index)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Remove Field"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
        
        {fields.length > 0 && (
          <button
            onClick={addField}
            className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground font-medium flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors bg-background/30"
          >
            <Plus size={18} /> Add Another Field
          </button>
        )}
      </div>
    </div>
  );
}
