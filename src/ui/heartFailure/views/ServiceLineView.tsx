import React from 'react';
import GDMTByPhysicianTable from '../components/GDMTByPhysicianTable';
import DeviceFunnel from '../components/DeviceFunnel';
import EquityGapDashboard from '../components/EquityGapDashboard';
import PhenotypeDetectionChart from '../components/PhenotypeDetectionChart';

const ServiceLineView: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Service Line Dashboard</h1>
          <p className="text-slate-600 mt-2">GDMT Optimization & Device Pathways</p>
        </div>
        
        <GDMTByPhysicianTable data={[
          {
            physician_id: 'P001',
            physician_name: 'Dr. Smith',
            patients: 145,
            pct_quadruple: 65,
            pct_target_bb: 78,
            pct_sglt2i: 72,
            pct_arni: 58,
            pct_mra: 82
          },
          {
            physician_id: 'P002',
            physician_name: 'Dr. Johnson',
            patients: 132,
            pct_quadruple: 72,
            pct_target_bb: 85,
            pct_sglt2i: 80,
            pct_arni: 68,
            pct_mra: 88
          },
          {
            physician_id: 'P003',
            physician_name: 'Dr. Williams',
            patients: 98,
            pct_quadruple: 58,
            pct_target_bb: 70,
            pct_sglt2i: 65,
            pct_arni: 52,
            pct_mra: 75
          }
        ]} />
        
        <DeviceFunnel data={[
          {
            device_type: 'CRT-D',
            eligible: 342,
            referred: 245,
            completed: 156,
            median_days_referral: 28
          },
          {
            device_type: 'ICD',
            eligible: 289,
            referred: 198,
            completed: 142,
            median_days_referral: 21
          }
        ]} />
        
        <PhenotypeDetectionChart />
        
        <EquityGapDashboard data={{
          metric: 'GDMT Compliance',
          segment: 'race',
          stratified: [
            { group: 'White', value: 68, count: 245 },
            { group: 'Black', value: 54, count: 189 },
            { group: 'Hispanic', value: 61, count: 132 },
            { group: 'Asian', value: 72, count: 98 }
          ]
        }} segment="race" />
      </div>
    </div>
  );
};

export default ServiceLineView;
