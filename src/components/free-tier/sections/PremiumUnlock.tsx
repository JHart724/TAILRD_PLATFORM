import React from 'react';
import { Zap, BarChart3, Brain, Shield, ArrowRight } from 'lucide-react';

const PremiumUnlock: React.FC = () => {
  const features = [
    {
      icon: Zap,
      title: 'Real-time EHR Integration',
      description: 'Connect directly to your EHR for live data feeds and automated analytics',
    },
    {
      icon: Brain,
      title: 'AI-Powered Predictions',
      description: 'Machine learning models for readmission risk, LOS prediction, and resource optimization',
    },
    {
      icon: BarChart3,
      title: 'Custom Reporting',
      description: 'Build custom dashboards, automated reports, and board-ready presentations',
    },
    {
      icon: Shield,
      title: 'Full Module Access',
      description: 'Unlock all 6 clinical modules with Executive, Service Line, and Care Team views',
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-chrome-800 via-chrome-900 to-chrome-950 p-8 md:p-10">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-chrome-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-arterial-600 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
      </div>

      <div className="relative z-10">
        {/* Top section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 mb-4">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-body font-semibold text-amber-300 uppercase tracking-wider">Premium Platform</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2" style={{ color: '#ffffff', textShadow: '0 0 20px rgba(180,210,240,0.25), 0 1px 0 rgba(0,0,0,0.4)', fontWeight: 600, letterSpacing: '-0.3px' }}>
              Unlock the Full TAILRD Platform
            </h2>
            <p className="font-body max-w-lg" style={{ color: 'rgba(200,220,240,0.75)', fontSize: '13px', fontWeight: 400, lineHeight: 1.5 }}>
              Transform your cardiovascular service line with real-time analytics, AI predictions, and comprehensive clinical intelligence.
            </p>
          </div>
          <div className="flex-shrink-0">
            <button className="inline-flex items-center gap-2 px-8 py-3.5 text-white font-body font-bold text-base rounded-xl transition-all duration-200 hover:-translate-y-0.5" style={{ background: 'linear-gradient(145deg, #8C1F32 0%, #9B2438 40%, #7A1A2E 100%)', boxShadow: '0 1px 4px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.14) inset', border: 'none' }}>
              Schedule Demo
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-chrome-300" />
                </div>
                <h3 className="font-body font-semibold mb-1" style={{ color: 'rgba(200,220,240,0.65)', fontSize: '12px' }}>
                  {feature.title}
                </h3>
                <p className="font-body leading-relaxed" style={{ color: 'rgba(200,220,240,0.65)', fontSize: '12px' }}>
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PremiumUnlock;
