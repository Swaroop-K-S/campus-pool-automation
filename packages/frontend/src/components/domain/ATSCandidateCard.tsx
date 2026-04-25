import { Loader2, FileText, Sparkles } from 'lucide-react';
import type { IStudentProfile } from '@campuspool/shared';

export const ATSCandidateCard = ({ student }: { student: { parsedResume: IStudentProfile['parsedResume']; parsingStatus: IStudentProfile['parsingStatus']; data: any } }) => {
  const { parsedResume, parsingStatus, data } = student;

  if (parsingStatus === 'pending') {
    return (
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-center min-h-[100px] mb-8">
        <Loader2 className="animate-spin text-indigo-500 w-6 h-6 mr-3" />
        <span className="text-slate-500 font-medium text-sm">AI Agent is parsing resume...</span>
      </div>
    );
  }

  if (parsingStatus === 'failed' || !parsedResume) {
    if (!data?.resumeUrl) return null;
    return (
      <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 shadow-sm mb-8 text-center mt-4">
        <p className="text-rose-600 font-medium text-sm mb-3">AI parsing was unsuccessful or no structured resume found.</p>
        <a href={data.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200 px-4 py-2 rounded-xl transition-colors">
          <FileText size={16} /> View Original PDF
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8 mt-4">
      <div className="flex items-center justify-between mb-6">
         <h3 className="font-black text-slate-800 text-sm tracking-wide flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1 rounded-md"><Sparkles size={14} /></span> 
            AI Extracted Profile
         </h3>
         {data?.resumeUrl && (
            <a href={data.resumeUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm">
              <FileText size={14} /> Original
            </a>
         )}
      </div>

      {parsedResume.skills && parsedResume.skills.length > 0 && (
        <div className="mb-5">
           <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Verified Skills</p>
           <div className="flex flex-wrap gap-2">
              {parsedResume.skills.map((skill: string, i: number) => (
                <span key={i} className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs rounded-lg shadow-sm">{skill}</span>
              ))}
           </div>
        </div>
      )}

      {parsedResume.projects && parsedResume.projects.length > 0 && (
        <div className="mb-5">
           <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Key Projects</p>
           <div className="space-y-3">
              {parsedResume.projects.map((proj: any, i: number) => (
                <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                   <h4 className="font-bold text-slate-800 text-sm">{proj.title}</h4>
                   <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{proj.description}</p>
                   {proj.techStack && proj.techStack.length > 0 && (
                     <div className="flex flex-wrap gap-1.5 mt-3">
                        {proj.techStack.map((tech: string, j: number) => (
                          <span key={j} className="text-[10px] font-bold text-slate-500 bg-slate-200/50 border border-slate-200 px-2 py-0.5 rounded-md">{tech}</span>
                        ))}
                     </div>
                   )}
                </div>
              ))}
           </div>
        </div>
      )}

      {parsedResume.education && parsedResume.education.length > 0 && (
        <div>
           <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Education</p>
           <ul className="space-y-2">
              {parsedResume.education.map((edu: any, i: number) => (
                <li key={i} className="flex justify-between items-start text-sm bg-slate-50 border border-slate-100 rounded-xl p-3">
                   <div>
                     <p className="font-bold text-slate-800">{edu.degree}</p>
                     <p className="text-xs text-slate-500 mt-0.5">{edu.institution}</p>
                   </div>
                   <span className="text-[10px] font-black text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">{edu.year}</span>
                </li>
              ))}
           </ul>
        </div>
      )}
    </div>
  );
};
