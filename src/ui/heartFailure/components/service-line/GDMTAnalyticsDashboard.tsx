import React, { useState } from 'react';
import { Pill, Target, Heart, Stethoscope, TrendingUp, TrendingDown } from 'lucide-react';

const GDMTAnalyticsDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'pillars' | 'types' | 'providers'>('pillars');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="retina-card p-6">
        <h2 className="text-3xl font-bold text-steel-900 mb-2">GDMT Analytics Dashboard</h2>
        <p className="text-steel-600">Essential 4-pillar therapy optimization insights</p>
        
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveView('pillars')}
            className={`px-4 py-2 rounded-lg ${activeView === 'pillars' ? 'bg-medical-blue-500 text-white' : 'bg-steel-100 text-steel-700'}`}
          >
            By # of Pillars
          </button>
          <button
            onClick={() => setActiveView('types')}
            className={`px-4 py-2 rounded-lg ${activeView === 'types' ? 'bg-medical-blue-500 text-white' : 'bg-steel-100 text-steel-700'}`}
          >
            By HF Type
          </button>
          <button
            onClick={() => setActiveView('providers')}
            className={`px-4 py-2 rounded-lg ${activeView === 'providers' ? 'bg-medical-blue-500 text-white' : 'bg-steel-100 text-steel-700'}`}
          >
            By Provider
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="retina-card p-6">
        {activeView === 'pillars' && (
          <div>
            <h3 className="text-xl font-bold mb-4">GDMT by Number of Pillars</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[0, 1, 2, 3, 4].map(pillars => (
                <div key={pillars} className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-center mb-2">{pillars}</div>
                  <div className="text-sm text-center text-steel-600">Pillars</div>
                  <div className="text-lg font-bold text-center mt-2 text-medical-blue-600">
                    {pillars === 0 ? '7.1%' : pillars === 1 ? '19.8%' : pillars === 2 ? '31.9%' : pillars === 3 ? '27.3%' : '13.8%'}
                  </div>
                  <div className="text-xs text-center text-steel-500">of patients</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'types' && (
          <div>
            <h3 className="text-xl font-bold mb-4">GDMT by Heart Failure Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 border rounded-lg">
                <div className="text-2xl font-bold text-red-600 mb-2">HFrEF</div>
                <div className="space-y-2">
                  <div>847 patients</div>
                  <div>18.2% 4-pillar rate</div>
                  <div>2.4 avg pillars</div>
                </div>
              </div>
              <div className="p-6 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-2">HFpEF</div>
                <div className="space-y-2">
                  <div>298 patients</div>
                  <div>8.9% 4-pillar rate</div>
                  <div>1.8 avg pillars</div>
                </div>
              </div>
              <div className="p-6 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-2">HFmrEF</div>
                <div className="space-y-2">
                  <div>102 patients</div>
                  <div>12.1% 4-pillar rate</div>
                  <div>2.1 avg pillars</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'providers' && (
          <div>
            <h3 className="text-xl font-bold mb-4">GDMT by Provider Performance</h3>
            <div className="space-y-4">
              {[
                { name: 'Dr. Sarah Williams', specialty: 'Cardiology', score: 92.1, rate: 42.2, trend: 8.4 },
                { name: 'Dr. Michael Chen', specialty: 'Cardiology', score: 88.7, rate: 38.9, trend: 5.2 },
                { name: 'Dr. Jennifer Martinez', specialty: 'Internal Medicine', score: 67.3, rate: 18.5, trend: 12.1 },
              ].map((provider, index) => (
                <div key={index} className="p-4 border rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-bold">{provider.name}</div>
                    <div className="text-sm text-steel-600">{provider.specialty}</div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="text-lg font-bold text-medical-blue-600">{provider.score}</div>
                      <div className="text-xs text-steel-600">GDMT Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-600">{provider.rate}%</div>
                      <div className="text-xs text-steel-600">4-Pillar Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">+{provider.trend}%</div>
                      <div className="text-xs text-steel-600">Trend</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GDMTAnalyticsDashboard;