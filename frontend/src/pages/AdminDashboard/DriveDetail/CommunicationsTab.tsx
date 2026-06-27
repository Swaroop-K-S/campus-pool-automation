import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Mail, MessageSquare, Loader2, Users, Edit3, X, Eye } from 'lucide-react';

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

  const [callLetterTemplates, setCallLetterTemplates] = useState({
    email_subject: '',
    email_body: '',
    whatsapp_message: ''
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  const MOCK_DATA = {
    full_name: "John Doe",
    company_name: "TechCorp Global",
    package_offered: "12 LPA",
    reporting_time: "09:00 AM",
    venue_name: "Main Auditorium, Block A",
    venue_maps_link: "https://maps.app.goo.gl/example",
    unique_id: "CP-TC-4829",
    email: "john.doe@example.com"
  };

  const formatPreview = (text: string) => {
    let formatted = text || '';
    Object.entries(MOCK_DATA).forEach(([key, value]) => {
      formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return formatted;
  };

  useEffect(() => {
    fetch(`/api/v1/drives/${id}/communications/send-call-letters/template`)
      .then(res => res.json())
      .then(data => {
        setCallLetterTemplates(data);
        setIsLoadingTemplates(false);
      })
      .catch(err => {
        console.error("Failed to fetch templates", err);
        setIsLoadingTemplates(false);
      });
  }, [id]);

  const handleSendCallLetters = async () => {
    setIsSendingCallLetters(true);
    setCallLetterSuccess('');
    
    try {
      const res = await fetch(`/api/v1/drives/${id}/communications/send-call-letters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callLetterTemplates)
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
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm text-muted-foreground pr-4">
                  This will trigger the automated Hall Ticket generation for every student who is currently marked as <strong>Shortlisted</strong>. 
                  They will receive an email and a WhatsApp alert.
                </p>
                <button
                  onClick={() => {
                    setIsPreviewOpen(!isPreviewOpen);
                    setIsEditingMode(false);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-secondary/50 text-secondary-foreground rounded-lg hover:bg-secondary flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  {isPreviewOpen ? <><X size={14} /> Close</> : <><Eye size={14} /> Preview Call Letters</>}
                </button>
              </div>

              {isPreviewOpen && (
                <div className="bg-secondary/20 border border-border/80 rounded-xl mb-4 overflow-hidden p-4">
                  
                  {isLoadingTemplates ? (
                    <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={24} /></div>
                  ) : (
                    <>
                      {isEditingMode ? (
                        <div className="space-y-4 animate-in fade-in">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-sm text-foreground">Edit Templates</h4>
                            <button 
                              onClick={() => setIsEditingMode(false)}
                              className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                            >
                              <Eye size={14} /> Back to Preview
                            </button>
                          </div>
                          
                          <div className="bg-primary/5 text-primary text-[11px] px-3 py-2 rounded-lg border border-primary/20 mb-2">
                            <span className="font-bold">Variables allowed:</span> {`{{full_name}}, {{company_name}}, {{package_offered}}, {{reporting_time}}, {{venue_name}}, {{venue_maps_link}}, {{unique_id}}, {{email}}`}
                          </div>
                          
                          <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Email Subject</label>
                            <input 
                              type="text" 
                              className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                              value={callLetterTemplates.email_subject}
                              onChange={e => setCallLetterTemplates({...callLetterTemplates, email_subject: e.target.value})}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Email Body</label>
                            <textarea 
                              rows={12}
                              className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                              value={callLetterTemplates.email_body}
                              onChange={e => setCallLetterTemplates({...callLetterTemplates, email_body: e.target.value})}
                            ></textarea>
                            <p className="text-[10px] text-muted-foreground mt-1">This content is injected into our stylized email template frame. Line breaks are preserved automatically.</p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">WhatsApp Message</label>
                            <textarea 
                              rows={5}
                              className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                              value={callLetterTemplates.whatsapp_message}
                              onChange={e => setCallLetterTemplates({...callLetterTemplates, whatsapp_message: e.target.value})}
                            ></textarea>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6 animate-in fade-in">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-sm text-foreground">Live Preview</h4>
                            <button 
                              onClick={() => setIsEditingMode(true)}
                              className="px-3 py-1.5 text-xs font-bold bg-background border border-border text-foreground rounded-lg flex items-center gap-1.5 hover:bg-secondary transition-colors"
                            >
                              <Edit3 size={14} /> Edit Templates
                            </button>
                          </div>
                          
                          {/* Email Preview */}
                          <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Subject: {formatPreview(callLetterTemplates.email_subject)}</label>
                            <div className="max-w-md mx-auto border border-border rounded-xl overflow-hidden bg-white shadow-sm font-sans text-sm text-gray-800">
                              <div className="bg-[#4F46E5] text-white p-4 text-center">
                                <h1 className="m-0 text-xl font-bold">CampusPool Hall Ticket</h1>
                              </div>
                              <div className="p-6">
                                <div dangerouslySetInnerHTML={{ __html: formatPreview(callLetterTemplates.email_body).replace(/\n/g, '<br/>') }} />
                              </div>
                            </div>
                          </div>

                          <hr className="border-border/50" />

                          {/* WhatsApp Preview */}
                          <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 text-center">WhatsApp Message</label>
                            <div className="max-w-xs mx-auto bg-[#efeae2] p-4 rounded-xl shadow-inner border border-border relative">
                              <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm text-sm whitespace-pre-wrap text-gray-800">
                                {formatPreview(callLetterTemplates.whatsapp_message)}
                                <div className="text-[10px] text-right text-gray-400 mt-1">10:42 AM</div>
                              </div>
                              <div className="absolute top-4 left-2 w-0 h-0 border-[8px] border-transparent border-t-white border-r-white"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
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
