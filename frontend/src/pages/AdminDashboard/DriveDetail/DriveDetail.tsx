import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Play, Users, Map, Settings } from 'lucide-react';
import ShortlistTab from './ShortlistTab';
import GodViewTab from './GodViewTab';

export default function DriveDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('shortlist');

  return (
    <div className="flex flex-col h-full">
      {/* Header Area */}
      <div className="bg-card border border-border border-b-[3px] border-b-primary px-8 py-6 mb-6 rounded-xl shadow-md">
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <Link to="/admin" className="hover:text-primary transition-colors flex items-center">
            <ChevronLeft size={16} className="mr-1" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">TCS Placement Drive</h1>
              <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-semibold rounded-full border border-border">
                Draft
              </span>
            </div>
            <p className="text-muted-foreground">ID: {id} • Created Today</p>
          </div>
          
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-card border border-border text-foreground rounded-lg hover:bg-secondary font-medium transition-colors">
              Edit Details
            </button>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-bold transition-colors flex items-center shadow-[0_0_15px_rgba(var(--color-primary),0.3)]">
              <Play size={18} className="mr-2 fill-current" />
              Start Event Day
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button 
          onClick={() => setActiveTab('shortlist')}
          className={`px-6 py-3 font-medium text-sm flex items-center transition-colors border-b-2 ${activeTab === 'shortlist' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Users size={16} className="mr-2" />
          Shortlist (XLSX)
        </button>
        <button 
          onClick={() => setActiveTab('godview')}
          className={`px-6 py-3 font-medium text-sm flex items-center transition-colors border-b-2 ${activeTab === 'godview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Map size={16} className="mr-2" />
          Logistics (God View)
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-medium text-sm flex items-center transition-colors border-b-2 ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Settings size={16} className="mr-2" />
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'shortlist' && <ShortlistTab />}
        {activeTab === 'godview' && <GodViewTab />}
        {activeTab === 'settings' && <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">Settings panel coming soon.</div>}
      </div>
    </div>
  );
}
