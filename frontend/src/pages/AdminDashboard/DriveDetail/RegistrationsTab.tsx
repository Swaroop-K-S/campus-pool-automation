import { useState, useEffect, Fragment } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Loader2, Download, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Student {
  id: string;
  drive_id: string;
  unique_id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  check_in_time: string | null;
  custom_data: Record<string, any>;
  created_at: string;
}

const STATUS_BADGES: Record<string, string> = {
  registered: 'bg-blue-100 text-blue-700 border border-blue-200',
  shortlisted: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  present: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  passed: 'bg-teal-100 text-teal-700 border border-teal-200',
  rejected: 'bg-rose-100 text-rose-700 border border-rose-200',
  selected: 'bg-amber-100 text-amber-700 border border-amber-200',
};

export default function RegistrationsTab() {
  const { id } = useParams<{ id: string }>();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const fetchStudents = () => {
    if (!id) return;
    setLoading(true);
    setError('');
    fetch(`/api/v1/drives/${id}/students`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load students');
        return res.json();
      })
      .then((data) => {
        setStudents(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch registered students.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStudents();
  }, [id]);

  const toggleRow = (studentId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      s.unique_id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export to Excel helper
  const handleExportExcel = () => {
    if (filteredStudents.length === 0 || !id) return;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

    window.open(`/api/v1/drives/${id}/students/export?${params.toString()}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 size={32} className="animate-spin text-primary mb-3" />
        <span className="font-medium text-sm">Loading registrations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center max-w-lg mx-auto">
        <AlertCircle size={36} className="mx-auto text-destructive mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-1">Error Loading Data</h3>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <button
          onClick={fetchStudents}
          className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90 flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border border-b-[3px] border-b-primary rounded-xl shadow-md overflow-hidden p-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Registered Students</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total Registrations: {students.length} | Displaying: {filteredStudents.length}
          </p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={fetchStudents}
            className="p-2.5 bg-secondary text-secondary-foreground border border-border rounded-lg hover:bg-secondary/80 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>
          
          <button
            onClick={handleExportExcel}
            disabled={filteredStudents.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} /> Export to Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by candidate name, email, phone, or unique ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
          >
            <option value="all">All Statuses</option>
            <option value="registered">Registered</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="present">Present (Checked In)</option>
            <option value="passed">Passed Round</option>
            <option value="rejected">Rejected</option>
            <option value="selected">Selected</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          <AlertCircle size={32} className="mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium">No candidates match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-sm text-muted-foreground">
            <thead className="bg-secondary/70 text-xs font-semibold uppercase tracking-wider text-foreground">
              <tr>
                <th className="px-6 py-4">Candidate Details</th>
                <th className="px-6 py-4">Unique ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Registration Date</th>
                <th className="px-6 py-4 text-center">Form Answers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card text-foreground">
              {filteredStudents.map((s) => {
                const isExpanded = !!expandedRows[s.id];
                const regDate = new Date(s.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <Fragment key={s.id}>
                    <tr className="hover:bg-secondary/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground text-base">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{s.email}</div>
                        <div className="text-xs text-muted-foreground">{s.phone}</div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-primary text-sm tracking-wide">
                        {s.unique_id}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_BADGES[s.status] || STATUS_BADGES.registered}`}>
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{regDate}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleRow(s.id)}
                          className="px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-lg hover:bg-secondary/80 font-medium text-xs inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                          {isExpanded ? (
                            <> Hide Answers <ChevronUp size={14} /> </>
                          ) : (
                            <> View Answers <ChevronDown size={14} /> </>
                          )}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Collapsible Custom Data Details */}
                    {isExpanded && (
                      <tr className="bg-secondary/20">
                        <td colSpan={5} className="px-8 py-4 border-t border-b border-border shadow-inner">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
                            Custom Form Responses
                          </h4>
                          
                          {s.custom_data && Object.keys(s.custom_data).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(s.custom_data).map(([key, val]) => {
                                const isUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));

                                return (
                                  <div key={key} className="bg-card border border-border/80 rounded-xl p-3 shadow-sm">
                                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
                                      {key.replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-sm font-semibold text-foreground">
                                      {isUrl ? (
                                        <a
                                          href={val}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline inline-flex items-center gap-1"
                                        >
                                          View Uploaded File ↗
                                        </a>
                                      ) : (
                                        String(val)
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No custom questions configured or answered for this drive.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
