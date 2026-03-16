import React from 'react';
import { colors, clinicalColors, chartColors } from '../styles/colors';

const ColorTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-950 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient-teal mb-4">
            TAILRD Premium Web3 Color Palette
          </h1>
          <p className="text-neutral-400 text-lg">
            Production-ready premium color system for healthcare analytics
          </p>
        </div>

        {/* Solid Colors Section */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">Solid Colors</h2>
          
          {/* Green Scale */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-neutral-300 mb-4">Green Scale</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-400 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">green-400</span>
              </div>
              <div className="bg-green-600 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">green-600</span>
              </div>
              <div className="bg-green-800 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">green-800</span>
              </div>
              <div className="bg-green-900 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">green-900</span>
              </div>
            </div>
          </div>

          {/* Amber Scale */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-neutral-300 mb-4">Amber Scale</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-amber-400 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-black font-medium text-sm">amber-400</span>
              </div>
              <div className="bg-amber-600 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">amber-600</span>
              </div>
              <div className="bg-amber-800 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">amber-800</span>
              </div>
              <div className="bg-amber-900 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">amber-900</span>
              </div>
            </div>
          </div>

          {/* Gold Scale */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-neutral-300 mb-4">Gold Scale</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gold-400 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-black font-medium text-sm">gold-400</span>
              </div>
              <div className="bg-gold-600 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">gold-600</span>
              </div>
              <div className="bg-gold-800 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">gold-800</span>
              </div>
              <div className="bg-gold-900 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">gold-900</span>
              </div>
            </div>
          </div>

          {/* Teal Scale */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-neutral-300 mb-4">Teal Scale</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-teal-400 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-black font-medium text-sm">teal-400</span>
              </div>
              <div className="bg-teal-600 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">teal-600</span>
              </div>
              <div className="bg-teal-800 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">teal-800</span>
              </div>
              <div className="bg-teal-900 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">teal-900</span>
              </div>
            </div>
          </div>

          {/* Blue Scale */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-neutral-300 mb-4">Blue Scale</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-400 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">blue-400</span>
              </div>
              <div className="bg-blue-600 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">blue-600</span>
              </div>
              <div className="bg-blue-800 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">blue-800</span>
              </div>
              <div className="bg-blue-900 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">blue-900</span>
              </div>
            </div>
          </div>

          {/* Burgundy Scale */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-neutral-300 mb-4">Burgundy Scale</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-burgundy-800 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">burgundy-800</span>
              </div>
              <div className="bg-burgundy-900 h-24 rounded-lg flex items-end justify-center pb-3">
                <span className="text-white font-medium text-sm">burgundy-900</span>
              </div>
            </div>
          </div>
        </section>

        {/* Premium Gradients Section */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">Premium Gradients</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-premium-green h-32 rounded-xl premium-hover flex items-center justify-center">
              <span className="text-white font-bold text-lg">Premium Green</span>
            </div>
            <div className="bg-premium-amber h-32 rounded-xl premium-hover flex items-center justify-center">
              <span className="text-white font-bold text-lg">Premium Amber</span>
            </div>
            <div className="bg-premium-gold h-32 rounded-xl premium-hover flex items-center justify-center">
              <span className="text-white font-bold text-lg">Premium Gold</span>
            </div>
            <div className="bg-premium-teal h-32 rounded-xl premium-hover flex items-center justify-center">
              <span className="text-white font-bold text-lg">Premium Teal</span>
            </div>
            <div className="bg-premium-blue h-32 rounded-xl premium-hover flex items-center justify-center">
              <span className="text-white font-bold text-lg">Premium Blue</span>
            </div>
            <div className="bg-premium-burgundy h-32 rounded-xl premium-hover flex items-center justify-center">
              <span className="text-white font-bold text-lg">Premium Burgundy</span>
            </div>
          </div>
        </section>

        {/* Text Gradients Section */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">Text Gradients</h2>
          <div className="space-y-4">
            <div className="text-4xl font-bold text-gradient-green">Premium Green Text</div>
            <div className="text-4xl font-bold text-gradient-teal">Premium Teal Text</div>
            <div className="text-4xl font-bold text-gradient-blue">Premium Blue Text</div>
            <div className="text-4xl font-bold text-gradient-amber">Premium Amber Text</div>
            <div className="text-4xl font-bold text-gradient-gold">Premium Gold Text</div>
            <div className="text-4xl font-bold text-gradient-burgundy">Premium Burgundy Text</div>
          </div>
        </section>

        {/* Clinical Colors Section */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">Clinical Colors (Inline Styles)</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              className="h-20 rounded-lg flex items-center justify-center font-semibold text-white"
              style={{ backgroundColor: clinicalColors.success }}
            >
              Success: {clinicalColors.success}
            </div>
            <div 
              className="h-20 rounded-lg flex items-center justify-center font-semibold text-white"
              style={{ backgroundColor: clinicalColors.warning }}
            >
              Warning: {clinicalColors.warning}
            </div>
            <div 
              className="h-20 rounded-lg flex items-center justify-center font-semibold text-white"
              style={{ backgroundColor: clinicalColors.opportunity }}
            >
              Opportunity: {clinicalColors.opportunity}
            </div>
            <div 
              className="h-20 rounded-lg flex items-center justify-center font-semibold text-white"
              style={{ backgroundColor: clinicalColors.info }}
            >
              Info: {clinicalColors.info}
            </div>
            <div 
              className="h-20 rounded-lg flex items-center justify-center font-semibold text-white"
              style={{ backgroundColor: clinicalColors.critical }}
            >
              Critical: {clinicalColors.critical}
            </div>
            <div 
              className="h-20 rounded-lg flex items-center justify-center font-semibold text-white"
              style={{ backgroundColor: clinicalColors.secondary }}
            >
              Secondary: {clinicalColors.secondary}
            </div>
          </div>
        </section>

        {/* Chart Colors Preview */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">Chart Colors for Data Visualization</h2>
          <div className="flex flex-wrap gap-2">
            {chartColors.map((color, index) => (
              <div 
                key={index}
                className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: color }}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <p className="text-neutral-400 mt-4 text-sm">
            Optimized color sequence for charts and data visualization with proper contrast and accessibility
          </p>
        </section>

        {/* Interactive Elements */}
        <section>
          <h2 className="text-2xl font-semibold text-white mb-6">Interactive Elements</h2>
          <div className="space-y-4">
            <button className="bg-premium-teal premium-hover px-8 py-3 rounded-xl text-white font-semibold">
              Premium Teal Button
            </button>
            <button className="bg-premium-blue premium-hover px-8 py-3 rounded-xl text-white font-semibold">
              Premium Blue Button
            </button>
            <button className="bg-premium-green premium-hover px-8 py-3 rounded-xl text-white font-semibold">
              Premium Green Button
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pt-12 border-t border-neutral-800">
          <p className="text-neutral-500">
            TAILRD Premium Web3 Color Palette - Production Ready
          </p>
        </footer>

      </div>
    </div>
  );
};

export default ColorTest;