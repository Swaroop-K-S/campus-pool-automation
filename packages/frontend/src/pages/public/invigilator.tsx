import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, User, FileText, Star, Mic, UserMinus, Play } from 'lucide-react';
import { useSocket } from '../../hooks/use-socket';
import toast from 'react-hot-toast';

const StudentCard = ({ student, onEvaluate, onMarkAbsent, onSummon, variant = 'waiting' }: any) => {
  const [translateX, setTranslateX] = useState(0);
  const touchStart = useRef(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStart.current;
    if (diff < 0) { // Only swipe left
      setTranslateX(Math.max(diff, -100)); // Max swipe 100px
    }
  };
  
  const handleTouchEnd = () => {
    if (translateX < -70) {
      setTranslateX(-100); // Snap open to show action
    } else {
      setTranslateX(0); // Snap closed
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3 shadow-sm border border-slate-200 bg-rose-500">
      {/* Background Actions (Swipe to Reveal) */}
      <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center">
        <button 
          onClick={() => {
             setTranslateX(0);
             onMarkAbsent(student);
          }} 
          className="text-white flex flex-col items-center justify-center w-full h-full"
        >
          <UserMinus size={20} />
          <span className="text-[10px] font-bold mt-1 uppercase">Absent</span>
        </button>
      </div>

      {/* Foreground Draggable Card */}
      <button 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onEvaluate}
        style={{ transform: `translateX(${translateX}px)` }}
        className="w-full bg-white p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform duration-200 relative z-10"
      >
        <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
          {student.data?.imageURL ? (
            <img src={student.data.imageURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="text-indigo-300 w-6 h-6" />
          )}
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <h3 className="font-bold text-slate-800 text-base truncate">{student.data?.name || student.data?.fullName}</h3>
          <p className="text-slate-500 font-medium text-xs truncate">{student.data?.usn} • {student.data?.branch}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pointer-events-none z-20">
          {variant === 'waiting' && onSummon && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSummon(student);
              }}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors pointer-events-auto border border-emerald-200 shadow-sm"
              title="Summon Student"
            >
              🔔
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
            {variant === 'waiting' ? <Play size={14} className="ml-1" /> : <Star size={14} />}
          </div>
        </div>
      </button>
    </div>
  );
};

export default function InvigilatorPortal() {
  const { token } = useParams();
  const socket = useSocket();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Segmentation State
  const [activeTab, setActiveTab] = useState<'waiting' | 'inprogress' | 'evaluated'>('waiting');
  const [inProgressIds, setInProgressIds] = useState<string[]>([]);
  
  // Evaluation Modal State
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Voice Notes State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Dynamic Rubric State
  const defaultTraits = ['Communication', 'Technical Skills', 'Body Language', 'Eye Contact', 'Problem Solving', 'Cultural Fit'];
  const [evalName, setEvalName] = useState('');
  const [rubric, setRubric] = useState<{ trait: string; score: number }[]>([
    { trait: 'Communication', score: 5 },
    { trait: 'Technical Skills', score: 5 }
  ]);
  const [customTrait, setCustomTrait] = useState('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    fetchDashboard();
    
    // Initialize Speech Recognition if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setComments(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + finalTranscript);
        }
      };
      
      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = () => setIsRecording(false);
    }
  }, [token]);

  useEffect(() => {
    if (data?.driveDetails?._id) {
      socket.emit('join:drive', data.driveDetails._id);
      socket.on('drive:paused', (d: any) => setIsPaused(d.isPaused));
      return () => {
        socket.off('drive:paused');
      };
    }
  }, [data?.driveDetails?._id]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/invigilator/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setIsPaused(json.data.driveDetails?.isPaused || false);
      } else {
        toast.error(json.error || 'Failed to load room');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const addCustomTrait = () => {
    if (!customTrait.trim()) return;
    setRubric([...rubric, { trait: customTrait.trim(), score: 5 }]);
    setCustomTrait('');
  };

  const updateScore = (index: number, score: number) => {
    const newRubric = [...rubric];
    newRubric[index].score = score;
    setRubric(newRubric);
  };

  const removeTrait = (index: number) => {
    setRubric(rubric.filter((_, i) => i !== index));
  };
  
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Voice typing is not supported in this browser.');
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast.success("Voice recognition started. Speak now.", { icon: '🎙️' });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleEvaluate = async (decision: 'Pass' | 'Fail', studentObj = selectedStudent) => {
    if (!studentObj) return;
    if (decision !== 'Fail' && !evalName.trim()) { toast.error('Please enter your name as the evaluator'); return; }
    
    if (studentObj === selectedStudent && !confirm(`Are you sure you want to mark ${studentObj?.data?.name} as ${decision}? This cannot be undone.`)) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/invigilator/student/${studentObj._id}/evaluate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          evaluatorName: evalName || 'System',
          scores: studentObj === selectedStudent ? rubric : [],
          comments: studentObj === selectedStudent ? comments : (decision === 'Fail' ? 'Marked Absent' : ''),
          decision
        })
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success(`Student ${decision === 'Pass' ? 'Passed' : 'Failed/Absent'} Successfully!`);
        if (studentObj === selectedStudent) {
          setSelectedStudent(null);
          setComments('');
        }
        setInProgressIds(prev => prev.filter(id => id !== studentObj._id));
        fetchDashboard(); // Refresh lists
      } else {
        toast.error(json.error || 'Failed to submit evaluation');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSummon = (studentObj: any) => {
    socket.emit('invigilator:summon', { appId: studentObj._id, roomName: data.roomName });
    toast.success(`Sent summon notification to ${studentObj.data?.name?.split(' ')[0] || 'student'}!`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Invalid or Expired Link</div>;

  // Derive segmented lists
  const waitingList = data.waiting.filter((s: any) => !inProgressIds.includes(s._id));
  const inProgressList = data.waiting.filter((s: any) => inProgressIds.includes(s._id));

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* RESTRICTED ACCESS OVERLAY */}
      {isPaused && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
           <div className="bg-white/10 p-6 rounded-3xl border border-white/20 mb-6 shadow-2xl">
             <div className="text-6xl mb-4">🚦</div>
             <h1 className="text-2xl font-black text-white mb-2">Drive Operations Paused</h1>
             <p className="text-slate-300 font-medium text-sm">
               The administrator has temporarily halted the drive. All evaluations and scanning are currently disabled. Please wait for the drive to resume.
             </p>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-indigo-600 text-white p-6 pb-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
        <h1 className="text-2xl font-black relative z-10">{data.roomName}</h1>
        <p className="text-indigo-100 font-medium text-sm mt-1 relative z-10">{data.driveDetails?.companyName} • {data.round.replace('_', ' ').toUpperCase()}</p>
        
        <div className="mt-6">
          <label className="text-xs text-indigo-200 font-bold uppercase tracking-wider block mb-1">Your Name (Panelist)</label>
          <input 
            type="text" 
            placeholder="e.g. John Doe (HR)" 
            value={evalName}
            onChange={(e) => setEvalName(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-medium"
          />
        </div>
      </div>

      {/* Segmented Queue Tabs */}
      <div className="flex bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <button 
          onClick={() => setActiveTab('waiting')}
          className={`flex-1 py-4 text-xs tracking-wider font-extrabold uppercase transition-colors border-b-2 flex items-center justify-center gap-2 ${activeTab === 'waiting' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Waiting 
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'waiting' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{waitingList.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('inprogress')}
          className={`flex-1 py-4 text-xs tracking-wider font-extrabold uppercase transition-colors border-b-2 flex items-center justify-center gap-2 ${activeTab === 'inprogress' ? 'border-amber-500 text-amber-600 bg-amber-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Active
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'inprogress' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{inProgressList.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('evaluated')}
          className={`flex-1 py-4 text-xs tracking-wider font-extrabold uppercase transition-colors border-b-2 flex items-center justify-center gap-2 ${activeTab === 'evaluated' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Done
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'evaluated' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{data.evaluated.length}</span>
        </button>
      </div>

      <div className="p-4 max-w-lg mx-auto mt-2">
        {/* Waiting Tab */}
        {activeTab === 'waiting' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {waitingList.length === 0 ? (
              <div className="text-center p-8 bg-slate-100/50 rounded-2xl border border-slate-200 border-dashed text-slate-400 text-sm font-medium flex flex-col items-center">
                <CheckCircle size={32} className="mb-3 text-slate-300" />
                No students waiting.
              </div>
            ) : waitingList.map((student: any) => (
              <StudentCard 
                key={student._id} 
                student={student} 
                variant="waiting"
                onEvaluate={() => setInProgressIds([...inProgressIds, student._id])}
                onMarkAbsent={() => handleEvaluate('Fail', student)}
                onSummon={handleSummon}
              />
            ))}
          </div>
        )}

        {/* In Progress Tab */}
        {activeTab === 'inprogress' && (
          <div className="animate-in fade-in duration-300">
            {inProgressList.length === 0 ? (
              <div className="text-center p-8 bg-amber-50/50 rounded-2xl border border-amber-200/50 border-dashed text-amber-500/70 text-sm font-medium">
                No active interviews right now.
              </div>
            ) : inProgressList.map((student: any) => (
              <StudentCard 
                key={student._id} 
                student={student} 
                variant="inprogress"
                onEvaluate={() => setSelectedStudent(student)}
                onMarkAbsent={() => handleEvaluate('Fail', student)}
              />
            ))}
          </div>
        )}

        {/* Evaluated List */}
        {activeTab === 'evaluated' && (
          <div className="flex flex-col gap-2 opacity-90 animate-in fade-in slide-in-from-left-4 duration-300">
            {data.evaluated.length === 0 ? (
               <div className="text-center p-8 bg-slate-100/50 rounded-2xl border border-slate-200 border-dashed text-slate-400 text-sm font-medium flex flex-col items-center">
               <FileText size={32} className="mb-3 text-slate-300" />
               No evaluations posted yet.
             </div>
            ) : data.evaluated.map((student: any) => (
              <div key={student._id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {student.data?.imageURL ? (
                    <img src={student.data.imageURL} alt="Profile" className="w-full h-full object-cover grayscale opacity-80" />
                  ) : <User className="text-slate-400 w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{student.data?.name || student.data?.fullName}</h3>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">{student.data?.usn}</p>
                </div>
                {student.decision === 'Pass' ? (
                  <div className="flex flex-col items-end">
                    <span className="flex items-center gap-1 text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1.5 rounded-lg"><CheckCircle size={14}/> PASSED</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <span className="flex items-center gap-1 text-xs font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1.5 rounded-lg"><XCircle size={14}/> FAILED</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evaluation Modal / Slide-Up */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="h-[92vh] bg-slate-50 rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white rounded-t-3xl shadow-sm z-10">
              <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <Star className="text-yellow-500 fill-yellow-500" size={20} />
                Student Evaluation
              </h2>
              <button onClick={() => setSelectedStudent(null)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Student Context Card */}
              <div className="flex items-start gap-5 mb-8 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <div className="w-20 h-20 rounded-full bg-indigo-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden shrink-0 z-10">
                  {selectedStudent.data?.imageURL ? (
                    <img src={selectedStudent.data.imageURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : <User className="text-indigo-400 w-10 h-10" />}
                </div>
                <div className="flex-1 min-w-0 z-10 mt-1">
                  <h3 className="font-black text-2xl text-slate-800 mb-1">{selectedStudent.data?.name || selectedStudent.data?.fullName}</h3>
                  <p className="text-indigo-600 font-bold text-sm tracking-wide">{selectedStudent.data?.usn}</p>
                  <p className="text-slate-500 font-medium text-xs mt-1">{selectedStudent.data?.branch}</p>
                  
                  {selectedStudent.data?.resumeUrl && (
                    <a href={selectedStudent.data.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-4 py-2 rounded-xl transition-colors">
                      <FileText size={16} /> View Attached Resume
                    </a>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <h3 className="font-black text-slate-800 mb-5 text-sm uppercase tracking-widest flex items-center justify-between">
                  Grading Rubric
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-md">{rubric.length} TRAITS</span>
                </h3>
                
                {/* Dynamically Map the Rubric Sliders */}
                <div className="space-y-4">
                  {rubric.map((item, idx) => {
                    // Calculate gradient color based on score (1 = red, 5 = yellow, 10 = green)
                    const percent = (item.score - 1) / 9;
                    const hue = percent * 120; // 0 to 120 (Red to Green)
                    
                    return (
                      <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundColor: `hsl(${hue}, 80%, 50%)` }} />
                        
                        <div className="flex justify-between items-center mb-4 relative z-10">
                          <span className="font-bold text-slate-800 text-sm tracking-wide">{item.trait}</span>
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 flex items-baseline gap-1">
                               <span className="font-black text-xl" style={{ color: `hsl(${hue}, 70%, 45%)` }}>{item.score}</span>
                               <span className="text-slate-400 text-[10px] font-bold uppercase">/ 10</span>
                            </div>
                            <button onClick={() => removeTrait(idx)} className="text-slate-300 hover:text-rose-500 transition-colors p-2 -mr-2 bg-slate-50 hover:bg-rose-50 rounded-lg">
                              <XCircle size={16}/>
                            </button>
                          </div>
                        </div>
                        
                        <div className="relative z-10 pl-2 pr-2 pb-1">
                          <input 
                            type="range" 
                            min="1" max="10" 
                            value={item.score} 
                            onChange={(e) => updateScore(idx, parseInt(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                            style={{ 
                              background: `linear-gradient(to right, hsl(${hue}, 80%, 50%) ${percent * 100}%, #e2e8f0 ${percent * 100}%)`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-1">
                          <span className={item.score <= 3 ? "text-rose-500" : ""}>Needs Work</span>
                          <span className={item.score >= 8 ? "text-emerald-500" : ""}>Exceptional</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Custom Trait Input */}
                <div className="mt-5 flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. Eye Contact, Attire..."
                    value={customTrait}
                    onChange={(e) => setCustomTrait(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomTrait()}
                    list="defaultTraits"
                    className="flex-1 bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  />
                  <datalist id="defaultTraits">
                    {defaultTraits.map(t => <option key={t} value={t} />)}
                  </datalist>
                  <button 
                    onClick={addCustomTrait}
                    className="bg-slate-800 text-white px-5 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors whitespace-nowrap shadow-md shadow-slate-800/20 active:scale-95"
                  >
                    Add Custom
                  </button>
                </div>

                {/* Overall Comments */}
                <div className="mt-10 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-slate-800 text-sm tracking-wide">Overall Remarks</h3>
                    
                    <button 
                      onClick={toggleRecording}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isRecording ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <Mic size={14} className={isRecording ? "animate-bounce" : ""} />
                      {isRecording ? "Listening..." : "Dictate"}
                    </button>
                  </div>
                  
                  <textarea 
                    rows={4}
                    placeholder="Briefly explain your final decision..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className={`w-full bg-slate-50 border ${isRecording ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'} rounded-2xl p-4 text-sm font-medium outline-none transition-all placeholder:text-slate-400 resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* Verdict Action Footer */}
            <div className="p-5 border-t border-slate-200 bg-white flex gap-3 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] rounded-t-3xl">
              <button 
                onClick={() => handleEvaluate('Fail')} disabled={submitting}
                className="flex-[1] bg-rose-50 hover:bg-rose-100 text-rose-600 font-black py-4 border border-rose-100 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 active:scale-95"
              >
                {submitting ? <Loader2 size={24} className="animate-spin" /> : <XCircle size={24} />}
                <span className="text-[11px] tracking-widest uppercase mt-0.5">Mark Fail</span>
              </button>
              <button 
                onClick={() => handleEvaluate('Pass')} disabled={submitting}
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-xl shadow-emerald-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} />}
               <span className="text-[11px] tracking-widest uppercase mt-0.5">Approve & Advance</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
