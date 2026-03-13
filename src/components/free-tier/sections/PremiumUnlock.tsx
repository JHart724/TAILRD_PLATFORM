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
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
              Unlock the Full TAILRD Platform
            </h2>
            <p className="text-chrome-300 font-body text-sm md:text-base max-w-lg">
              Transform your cardiovascular service line with real-time analytics, AI predictions, and comprehensive clinical intelligence.
            </p>
          </div>
          <div className="flex-shrink-0">
            <button className="inline-flex items-center gap-2 px-8 py-3.5 bg-arterial-600 hover:bg-arterial-700 text-white font-body font-bold text-base rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
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
                key={index}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-chrome-300" />
                </div>
                <h3 className="text-sm font-body font-semibold text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs font-body text-chrome-400 leading-relaxed">
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
