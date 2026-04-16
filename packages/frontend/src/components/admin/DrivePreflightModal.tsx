import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, AlertTriangle, Play } from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  driveId: string;
  drive: any;
  onConfirm: () => void;
  onCancel: () => void;
  onNavigate: (tab: string) => void;
}

interface CheckItem {
  key: string;
  label: string;
  description: string;
  tab?: string; // which tab to navigate to to fix it
  status: 'loading' | 'pass' | 'fail' | 'warn';
}

export function DrivePreflightModal({ driveId, drive, onConfirm, onCancel, onNavigate }: Props) {
  const [checks, setChecks] = useState<CheckItem[]>([
    { key: 'form', label: 'Application Form Configured', description: 'A form must be saved and published with a public link.', tab: 'Form Builder', status: 'loading' },
    { key: 'shortlisted', label: 'Students Shortlisted', description: 'At least 1 student must be shortlisted to attend.', tab: 'Shortlist', status: 'loading' },
    { key: 'rooms', label: 'Rooms Created', description: 'At least 1 room must be set up for the first round.', tab: 'Rooms', status: 'loading' },
    { key: 'venue', label: 'Venue & Date Configured', description: 'Event date and report time must be set.', tab: 'Event Day', status: 'loading' },
    { key: 'invites', label: 'Invite Emails Sent', description: 'Shortlisted students should be notified about the drive.', tab: 'Shortlist', status: 'loading' },
    { key: 'panelists', label: 'Panelists Assigned', description: 'At least one room should have panelists assigned.', tab: 'Rooms', status: 'loading' },
  ]);
  const [running, setRunning] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    runChecks();
  }, []);

  const runChecks = async () => {
    setRunning(true);

    // Gather data from existing API responses
    let roomCount = 0;
    let shortlistedCount = 0;
    let invitedCount = 0;
    let panelistCount = 0;

    try {
      const [roomsRes, appsRes]: any[] = await Promise.all([
        api.get(`/drives/${driveId}/rooms`),
        api.get(`/drives/${driveId}`),
      ]);
      roomCount = roomsRes?.data?.length || 0;
      panelistCount = (roomsRes?.data || []).filter((r: any) => r.panelists?.length > 0).length;
      shortlistedCount = appsRes?.data?.applicationStats?.shortlisted || 0;
      invitedCount = appsRes?.data?.applicationStats?.invited || 0;
    } catch {}

    const hasForm = !!(drive?.formToken);
    const hasVenue = !!(drive?.eventDate && drive?.reportTime);

    setChecks([
      {
        key: 'form',
        label: 'Application Form Configured',
        description: hasForm ? 'Form is live and accepting applications.' : 'No public form token found. Save the form first.',
        tab: 'Form Builder',
        status: hasForm ? 'pass' : 'fail',
      },
      {
        key: 'shortlisted',
        label: 'Students Shortlisted',
        description: shortlistedCount > 0 ? `${shortlistedCount} student(s) are shortlisted and ready to be invited.` : 'No students shortlisted yet. Upload a shortlist first.',
        tab: 'Shortlist',
        status: shortlistedCount > 0 ? 'pass' : 'fail',
      },
      {
        key: 'rooms',
        label: 'Rooms Created',
        description: roomCount > 0 ? `${roomCount} room(s) configured.` : 'No rooms added yet. Add interview/evaluation rooms first.',
        tab: 'Rooms',
        status: roomCount > 0 ? 'pass' : 'fail',
      },
      {
        key: 'venue',
        label: 'Venue & Date Configured',
        description: hasVenue ? `Event: ${new Date(drive.eventDate).toLocaleDateString('en-IN')} · Report: ${drive.reportTime}` : 'Set the event date and report time in the Event Day tab.',
        tab: 'Event Day',
        status: hasVenue ? 'pass' : 'warn',
      },
      {
        key: 'invites',
        label: 'Invite Emails Sent',
        description: invitedCount > 0
          ? `${invitedCount} student(s) have been sent invites.`
          : 'No invite emails sent yet. Send invites from the Shortlist tab.',
        tab: 'Shortlist',
        status: invitedCount > 0 ? 'pass' : 'warn',
      },
      {
        key: 'panelists',
        label: 'Panelists Assigned to Rooms',
        description: panelistCount > 0
          ? `${panelistCount} room(s) have panelists assigned.`
          : 'No panelists assigned. Assign evaluators to rooms for a smoother interview day.',
        tab: 'Rooms',
        status: panelistCount > 0 ? 'pass' : 'warn',
      },
    ]);

    setRunning(false);
  };

  const hasFail = checks.some(c => c.status === 'fail');

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm();
    setConfirming(false);
  };

  const iconFor = (status: CheckItem['status']) => {
    switch (status) {
      case 'loading': return <Loader2 size={18} className="animate-spin text-slate-400" />;
      case 'pass': return <CheckCircle size={18} className="text-emerald-500" />;
      case 'fail': return <XCircle size={18} className="text-rose-500" />;
      case 'warn': return <AlertTriangle size={18} className="text-amber-500" />;
    }
  };

  const bgFor = (status: CheckItem['status']) => {
    switch (status) {
      case 'loading': return 'bg-slate-50 border-slate-200';
      case 'pass': return 'bg-emerald-50 border-emerald-200';
      case 'fail': return 'bg-rose-50 border-rose-200';
      case 'warn': return 'bg-amber-50 border-amber-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-6 py-5 text-white">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Play size={20} className="fill-current" /> Event Day Pre-Flight Check
          </h2>
          <p className="text-indigo-200 text-sm mt-1">Validating configuration before starting the event...</p>
        </div>

        {/* Checks */}
        <div className="p-6 space-y-3">
          {checks.map(check => (
            <div key={check.key} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${bgFor(check.status)}`}>
              <div className="shrink-0 mt-0.5">{iconFor(check.status)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-800">{check.label}</p>
                <p className="text-xs font-medium text-slate-600 mt-0.5">{check.description}</p>
              </div>
              {check.status === 'fail' && check.tab && (
                <button
                  onClick={() => { onCancel(); onNavigate(check.tab!); }}
                  className="shrink-0 text-xs font-black text-rose-600 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Fix →
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Result Banner */}
        {!running && (
          <div className={`mx-6 mb-4 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${
            hasFail
              ? 'bg-rose-50 border border-rose-200 text-rose-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          }`}>
            {hasFail
              ? <><XCircle size={16} /> Please resolve the failed checks before starting the event day.</>
              : <><CheckCircle size={16} /> All systems ready! You can start the event day.</>
            }
          </div>
        )}

        {/* Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={hasFail || running || confirming}
            className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black text-sm transition-all shadow-md shadow-emerald-500/20"
          >
            {confirming ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="fill-current" />}
            {confirming ? 'Starting...' : 'Start Event Day'}
          </button>
        </div>
      </div>
    </div>
  );
}
