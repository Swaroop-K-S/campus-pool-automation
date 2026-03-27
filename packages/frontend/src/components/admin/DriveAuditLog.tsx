import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Mail, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface DriveAuditLogProps {
  driveId: string;
}

export default function DriveAuditLog({ driveId }: DriveAuditLogProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading audit logs...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500 font-medium">{error}</div>;
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 w-full max-w-6xl mx-auto space-y-6 pb-32">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Communication Audit Log</h2>
            <p className="text-sm text-slate-500 mt-1">Record of all automated SMS, Email, and WhatsApp notifications sent.</p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold border border-indigo-100 shadow-sm">
            {logs.length} Total Logs
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
             <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
               <MessageSquare size={24} />
             </div>
             <p className="text-slate-600 font-medium text-lg">No communication logs found.</p>
             <p className="text-slate-400 text-sm mt-1">Notifications sent from the Shortlist tab will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Recipient</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Channel</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isSuccess = log.status === 'sent' || log.status === 'delivered';
                  return (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-700 font-medium">
                            {format(new Date(log.sentAt), 'dd MMM yyyy, hh:mm a')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-800">
                           {log.applicationId?.data?.name || log.applicationId?.data?.fullName || 'Unknown Student'}
                        </div>
                        <div className="text-xs text-slate-500">
                           Ref: {log.applicationId?.referenceNumber || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="text-sm text-slate-600 capitalize">{log.recipientType}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.channel === 'email' ? (
                          <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full w-fit text-xs font-bold border border-blue-100">
                            <Mail size={12} /> Email
                          </div>
                        ) : log.channel === 'whatsapp' ? (
                          <div className="flex items-center gap-1.5 text-green-700 bg-[#DCF8C6] px-2.5 py-1 rounded-full w-fit text-xs font-bold border border-[#DCF8C6]">
                            <MessageSquare size={12} /> WhatsApp
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 capitalize">{log.channel}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${isSuccess ? 'text-green-600' : 'text-red-500'}`}>
                           {isSuccess ? <CheckCircle size={14} /> : <XCircle size={14} />}
                           {log.status}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {log.errorMessage ? (
                          <span className="text-red-500 truncate block max-w-xs" title={log.errorMessage}>{log.errorMessage}</span>
                        ) : (
                          <span className="text-slate-500">Sent to {log.channel === 'email' ? (log.applicationId?.candidateEmail || 'Email') : 'Phone'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
