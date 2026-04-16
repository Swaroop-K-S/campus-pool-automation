import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Shield, Clock, Activity, HardDrive, User, Search } from 'lucide-react';
import { format } from 'date-fns';

interface DriveAuditLogProps {
  driveId: string;
}

export default function DriveAuditLog({ driveId }: DriveAuditLogProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/drives/${driveId}/audit-logs`);
        if ((res as any).success) {
          setLogs((res as any).data);
        }
      } catch (err) {
        setError('Failed to load audit logs.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [driveId]);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading audit logs...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500 font-medium">{error}</div>;
  }

  const getActionColor = (action: string) => {
    if (action.includes('update') || action.includes('edit') || action.includes('modify')) return 'text-amber-600 bg-amber-50 border-amber-200';
    if (action.includes('delete') || action.includes('remove') || action.includes('purge')) return 'text-red-600 bg-red-50 border-red-200';
    if (action.includes('create') || action.includes('add') || action.includes('clone')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    return 'text-indigo-600 bg-indigo-50 border-indigo-200';
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 w-full max-w-6xl mx-auto space-y-6 pb-32">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[85vh]">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Administrative Governance Log</h2>
              <p className="text-sm text-slate-500 mt-1">Immutable audit trail of critical operational actions.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Query logs..." 
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all w-64"
                />
             </div>
             <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold shadow-sm whitespace-nowrap">
               {filteredLogs.length} Events
             </span>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-16 flex-1 flex flex-col items-center justify-center">
             <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-4 shadow-inner">
               <Activity size={24} />
             </div>
             <p className="text-slate-600 font-bold text-lg">No audit events match your query.</p>
             <p className="text-slate-400 text-sm mt-1">Try adjusting your search terms or perform an administrative action to generate a log.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap w-48">Timestamp</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">Admin Identity</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">Action Type</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">Details & Context</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 w-32">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        <span className="text-sm font-bold text-slate-700">
                          {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm:ss')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                           <User size={14} className="text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 leading-tight">
                            {log.userId?.name || 'Unknown Admin'}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {log.userId?.email || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                      <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="text-sm text-slate-600 mb-1 flex items-center gap-2 line-clamp-2" title={log.details}>
                        {log.resourceType && <><HardDrive size={12} className="text-slate-400 shrink-0"/> <span className="font-bold text-slate-500">{log.resourceType}:</span></>}
                        {log.details || 'No additional details provided.'}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                       <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
                         {log.ipAddress || '0.0.0.0'}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
