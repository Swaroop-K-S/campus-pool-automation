import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Mail, MessageSquare, Loader2, Users } from 'lucide-react';

export default function CommunicationsTab() {
  const { id } = useParams();
  
  const [isSendingCallLetters, setIsSendingCallLetters] = useState(false);
  const [callLetterSuccess, setCallLetterSuccess] = useState('');
  
  const [customBlast, setCustomBlast] = useState({
    subject: '',
    message: '',
    target_status: 'shortlisted'
  });
  const [isSendingCustom, setIsSendingCustom] = useState(false);
  const [customSuccess, setCustomSuccess] = useState('');

  const handleSendCallLetters = async () => {
    setIsSendingCallLetters(true);
    setCallLetterSuccess('');
    
    try {
      const res = await fetch(`/api/v1/drives/${id}/communications/send-call-letters`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (res.ok) {
        setCallLetterSuccess(data.message);
      } else {
        alert(data.detail || 'Failed to queue call letters.');
      }
    } catch (e) {
      alert('Network error while triggering communications.');
    } finally {
      setIsSendingCallLetters(false);
    }
  };

  const handleSendCustomBlast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingCustom(true);
    setCustomSuccess('');
    
    try {
      const res = await fetch(`/api/v1/drives/${id}/communications/send-custom-blast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customBlast)
      });
      const data = await res.json();
      
      if (res.ok) {
        setCustomSuccess(data.message);
        setCustomBlast({...customBlast, subject: '', message: ''});
      } else {
        alert(data.detail || 'Failed to queue custom blast.');
      }
    } catch (e) {
      alert('Network error while triggering custom blast.');
    } finally {
      setIsSendingCustom(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Communications Center</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manually trigger emails and WhatsApp messages to students in this drive.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Call Letters Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-primary/10 p-4 border-b border-border/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Official Call Letters</h3>
              <p className="text-xs text-muted-foreground">Send to all shortlisted students</p>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                This will trigger the automated Hall Ticket generation for every student who is currently marked as <strong>Shortlisted</strong>. 
                They will receive an email and a WhatsApp alert containing the drive details and their unique Registration ID.
              </p>
              
              {callLetterSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm mb-4 border border-emerald-200">
                  {callLetterSuccess}
                </div>
              )}
            </div>
            
            <button
              onClick={handleSendCallLetters}
              disabled={isSendingCallLetters}
              className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSendingCallLetters ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {isSendingCallLetters ? 'Queueing Messages...' : 'Send Call Letters Now'}
            </button>
          </div>
        </div>

        {/* Custom Blast Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-secondary/30 p-4 border-b border-border/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Custom Notification Blast</h3>
              <p className="text-xs text-muted-foreground">Target specific student segments</p>
            </div>
          </div>
          <div className="p-6 flex-1">
             {customSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm mb-4 border border-emerald-200">
                  {customSuccess}
                </div>
              )}

            <form onSubmit={handleSendCustomBlast} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users size={12} /> Target Audience
                </label>
                <select 
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={customBlast.target_status}
                  onChange={e => setCustomBlast({...customBlast, target_status: e.target.value})}
                >
                  <option value="all">All Students in Drive</option>
                  <option value="registered">Registered (Pending)</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="present">Checked-In (Present)</option>
                  <option value="passed">Cleared Round (Passed)</option>
                  <option value="selected">Selected (Final)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Subject</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Important Update regarding tomorrow's drive"
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                  value={customBlast.subject}
                  onChange={e => setCustomBlast({...customBlast, subject: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Message</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Type your message here..."
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                  value={customBlast.message}
                  onChange={e => setCustomBlast({...customBlast, message: e.target.value})}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSendingCustom}
                className="w-full py-3 bg-secondary text-secondary-foreground font-bold rounded-lg hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 border border-border shadow-sm"
              >
                {isSendingCustom ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {isSendingCustom ? 'Queueing...' : 'Send Custom Blast'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
