import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';

export default function DriveWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const steps = [
    { id: 1, title: 'Company Details' },
    { id: 2, title: 'Registration Form' },
    { id: 3, title: 'Round Sequence' },
    { id: 4, title: 'Room Logistics' },
  ];

  const navigate = useNavigate();

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final Step: Create Drive and navigate to Logistics Control Panel
      try {
        const response = await fetch('/api/drives/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: "New Placement Drive",
            company_name: "TCS",
            package_lpa: 7.5,
            status: "draft"
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          navigate(`/admin/drives/${data._id || data.id}`);
        } else {
          // If backend isn't fully ready, fake redirect for UI flow
          navigate(`/admin/drives/draft-drive`);
        }
      } catch (error) {
        console.error("Failed to create drive:", error);
        navigate(`/admin/drives/draft-drive`);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Create New Placement Drive</h1>
        <p className="text-muted-foreground mt-2">Configure company details, rounds, and room logistics for the event day.</p>
      </div>

      {/* Stepper Header */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li key={step.title} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="flex items-center">
                  <div className={`
                    relative flex h-8 w-8 items-center justify-center rounded-full
                    ${currentStep > step.id ? 'bg-primary' : currentStep === step.id ? 'border-2 border-primary bg-card' : 'border-2 border-border bg-card'}
                  `}>
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                    ) : (
                      <span className={currentStep === step.id ? 'text-primary font-bold' : 'text-muted-foreground'}>
                        {step.id}
                      </span>
                    )}
                  </div>
                  {stepIdx !== steps.length - 1 ? (
                    <div className={`absolute top-4 left-8 -ml-px h-0.5 w-full bg-secondary ${currentStep > step.id ? 'bg-primary' : ''}`} />
                  ) : null}
                </div>
                <div className="absolute top-10 text-xs font-medium text-muted-foreground w-max -ml-4">
                  {step.title}
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Form Content Area */}
      <div className="bg-card rounded-xl shadow-md border border-border border-b-[3px] border-b-primary min-h-[400px] flex flex-col">
        <div className="p-8 flex-1">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Company Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Company Name</label>
                  <input type="text" className="w-full bg-background border border-border text-foreground rounded-md p-2 focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. Google" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Drive Date</label>
                  <input type="date" className="w-full bg-background border border-border text-foreground rounded-md p-2 focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Package Offered (LPA)</label>
                  <input type="text" className="w-full bg-background border border-border text-foreground rounded-md p-2 focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. 14.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Reporting Time</label>
                  <input type="time" className="w-full bg-background border border-border text-foreground rounded-md p-2 focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Locations (Comma separated)</label>
                  <input type="text" className="w-full bg-background border border-border text-foreground rounded-md p-2 focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. Bangalore, Hyderabad" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Registration Form</h2>
              <p className="text-muted-foreground">Configure when students can register.</p>
              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Start Date/Time</label>
                  <input type="datetime-local" className="w-full bg-background border border-border text-foreground rounded-md p-2 focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">End Date/Time</label>
                  <input type="datetime-local" className="w-full bg-background border border-border text-foreground rounded-md p-2 focus:ring-1 focus:ring-primary outline-none" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Round Sequence</h2>
              <p className="text-muted-foreground mb-6">Select and order the rounds for this drive.</p>
              
              <div className="space-y-3">
                {/* Mock Rounds for UI */}
                <div className="p-4 border border-border rounded-lg flex items-center justify-between bg-background">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold mr-4">1</div>
                    <span className="font-medium text-foreground">Pre-Placement Talk (Seminar)</span>
                  </div>
                </div>
                <div className="p-4 border border-border rounded-lg flex items-center justify-between bg-card">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold mr-4">2</div>
                    <span className="font-medium text-foreground">Online Aptitude Test</span>
                  </div>
                </div>
                <div className="p-4 border border-dashed border-border rounded-lg flex items-center justify-center bg-card cursor-pointer hover:bg-secondary/50 text-muted-foreground">
                  + Add Round
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-foreground">Room Logistics</h2>
              <p className="text-muted-foreground mb-6">Assign rooms for the selected rounds or upload an XLSX file with capacities.</p>
              
              <div className="border border-border rounded-lg p-8 text-center bg-background border-dashed">
                <div className="mx-auto w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </div>
                <p className="font-medium text-foreground">Upload Room Data (.xlsx)</p>
                <p className="text-sm text-muted-foreground mt-1">Include Room Name, Capacity, and Block</p>
                <button className="mt-4 px-4 py-2 border border-border text-foreground rounded-md bg-card hover:bg-secondary transition-colors">Select File</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-background p-6 border-t border-border rounded-b-xl flex justify-between mt-auto">
          <button 
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              currentStep === 1 
                ? 'bg-secondary/50 text-muted-foreground/50 cursor-not-allowed' 
                : 'bg-card border border-border text-foreground hover:bg-secondary'
            }`}
          >
            Back
          </button>
          
          <button 
            onClick={handleNext}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 transition-colors flex items-center shadow-[0_0_15px_rgba(var(--color-primary),0.3)]"
          >
            {currentStep === totalSteps ? 'Complete & Save' : 'Next Step'}
            {currentStep !== totalSteps && <ChevronRight size={18} className="ml-2" />}
          </button>
        </div>
      </div>
    </div>
  );
}
