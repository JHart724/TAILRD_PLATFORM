import React from 'react';
import PatientWorklist from '../components/care-team/PatientWorklist';
import ReferralTracker from '../components/care-team/ReferralTracker';

const CareTeamView: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Care Team Dashboard</h1>
          <p className="text-slate-600 mt-2">Patient Worklists & Referral Management</p>
        </div>
        
        <PatientWorklist />
        <ReferralTracker />
      </div>
    </div>
  );
};

export default CareTeamView;
