import React, { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import CountUp from 'react-countup';
import TailrdLogo from './components/TailrdLogo';
import UserMenu from './components/UserMenu';
import { Heart, Activity, Zap, Stethoscope, GitBranch, CircuitBoard } from 'lucide-react';
import { ErrorBoundary } from './components/shared/ErrorFallback';
import { ToastContainer } from './components/shared/Toast';
import { errorHandler } from './utils/ErrorHandler';
import { AuthProvider } from './auth/AuthContext';

// Add custom animations for Web3Background effects
const customStyles = `
  @keyframes float {
    0%, 100% {
      transform: translateY(0px) rotate(45deg);
    }
    50% {
      transform: translateY(-30px) rotate(45deg);
    }
  }
  @keyframes pulse {
    0%, 100% {
      opacity: 0.2;
      transform: scale(1);
    }
    50% {
      opacity: 0.3;
      transform: scale(1.1);
    }
  }
  @keyframes shimmer {
    0% { background-position: 0% 0%; }
    50% { background-position: 100% 100%; }
    100% { background-position: 0% 0%; }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = customStyles;
  document.head.appendChild(styleSheet);
}

// Lazy load all modules
const Login = lazy(() => import("./components/Login"));
const Logout = lazy(() => import("./components/Logout"));
const ProtectedRoute = lazy(() => import("./auth/ProtectedRoute"));
const HFModule = lazy(() => import("./ui/heartFailure/HFModule"));
const EPModule = lazy(() => import("./ui/electrophysiology/EPModule"));
const StructuralHeartModule = lazy(() => import("./ui/structuralHeart/StructuralHeartModule"));
const CoronaryInterventionModule = lazy(() => import("./ui/coronaryIntervention/CoronaryInterventionModule"));
const ValvularDiseaseModule = lazy(() => import("./ui/valvularDisease/ValvularDiseaseModule"));
const PeripheralVascularModule = lazy(() => import("./ui/peripheralVascular/PeripheralVascularModule"));

// Core Types
type Role = "Executive" | "Service Line" | "Care Team";
type ModuleId = "hf" | "ep" | "structural" | "coronary" | "valvular" | "peripheral";
type ViewMode = "main" | "module" | "aggregate";
type IconComponent = () => JSX.Element;
type KpiVariant = "default" | "success" | "warning" | "danger" | "info";
type PatientPriority = "High" | "Medium" | "Low";
type PatientStatus = "Active" | "Review" | "Follow-up";
type PatientQueueVariant = "default" | "warning" | "danger" | "success";

interface Module {
  id: ModuleId;
  name: string;
  shortName: string;
  description: string;
  functional: boolean;
  patients: number;
  procedures: number;
  revenue: number;
  qualityScore: number;
  icon: IconComponent;
  features: string[];
}

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: IconComponent;
  variant?: KpiVariant;
  trend?: number;
  onClick?: () => void;
}

interface ModuleKpi extends KpiCardProps {
  variant: KpiVariant;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  physician: string;
  priority: PatientPriority;
  status: PatientStatus;
}

type ModuleKpiMap = Record<ModuleId, Record<Role, ModuleKpi[]>>;
type ModulePatients = Record<ModuleId, Patient[]>;

// Icons
const Icons = {
  Users: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197V9a3 3 0 00-6 0v12.01" />
    </svg>
  ),
  Dollar: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  Target: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Activity: () => (
    <svg className="h-8 w-8 text-medical-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Monitor: () => (
    <svg className="h-8 w-8 text-medical-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <g strokeWidth={2}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 21h8M12 16v5" />
        <path strokeLinecap="round" d="M7 10h10M7 12h8" />
      </g>
    </svg>
  ),
  Heart: () => (
    <svg className="h-8 w-8 text-medical-blue-800" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  Zap: () => (
    <svg className="h-8 w-8 text-medical-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  Valve: () => (
    <svg className="h-8 w-8 text-medical-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v10M7 12h10" />
      <circle cx="12" cy="12" r="3" strokeWidth={2} fill="currentColor" fillOpacity="0.3" />
    </svg>
  ),
  Coronary: () => (
    <svg className="h-8 w-8 text-medical-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <g strokeWidth={2}>
        <path d="M12 3v9M8 8l4 4 4-4" />
        <circle cx="8" cy="16" r="3" />
        <circle cx="16" cy="16" r="3" />
        <path d="M12 12v1c0 2-2 3-4 3M12 12v1c0 2 2 3 4 3" />
      </g>
    </svg>
  ),
  Peripheral: () => (
    <svg className="h-8 w-8 text-medical-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <g strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M12 2c0 0-4 2-4 6s4 6 4 6M12 2c0 0 4 2 4 6s-4 6-4 6M12 14c0 0-3 2-3 5s3 3 3 3M12 14c0 0 3 2 3 5s-3 3-3 3" />
      </g>
    </svg>
  ),
  ArrowRight: () => (
    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Settings: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Alert: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  Brain: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Chart: () => (
    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Database: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  DollarChart: () => (
    <svg className="h-8 w-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l3-3 3 3 5-5" />
    </svg>
  ),
  TrendingUp: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l3-3 3 3 5-5M21 12h-4M17 8l4 4-4 4" />
    </svg>
  ),
};

const formatMoney = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

const MODULES: Module[] = [
  {
    id: "hf",
    name: "Heart Failure",
    shortName: "HF",
    description: "Population screening to individual GDMT optimization across PCP-Cardiology continuum",
    functional: true,
    patients: 7700,
    procedures: 1784,
    revenue: 1609560,
    qualityScore: 94,
    icon: () => <Heart className="w-5 h-5" />,
    features: ["GDMT Analytics", "Specialty Screening", "Advanced Therapies", "340B Revenue"],
  },
  {
    id: "ep",
    name: "Electrophysiology",
    shortName: "EP",
    description: "Enhanced automated AFib screening to LAAC procedures with AI-powered risk assessment",
    functional: true,
    patients: 4312,
    procedures: 3684,
    revenue: 9500000,
    qualityScore: 97,
    icon: () => <Zap className="w-5 h-5" />,
    features: ["Automated LAAC Risk Screening", "Multi-patient Analytics", "2025 WATCHMAN Guidelines", "Enhanced Care Team Dashboard"],
  },
  {
    id: "structural",
    name: "Structural Heart",
    shortName: "Structural",
    description: "Population valve disease detection to complex transcatheter interventions",
    functional: true,
    patients: 2570,
    procedures: 312,
    revenue: 13500000,
    qualityScore: 96,
    icon: () => <Stethoscope className="w-5 h-5" />,
    features: ["TAVR Program", "TEER (MitraClip)", "Balloon Valvuloplasty", "ASD/PFO Closure"],
  },
  {
    id: "coronary",
    name: "Coronary Revascularization",
    shortName: "Coronary",
    description: "Population CAD screening to complex revascularization across PCP-Cardiology-Surgery",
    functional: true,
    patients: 16468,
    procedures: 9134,
    revenue: 8024880,
    qualityScore: 95,
    icon: () => <GitBranch className="w-5 h-5" />,
    features: ["Complex PCI/CTO", "Protected PCI (Impella)", "CABG Program", "SYNTAX Score Integration"],
  },
  {
    id: "valvular",
    name: "Valvular Surgery",
    shortName: "Valvular",
    description: "Enhanced surgical valve analytics with comprehensive forecasting and strategic initiatives",
    functional: true,
    patients: 1642,
    procedures: 234,
    revenue: 10240000,
    qualityScore: 96,
    icon: () => <CircuitBoard className="w-5 h-5" />,
    features: ["Surgical-Only Focus", "AI Market Forecasting", "Ross Procedure Excellence", "Advanced Analytics Dashboard"],
  },
  {
    id: "peripheral",
    name: "Peripheral Vascular",
    shortName: "Peripheral",
    description: "Comprehensive PAD and limb salvage programs with advanced wound care tracking",
    functional: true,
    patients: 3784,
    procedures: 3684,
    revenue: 2560000,
    qualityScore: 94,
    icon: () => <Activity className="w-5 h-5" />,
    features: ["94.3% Limb Salvage Rate", "WIfI Clinical Staging", "Device Performance Analytics", "Multi-tab Care Coordination"],
  },
];

const generateSamplePatients = (moduleId: ModuleId, count = 20): Patient[] => {
  const names = ["John Smith", "Jane Doe", "Maria Garcia", "David Johnson", "Sarah Wilson", "Michael Brown", "Lisa Davis"];
  const physicians = ["Dr. Rivera", "Dr. Chen", "Dr. Patel", "Dr. Lewis", "Dr. Ahmed", "Dr. Thompson"];
  const priorities: PatientPriority[] = ["High", "Medium", "Low"];
  const statuses: PatientStatus[] = ["Active", "Review", "Follow-up"];

  return Array.from({ length: count }, (_, i) => ({
    id: `${moduleId.toUpperCase()}${(i + 1).toString().padStart(4, "0")}`,
    name: names[Math.floor(Math.random() * names.length)],
    age: 50 + Math.floor(Math.random() * 40),
    physician: physicians[Math.floor(Math.random() * physicians.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
  }));
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, variant = "default", trend, onClick }) => {
  const getVariantColors = (variant: KpiVariant): string => {
    const variants: Record<KpiVariant, string> = {
      default: "bg-white border-steel-200",
      success: "bg-emerald-50 border-emerald-200 text-emerald-900",
      warning: "bg-amber-50 border-amber-200 text-amber-900",
      danger: "bg-rose-50 border-rose-200 text-rose-900",
      info: "bg-blue-50 border-blue-200 text-blue-900",
    };
    return variants[variant];
  };

  return (
    <div 
      className={`retina-card ${getVariantColors(variant)} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {Icon && (<div className="p-2 rounded-lg bg-slate-600 shadow-retina-1"><Icon /></div>)}
          <span className="text-sm font-semibold text-slate-300">{label}</span>
        </div>
        {trend !== undefined && (<div className={`text-xs font-semibold ${trend > 0 ? "text-medical-green-600" : "text-medical-red-600"}`}>{trend > 0 ? "↗" : "↘"} {Math.abs(trend)}%</div>)}
      </div>
      <div className="text-3xl font-bold text-slate-100 mb-1">{value}</div>
    </div>
  );
};

interface RoleToggleProps { value: Role; onChange: (role: Role) => void; }

const RoleToggle: React.FC<RoleToggleProps> = ({ value, onChange }) => {
  const roles: Array<{ id: Role; label: string; desc: string; color: string; }> = [
    { id: "Executive", label: "Executive", desc: "Financial & ROI", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
    { id: "Service Line", label: "Service Line", desc: "Operations", color: "text-amber-700 bg-amber-50 border-amber-200" },
    { id: "Care Team", label: "Care Team", desc: "Patient Care", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  ];

  return (
    <div className="flex gap-2 bg-white/80 rounded-xl p-2 border border-slate-200/70 backdrop-blur-sm shadow-lg">
      {roles.map((role) => (
        <button key={role.id} onClick={() => onChange(role.id)} className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${value === role.id ? `${role.color} shadow-sm transform scale-105` : "text-steel-700 hover:text-steel-900 hover:bg-steel-50"}`}>
          <div className="text-center">
            <div className="font-semibold">{role.label}</div>
            <div className="text-xs opacity-75">{role.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

interface ModuleTileProps { module: Module; onClick: () => void; }

const ModuleTile: React.FC<ModuleTileProps> = ({ module, onClick }) => {
  const Icon = module.icon;
  
  return (
    <button 
      onClick={onClick} 
      className="relative group cursor-pointer w-full h-full"
    >
      {/* Floating glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-br from-white/30 via-white/20 to-white/15 rounded-2xl blur opacity-0 group-hover:opacity-60 transition-all duration-500"></div>
      
      <div className="relative bg-white/60 backdrop-blur-lg border border-white/30 rounded-2xl p-6 shadow-lg shadow-white/10 transition-all duration-500 group-hover:bg-white/70 group-hover:backdrop-blur-xl group-hover:shadow-2xl group-hover:shadow-white/20 group-hover:scale-[1.03] group-hover:border-white/50 group-hover:-translate-y-1">
        {/* Enhanced shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative space-y-4">
          {/* Icon container - no blue background on hover */}
          <div className="w-fit">
            <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40 transition-all duration-500 group-hover:bg-white/70 group-hover:border-white/60 group-hover:shadow-lg">
              <Icon />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-800 transition-colors duration-300 group-hover:text-slate-900">{module.name}</h3>
            <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors duration-300">{module.description}</p>
          </div>
          
          {/* Arrow indicator */}
          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-2 group-hover:translate-x-0">
            <div className="p-2 rounded-lg bg-white/60 backdrop-blur-sm border border-white/40 shadow-lg">
              <Icons.ArrowRight />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

interface PatientQueueProps { title: string; patients: Patient[]; variant?: PatientQueueVariant; maxItems?: number; }

const PatientQueue: React.FC<PatientQueueProps> = ({ title, patients, variant = "default", maxItems = 6 }) => {
  const getVariantStyle = (variant: PatientQueueVariant): string => {
    switch (variant) {
      case "warning": return "bg-amber-50 border-amber-200";
      case "danger": return "bg-red-50 border-red-200";
      case "success": return "bg-emerald-50 border-emerald-200";
      default: return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="floating-screen p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-steel-900">{title}</h3>
        <span className="text-lg font-bold text-steel-600">{patients.length}</span>
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {patients.slice(0, maxItems).map((patient) => (
          <div key={patient.id} className={`flex items-center justify-between p-4 ${getVariantStyle(variant)} rounded-xl border transition-all hover:shadow-md`}>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">{patient.name}</div>
              <div className="text-sm text-slate-600">{patient.age}y • {patient.id} • {patient.physician}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs px-3 py-1.5 rounded-full bg-white/80 text-slate-700 font-medium">{patient.status}</div>
              <Icons.ArrowRight />
            </div>
          </div>
        ))}
        {patients.length > maxItems && (<div className="text-center py-4 text-sm text-slate-600">+{patients.length - maxItems} more patients</div>)}
      </div>
    </div>
  );
};

const getModuleKPIs = (moduleId: ModuleId, role: Role): ModuleKpi[] => {
  const kpiData: ModuleKpiMap = {
    hf: {
      Executive: [
        { label: "HF Revenue", value: formatMoney(804780), icon: Icons.Dollar, variant: "success", trend: 8.7 },
        { label: "GDMT Opportunity", value: formatMoney(2450000), icon: Icons.Target, variant: "warning", trend: 12.3 },
        { label: "Market Penetration", value: "67.2%", icon: Icons.Users, variant: "default", trend: 5.2 },
        { label: "Quality Bonus", value: formatMoney(125000), icon: Icons.Target, variant: "success", trend: 15.8 },
      ],
      "Service Line": [
        { label: "GDMT Compliance", value: "73.4%", icon: Icons.Target, variant: "warning", trend: 2.1 },
        { label: "Provider Variation", value: "18.2%", icon: Icons.Alert, variant: "danger", trend: -3.4 },
        { label: "Care Coordination", value: "89.1%", icon: Icons.Users, variant: "success", trend: 4.2 },
        { label: "Readmission Rate", value: "8.7%", icon: Icons.Activity, variant: "warning", trend: -2.8 },
      ],
      "Care Team": [
        { label: "Active Alerts", value: "47", icon: Icons.Alert, variant: "warning" },
        { label: "GDMT Gaps", value: "128", icon: Icons.Target, variant: "danger" },
        { label: "Phenotype Flags", value: "23", icon: Icons.Brain, variant: "info" },
        { label: "Panel Size", value: "247", icon: Icons.Users, variant: "default" },
      ],
    },
    ep: { Executive: [], "Service Line": [], "Care Team": [] },
    structural: { Executive: [], "Service Line": [], "Care Team": [] },
    coronary: { Executive: [], "Service Line": [], "Care Team": [] },
    valvular: { Executive: [], "Service Line": [], "Care Team": [] },
    peripheral: { Executive: [], "Service Line": [], "Care Team": [] },
  };
  return kpiData[moduleId]?.[role] ?? [];
};

function MainDashboard(): JSX.Element {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [activeModule, setActiveModule] = useState<ModuleId>("hf");
  const [moduleRole, setModuleRole] = useState<Role>("Executive");
  const [isLoading, setIsLoading] = useState(false);
  const [modulePatients] = useState<ModulePatients>(() => {
    const data = MODULES.reduce<ModulePatients>((acc, module) => {
      acc[module.id] = generateSamplePatients(module.id, 25);
      return acc;
    }, {} as ModulePatients);
    return data;
  });

  const totalMetrics = useMemo(() => {
    const totals = MODULES.reduce((acc, module) => ({
      patients: acc.patients + module.patients,
      procedures: acc.procedures + module.procedures,
      revenue: acc.revenue + module.revenue,
    }), { patients: 0, procedures: 0, revenue: 0 });
    const avgQuality = MODULES.reduce((sum, m) => sum + m.qualityScore, 0) / MODULES.length;
    return {
      totalPatients: totals.patients,
      totalProcedures: totals.procedures,
      totalRevenue: totals.revenue,
      avgQuality: Math.round(avgQuality),
      functionalModules: MODULES.filter((m) => m.functional).length,
    };
  }, []);

  const openModule = useCallback(async (moduleId: ModuleId) => {
    setIsLoading(true);
    // Add a delay to show loading animation for analytics processing
    await new Promise(resolve => setTimeout(resolve, 800));
    
    switch (moduleId) {
      case "hf":
        navigate("/hf");
        break;
      case "ep":
        navigate("/ep");
        break;
      case "structural":
        navigate("/structural");
        break;
      case "coronary":
        navigate("/coronary");
        break;
      case "valvular":
        navigate("/valvular");
        break;
      case "peripheral":
        navigate("/peripheral");
        break;
      default:
        setActiveModule(moduleId);
        setViewMode("module");
    }
    setIsLoading(false);
  }, [navigate]);

  const backToMain = useCallback(() => { setViewMode("main"); }, []);
  const [aggregateView, setAggregateView] = useState<'executive' | 'service-line'>('executive');

  if (viewMode === "main") {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(150, 175, 200, 1) 0%, rgba(197, 217, 232, 1) 30%, rgba(224, 235, 245, 1) 60%, rgba(240, 245, 250, 1) 100%)'
      }}>
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, rgba(150, 175, 200, 1) 0%, rgba(197, 217, 232, 1) 30%, rgba(224, 235, 245, 1) 60%, rgba(240, 245, 250, 1) 100%)'
          }}>
            <div className="text-center">
              {/* Loading animation */}
              <div className="mb-8">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-white/40 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-white/80 rounded-full border-t-transparent animate-spin"></div>
                </div>
              </div>
              
              {/* Brand */}
              <div className="mb-2">
                <TailrdLogo size="medium" variant="light" />
              </div>
              
              {/* Loading message */}
              <p className="text-lg text-white font-light mb-4" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)' }}>Processing Analytics...</p>
              
              {/* Animated dots */}
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-white/90 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
              </div>
              
              {/* Subtitle */}
              <p className="text-sm text-white mt-6" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)' }}>
                Population • Panel • Patient Analytics
              </p>
            </div>
          </div>
        )}
        
        {/* Web3Background-style floating particles and patterns */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Glassmorphic overlays matching Web3Background */}
          <div 
            className="absolute top-20 left-20 w-96 h-96 rounded-full opacity-40 blur-3xl animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(240, 245, 250, 0.8) 0%, rgba(197, 217, 232, 0.5) 50%, transparent 70%)',
              animation: 'pulse 8s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-45 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.7) 0%, rgba(240, 245, 250, 0.4) 50%, transparent 70%)',
              animation: 'pulse 10s ease-in-out infinite reverse'
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full opacity-35 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(197, 217, 232, 0.7) 0%, rgba(224, 235, 245, 0.5) 50%, transparent 70%)',
              animation: 'pulse 12s ease-in-out infinite',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>

        {/* Geometric floating shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-white/60 rounded-lg backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(240, 245, 250, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
              boxShadow: '0 0 50px rgba(240, 245, 250, 0.6), inset 0 0 25px rgba(255, 255, 255, 0.3)',
              animation: 'float 20s ease-in-out infinite',
              transform: 'rotate(45deg)'
            }}
          />
          <div 
            className="absolute top-1/2 right-1/3 w-24 h-24 border-2 border-white/50 rounded-full backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(224, 235, 245, 0.2) 100%)',
              boxShadow: '0 0 40px rgba(255, 255, 255, 0.5), inset 0 0 20px rgba(240, 245, 250, 0.35)',
              animation: 'float 15s ease-in-out infinite reverse'
            }}
          />
          <div 
            className="absolute bottom-1/4 left-1/2 w-40 h-40 border-2 border-white/55 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(224, 235, 245, 0.25) 0%, rgba(197, 217, 232, 0.18) 100%)',
              boxShadow: '0 0 60px rgba(224, 235, 245, 0.7), inset 0 0 30px rgba(255, 255, 255, 0.25)',
              animation: 'float 18s ease-in-out infinite',
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
            }}
          />
        </div>
        
        <div className="relative z-10 min-h-screen p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Clean Professional Medical Header */}
            <div className="flex items-center justify-between">
              <div>
                <TailrdLogo size="large" variant="light" className="mb-3" />
                <p className="text-lg text-slate-600 font-light">Precision Cardiovascular Care Platform</p>
              </div>
              <div className="flex items-center gap-4">
                <UserMenu 
                  userName="Dr. Sarah Williams"
                  userRole="Cardiology Director"
                  userEmail="sarah.williams@hospital.com"
                />
              </div>
            </div>
            
            {/* Cardiovascular Service Line - Slightly darker than modules */}
            <div className="flex justify-center mb-8">
              <button 
                onClick={async () => {
                  setIsLoading(true);
                  // Add delay to show loading animation for comprehensive analytics
                  await new Promise(resolve => setTimeout(resolve, 1200));
                  setViewMode('aggregate');
                  setIsLoading(false);
                }}
                className="relative group"
              >
                {/* Subtle glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/15 to-white/10 rounded-3xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                
                <div className="relative px-12 py-6 bg-gradient-to-br from-white/70 via-white/80 to-white/70 text-slate-700 rounded-2xl backdrop-blur-xl border border-white/40 shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:scale-[1.02] group-hover:from-white/80 group-hover:via-white/90 group-hover:to-white/80">
                  {/* Subtle shine */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-medical-green-100 border border-medical-green-200">
                      <Icons.Chart />
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-medium">Cardiovascular Service Line</div>
                      <div className="text-sm opacity-80 font-light">Population • Panel • Patient - PCP to Specialty Care</div>
                    </div>
                    <Icons.ArrowRight />
                  </div>
                </div>
              </button>
            </div>
            
            {/* Clinical Modules */}
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-6">Clinical Modules</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MODULES.map((module) => (<ModuleTile key={module.id} module={module} onClick={() => openModule(module.id)} />))}
              </div>
              
              {/* Last Updated Info - Bottom Right */}
              <div className="flex justify-end mt-8">
                <div className="bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-4 shadow-lg shadow-blue-200/10">
                  <div className="text-xs text-blue-600 mb-1 font-medium">Last Updated</div>
                  <div className="text-lg font-medium text-slate-700">{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Comprehensive Cardiovascular Service Line Dashboard
  if (viewMode === "aggregate") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100 relative overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100 z-[100] flex items-center justify-center">
            <div className="text-center">
              {/* Loading animation */}
              <div className="mb-8">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
              </div>
              
              {/* Brand */}
              <div className="mb-2">
                <TailrdLogo size="medium" variant="light" />
              </div>
              
              {/* Loading message */}
              <p className="text-lg text-slate-600 font-light mb-4">Processing Service Line Analytics...</p>
              
              {/* Animated dots */}
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
              </div>
              
              {/* Subtitle */}
              <p className="text-sm text-slate-600 mt-6">
                Population • Panel • Patient Analytics
              </p>
            </div>
          </div>
        )}
        
        {/* Background effects */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, #1e40af 2px, transparent 2px), radial-gradient(circle at 70% 80%, #0ea5e9 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-slate-600/5"></div>
        
        <div className="relative z-10 min-h-screen p-6 overflow-y-auto">
          <div className="max-w-[120rem] mx-auto space-y-6">
            {/* Compact Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={backToMain}
                  className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-white/80 border border-blue-200/50 hover:from-blue-200 hover:to-blue-50 transition-all duration-300"
                >
                  <Icons.ArrowLeft />
                </button>
                <div>
                  <TailrdLogo size="medium" variant="light" />
                  <h2 className="text-xl font-medium text-slate-800 mb-2">Precision Cardiovascular Care Platform</h2>
                  <p className="text-slate-600 font-light mb-3">Comprehensive Service Line Analytics Dashboard</p>
                  
                  {/* Enhanced Analytics Framework Display */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg px-3 py-2 border border-blue-200/50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="font-medium text-slate-700">Population</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="font-medium text-slate-700">Panel</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="font-medium text-slate-700">Patient</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg px-3 py-2 border border-emerald-200/50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                          <span className="font-medium text-slate-700">PCP</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          <span className="font-medium text-slate-700">Cardiology</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                          <span className="font-medium text-slate-700">Hospital</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="bg-gradient-to-br from-blue-50/80 to-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-3">
                  <div className="text-xs text-blue-600 font-medium">Real-time Data</div>
                  <div className="text-sm font-medium text-slate-800">{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            {/* Real-Time Operational Status */}
            <div className="bg-gradient-to-br from-emerald-50/60 via-white/70 to-emerald-50/60 backdrop-blur-sm border border-emerald-200/40 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-semibold text-emerald-800">All Systems Operational</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    Data Current: {new Date().toLocaleTimeString()} EST
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-slate-700">EHR: Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-slate-700">Analytics: Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-slate-700">Monitoring: 24/7</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50/60 via-white/70 to-blue-50/60 backdrop-blur-sm border border-blue-200/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50">
                    <Icons.Users />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{totalMetrics.totalPatients.toLocaleString()}</div>
                    <div className="text-sm text-slate-600">Active Patients</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-50/60 via-white/70 to-slate-50/60 backdrop-blur-sm border border-slate-200/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50">
                    <Icons.Activity />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{totalMetrics.totalProcedures.toLocaleString()}</div>
                    <div className="text-sm text-slate-600">Annual Procedures</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50/60 via-white/70 to-blue-50/60 backdrop-blur-sm border border-blue-200/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50">
                    <Icons.Dollar />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{formatMoney(totalMetrics.totalRevenue)}</div>
                    <div className="text-sm text-slate-600">Total Revenue</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-50/60 via-white/70 to-slate-50/60 backdrop-blur-sm border border-slate-200/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50">
                    <Icons.Target />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">4.8/5.0</div>
                    <div className="text-sm text-slate-600">CMS Star Rating</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quality & Safety Alerts + Capacity Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quality & Safety Alerts */}
              <div className="bg-gradient-to-br from-blue-50/60 via-white/70 to-blue-50/60 backdrop-blur-sm border border-blue-200/40 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Icons.Alert />
                    Quality & Safety Dashboard
                  </h3>
                  <div className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                    All Clear
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-slate-800">CMS Quality Metrics</div>
                        <div className="text-sm text-slate-600">All targets achieved</div>
                      </div>
                    </div>
                    <div className="text-emerald-600 font-semibold">98.2%</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-200/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-slate-800">30-Day Readmissions</div>
                        <div className="text-sm text-slate-600">Below national average</div>
                      </div>
                    </div>
                    <div className="text-blue-600 font-semibold">8.7%</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50/50 rounded-lg border border-purple-200/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-slate-800">Safety Events</div>
                        <div className="text-sm text-slate-600">Zero preventable events</div>
                      </div>
                    </div>
                    <div className="text-purple-600 font-semibold">0</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-medical-amber-50/50 rounded-lg border border-medical-amber-200/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-medical-amber-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-slate-800">Patient Satisfaction</div>
                        <div className="text-sm text-slate-600">HCAHPS top quartile</div>
                      </div>
                    </div>
                    <div className="text-medical-amber-600 font-semibold">92%</div>
                  </div>
                </div>
              </div>
              
              {/* Capacity & Utilization */}
              <div className="bg-gradient-to-br from-slate-50/60 via-white/70 to-slate-50/60 backdrop-blur-sm border border-slate-200/40 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Icons.Activity />
                    Capacity & Utilization
                  </h3>
                  <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    Real-time
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Cath Lab Utilization</span>
                      <span className="text-sm font-semibold text-slate-900">78%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: '78%' }}></div>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">3 labs active, 1 available</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">OR Utilization</span>
                      <span className="text-sm font-semibold text-slate-900">85%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: '85%' }}></div>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">2 cardiac ORs in use</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Provider Availability</span>
                      <span className="text-sm font-semibold text-slate-900">12/15</span>
                    </div>
                    <div className="text-xs text-slate-600">Available today across all services</div>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-200/50">
                    <div className="text-sm font-medium text-slate-700 mb-2">Next Available Appointments</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>EP: <span className="font-semibold">2 days</span></div>
                      <div>Cath: <span className="font-semibold">1 day</span></div>
                      <div>Surgery: <span className="font-semibold">5 days</span></div>
                      <div>Echo: <span className="font-semibold">Same day</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Data Sources & Care Continuum Integration */}
            <div className="bg-gradient-to-br from-emerald-50/60 via-white/70 to-emerald-50/60 backdrop-blur-sm border border-emerald-200/40 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-slate-800 flex items-center gap-3">
                  <Icons.Database />
                  <span>Precision Cardiovascular Care Platform</span>
                </h3>
                <div className="text-sm font-medium text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  Population • Panel • Patient Analytics
                </div>
              </div>
              
              {/* Three-Tier Analytics Framework */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-200/50">
                  <h4 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    Population Analytics
                  </h4>
                  <div className="text-2xl font-bold text-blue-700 mb-2">
                    <CountUp start={0} end={127834} duration={1.5} separator="," useEasing={true} /> patients
                  </div>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>• EHR population health screening</li>
                    <li>• Health plan risk stratification</li>
                    <li>• Community health assessments</li>
                    <li>• Social determinants integration</li>
                  </ul>
                </div>
                
                <div className="bg-purple-50/70 rounded-xl p-4 border border-purple-200/50">
                  <h4 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    Panel Analytics
                  </h4>
                  <div className="text-2xl font-bold text-purple-700 mb-2">
                    <CountUp start={0} end={112} duration={1.2} useEasing={true} /> providers
                  </div>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>• Provider panel optimization</li>
                    <li>• Care gap identification</li>
                    <li>• Practice performance metrics</li>
                    <li>• Quality measure tracking</li>
                  </ul>
                </div>
                
                <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200/50">
                  <h4 className="text-lg font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    Patient Analytics
                  </h4>
                  <div className="text-2xl font-bold text-emerald-700 mb-2">
                    Individual-level insights
                  </div>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li>• Personalized risk assessment</li>
                    <li>• Treatment optimization</li>
                    <li>• Outcomes prediction</li>
                    <li>• Care pathway guidance</li>
                  </ul>
                </div>
              </div>
              
              {/* Care Continuum Integration */}
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 border border-blue-200/50">
                <h4 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Icons.Heart />
                  Care Continuum Integration: PCP • Cardiology • Hospital
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                      <span className="font-semibold text-emerald-800">Primary Care (<CountUp start={0} end={89} duration={1.0} useEasing={true} /> providers)</span>
                    </div>
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>• Family medicine practices</li>
                      <li>• Internal medicine groups</li>
                      <li>• Geriatric medicine panels</li>
                      <li>• Population health screening</li>
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      <span className="font-semibold text-blue-800">Cardiology (<CountUp start={0} end={23} duration={0.8} useEasing={true} /> specialists)</span>
                    </div>
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>• General cardiology clinics</li>
                      <li>• Heart failure specialists</li>
                      <li>• Preventive cardiology</li>
                      <li>• Subspecialty services</li>
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                      <span className="font-semibold text-red-800">Hospital System (<CountUp start={0} end={6} duration={0.6} useEasing={true} /> facilities)</span>
                    </div>
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>• Inpatient admissions</li>
                      <li>• Cath lab procedures</li>
                      <li>• Surgical interventions</li>
                      <li>• Emergency departments</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics Methodology */}
            <div className="bg-gradient-to-br from-blue-50/60 via-white/70 to-blue-50/60 backdrop-blur-sm border border-blue-200/40 rounded-xl p-4">
              <h3 className="text-lg font-medium text-slate-800 mb-3 flex items-center gap-2">
                <Icons.Brain />
                <span>Clinical Performance Framework</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-slate-700 mb-1">CMS Quality Measures</div>
                  <div className="text-slate-600">• AMI-7a: 30-day mortality<br/>• HF-1: Discharge instructions<br/>• PC-01: Elective delivery</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 mb-1">Professional Standards</div>
                  <div className="text-slate-600">• ACC/AHA Class I recommendations<br/>• ESC evidence level A<br/>• SCAI consensus statements</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 mb-1">National Registries</div>
                  <div className="text-slate-600">• STS Adult Cardiac Surgery DB<br/>• NCDR CathPCI Registry<br/>• TVT Registry (Edwards/Medtronic)</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 mb-1">Risk-Adjusted Outcomes</div>
                  <div className="text-slate-600">• O/E mortality ratios<br/>• AHRQ safety indicators<br/>• Leapfrog safety grades</div>
                </div>
              </div>
            </div>
            
            {/* Patient Flow Intelligence Dashboard */}
            <div className="bg-gradient-to-br from-violet-50/60 via-white/70 to-violet-50/60 backdrop-blur-sm border border-violet-200/40 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-slate-800 flex items-center gap-3">
                  <Icons.Activity />
                  <span>Patient Flow Intelligence</span>
                </h3>
                <div className="text-sm font-medium text-violet-700 bg-violet-100 px-3 py-1 rounded-full">
                  Real-time Throughput
                </div>
              </div>
              
              {/* Current Flow Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/70 rounded-xl p-4 border border-violet-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-violet-800">ED to Cath Lab</div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-2xl font-bold text-violet-700 mb-1">
                    <CountUp start={0} end={67} duration={1.2} useEasing={true} /> min
                  </div>
                  <div className="text-xs text-slate-600">Target: 90 min • -23 min vs target</div>
                </div>
                
                <div className="bg-white/70 rounded-xl p-4 border border-violet-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-violet-800">Bed Turnover</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-2xl font-bold text-violet-700 mb-1">
                    <CountUp start={0} end={142} duration={1.0} useEasing={true} /> min
                  </div>
                  <div className="text-xs text-slate-600">Average today • 12% improvement vs yesterday</div>
                </div>
                
                <div className="bg-white/70 rounded-xl p-4 border border-violet-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-violet-800">Discharge Process</div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-2xl font-bold text-violet-700 mb-1">
                    <CountUp start={0} end={3.2} decimals={1} duration={1.0} useEasing={true} /> hrs
                  </div>
                  <div className="text-xs text-slate-600">Avg from decision to discharge • +0.3 hrs vs target</div>
                </div>
                
                <div className="bg-white/70 rounded-xl p-4 border border-violet-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-violet-800">OR Utilization</div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-2xl font-bold text-violet-700 mb-1">
                    <CountUp start={0} end={87} duration={1.0} useEasing={true} />%
                  </div>
                  <div className="text-xs text-slate-600">Current shift • 13 of 15 rooms active</div>
                </div>
              </div>
              
              {/* Flow Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/70 rounded-xl p-4 border border-violet-200/50">
                  <h4 className="text-lg font-semibold text-violet-800 mb-3">Current Bottlenecks</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-red-50/70 rounded-lg border-l-4 border-red-400">
                      <div>
                        <div className="font-medium text-red-800">ICU Capacity</div>
                        <div className="text-sm text-red-600">23 of 24 beds occupied • 2 pending transfers</div>
                      </div>
                      <div className="text-red-600 font-bold">96%</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-yellow-50/70 rounded-lg border-l-4 border-yellow-400">
                      <div>
                        <div className="font-medium text-yellow-800">Transport Delays</div>
                        <div className="text-sm text-yellow-600">3 patients waiting &gt;30 min for transport</div>
                      </div>
                      <div className="text-yellow-600 font-bold">47 min</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50/70 rounded-lg border-l-4 border-blue-400">
                      <div>
                        <div className="font-medium text-blue-800">Lab Processing</div>
                        <div className="text-sm text-blue-600">Cardiac enzymes: 15 min avg TAT today</div>
                      </div>
                      <div className="text-blue-600 font-bold">15 min</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/70 rounded-xl p-4 border border-violet-200/50">
                  <h4 className="text-lg font-semibold text-violet-800 mb-3">Optimization Opportunities</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-green-50/70 rounded-lg border-l-4 border-green-400">
                      <div>
                        <div className="font-medium text-green-800">Pre-procedure Prep</div>
                        <div className="text-sm text-green-600">Reduce prep time by 12 min via checklist optimization</div>
                      </div>
                      <div className="text-green-600 font-bold">-12 min</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-emerald-50/70 rounded-lg border-l-4 border-emerald-400">
                      <div>
                        <div className="font-medium text-emerald-800">Discharge Planning</div>
                        <div className="text-sm text-emerald-600">Earlier social work consults could save 0.8 hrs</div>
                      </div>
                      <div className="text-emerald-600 font-bold">-48 min</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-teal-50/70 rounded-lg border-l-4 border-teal-400">
                      <div>
                        <div className="font-medium text-teal-800">Scheduling Efficiency</div>
                        <div className="text-sm text-teal-600">Block scheduling could increase utilization 8%</div>
                      </div>
                      <div className="text-teal-600 font-bold">+8%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Predictive Analytics Dashboard */}
            <div className="bg-gradient-to-br from-amber-50/60 via-white/70 to-amber-50/60 backdrop-blur-sm border border-amber-200/40 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-slate-800 flex items-center gap-3">
                  <Icons.TrendingUp />
                  <span>Predictive Analytics & Risk Assessment</span>
                </h3>
                <div className="text-sm font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                  AI-Powered Insights
                </div>
              </div>
              
              {/* Risk Predictions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-white/70 rounded-xl p-4 border border-amber-200/50">
                  <h4 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    High Risk Alerts (Next 48h)
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-red-50/70 rounded-lg">
                      <div>
                        <div className="font-medium text-red-800">Readmission Risk</div>
                        <div className="text-sm text-red-600">14 patients &gt;80% probability</div>
                      </div>
                      <div className="text-red-600 font-bold">14</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-50/70 rounded-lg">
                      <div>
                        <div className="font-medium text-orange-800">Cardiac Event Risk</div>
                        <div className="text-sm text-orange-600">8 patients requiring intervention</div>
                      </div>
                      <div className="text-orange-600 font-bold">8</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-yellow-50/70 rounded-lg">
                      <div>
                        <div className="font-medium text-yellow-800">Medication Non-adherence</div>
                        <div className="text-sm text-yellow-600">23 patients flagged by ML model</div>
                      </div>
                      <div className="text-yellow-600 font-bold">23</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/70 rounded-xl p-4 border border-amber-200/50">
                  <h4 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    Capacity Forecasting
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-blue-50/70 rounded-lg">
                      <div>
                        <div className="font-medium text-blue-800">Cath Lab Demand</div>
                        <div className="text-sm text-blue-600">Peak at 2:30 PM (+3 cases predicted)</div>
                      </div>
                      <div className="text-blue-600 font-bold">+18%</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-teal-50/70 rounded-lg">
                      <div>
                        <div className="font-medium text-teal-800">ICU Beds Needed</div>
                        <div className="text-sm text-teal-600">Evening: 26 of 24 beds (surge plan)</div>
                      </div>
                      <div className="text-teal-600 font-bold">108%</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-indigo-50/70 rounded-lg">
                      <div>
                        <div className="font-medium text-indigo-800">Staffing Optimization</div>
                        <div className="text-sm text-indigo-600">+2 RNs recommended night shift</div>
                      </div>
                      <div className="text-indigo-600 font-bold">+2</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/70 rounded-xl p-4 border border-amber-200/50">
                  <h4 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Quality Predictions
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-green-50/70 rounded-lg">
                      <div>
                        <div className="font-medium text-green-800">Door-to-Balloon</div>
                        <div className="text-sm text-green-600">97% cases will meet &lt;90min target</div>
                      </div>
                      <div className="text-green-600 font-bold">97%</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-emerald-50/70 rounded-lg">
                      <div>
                        <div className="font-medium text-emerald-800">Infection Risk</div>
                        <div className="text-sm text-emerald-600">3 procedures flagged high risk</div>
                      </div>
                      <div className="text-emerald-600 font-bold">0.8%</div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-teal-50/70 rounded-lg">
                      <div>
                        <div className="font-medium text-teal-800">Length of Stay</div>
                        <div className="text-sm text-teal-600">Avg 0.3 days below benchmark</div>
                      </div>
                      <div className="text-teal-600 font-bold">-0.3d</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* AI Insights & Recommendations */}
              <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/70 rounded-xl p-4 border border-amber-200/50">
                <h4 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Icons.Zap />
                  AI-Generated Recommendations
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                      <span className="font-semibold text-purple-800">Clinical Decision Support</span>
                    </div>
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>• Consider early discharge for 12 stable HF patients</li>
                      <li>• Initiate GDMT optimization for 8 underutilized patients</li>
                      <li>• Schedule 6 high-risk patients for remote monitoring</li>
                      <li>• Flag 4 patients for pharmacist medication review</li>
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                      <span className="font-semibold text-indigo-800">Operational Optimization</span>
                    </div>
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>• Shift 3 elective procedures to avoid peak hours</li>
                      <li>• Deploy mobile echo unit to reduce transport delays</li>
                      <li>• Prepare surge capacity protocol for tomorrow 4-6 PM</li>
                      <li>• Cross-train 2 staff members for EP procedures</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Clinical Modules - Clickable Cards */}
            <div className="bg-gradient-to-br from-slate-50/60 via-white/70 to-slate-50/60 backdrop-blur-sm border border-slate-200/40 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-slate-800">Clinical Modules</h3>
                <div className="text-sm text-slate-600">Click to explore individual modules</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULES.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => openModule(module.id)}
                    className="text-left p-4 bg-white/70 border border-slate-200/50 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 hover:border-medical-teal-300 group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-lg bg-medical-teal-100 group-hover:bg-medical-teal-200 transition-colors">
                        {React.createElement(module.icon)}
                      </div>
                      <div className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                        {module.qualityScore}% Quality
                      </div>
                    </div>
                    <div className="font-semibold text-slate-900 mb-1">{module.name}</div>
                    <div className="text-sm text-slate-600 mb-3">{module.description}</div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-slate-500">Patients</div>
                        <div className="font-semibold text-slate-900">{module.patients.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Procedures</div>
                        <div className="font-semibold text-slate-900">{module.procedures.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-slate-200/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-500">Revenue</div>
                          <div className="font-semibold text-blue-600">{formatMoney(module.revenue)}</div>
                        </div>
                        <div className="text-medical-teal-600 group-hover:translate-x-1 transition-transform">
                          <Icons.ArrowRight />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Service Line Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <div className="bg-gradient-to-br from-blue-50/60 via-white/70 to-blue-50/60 backdrop-blur-sm border border-blue-200/40 rounded-xl p-4">
                <h4 className="text-lg font-medium text-slate-800 mb-4">Top Performing Modules</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-blue-50/50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Electrophysiology</div>
                      <div className="text-sm text-slate-600">97% Composite Score • $4.75M Revenue • 1,842 Procedures</div>
                    </div>
                    <div className="text-blue-600 font-bold">#1</div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50/30 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Valvular Surgery</div>
                      <div className="text-sm text-slate-600">96% Quality Score • $2.8M Revenue • 1,842 Procedures</div>
                    </div>
                    <div className="text-blue-600 font-bold">#2</div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50/20 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Peripheral Vascular</div>
                      <div className="text-sm text-slate-600">94% Limb Salvage • $1.28M Revenue • 1,842 Procedures</div>
                    </div>
                    <div className="text-blue-600 font-bold">#3</div>
                  </div>
                </div>
              </div>
              
              {/* Improvement Opportunities */}
              <div className="bg-gradient-to-br from-slate-50/60 via-white/70 to-slate-50/60 backdrop-blur-sm border border-slate-200/40 rounded-xl p-4">
                <h4 className="text-lg font-medium text-slate-800 mb-4">Improvement Opportunities</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-slate-50/50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Coronary Intervention</div>
                      <div className="text-sm text-slate-600">Door-to-balloon: 91% vs 95% target (AHA Mission: Lifeline)</div>
                    </div>
                    <div className="text-slate-600 font-bold">91%</div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-50/30 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Heart Failure</div>
                      <div className="text-sm text-slate-600">GDMT optimization: 94% vs 96% target</div>
                    </div>
                    <div className="text-slate-600 font-bold">94%</div>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-50/20 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">Structural Heart</div>
                      <div className="text-sm text-slate-600">TAVR outcomes: 96% vs 98% target</div>
                    </div>
                    <div className="text-slate-600 font-bold">96%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentModule = MODULES.find((m) => m.id === activeModule);
  const patients = modulePatients[activeModule];
  const moduleKPIs = getModuleKPIs(activeModule, moduleRole);

  return (
    <div className="min-h-screen bg-liquid-porsche-blue p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={backToMain} className="btn-medical-secondary"><Icons.ArrowLeft /></button>
            <div>
              <h1 className="text-4xl font-bold text-steel-900 mb-2">{currentModule?.name}</h1>
              <p className="text-lg text-steel-600">{currentModule?.description}</p>
            </div>
          </div>
          <RoleToggle value={moduleRole} onChange={setModuleRole} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {moduleKPIs.map((kpi, index) => (<KpiCard key={index} {...kpi} />))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <PatientQueue title="High Priority" patients={patients.filter((p) => p.priority === "High")} variant="danger" />
          <PatientQueue title="Pending Reviews" patients={patients.filter((p) => p.status === "Review")} variant="warning" />
          <PatientQueue title="Follow-up Needed" patients={patients.filter((p) => p.status === "Follow-up")} variant="success" />
        </div>
      </div>
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <ErrorBoundary module="Application" component="App">
      <AuthProvider>
        <BrowserRouter>
          <ToastContainer position="top-right" />
          <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, #1e40af 2px, transparent 2px), radial-gradient(circle at 70% 80%, #0ea5e9 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}></div>
          
          <div className="relative z-10 flex items-center justify-center min-h-screen">
            <div className="text-center">
              {/* Loading animation */}
              <div className="mb-8">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
              </div>
              
              {/* Brand */}
              <div className="mb-2">
                <TailrdLogo size="medium" variant="light" />
              </div>
              
              {/* Loading message */}
              <p className="text-lg text-slate-600 font-light mb-4">Processing Analytics...</p>
              
              {/* Animated dots */}
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
              </div>
              
              {/* Subtitle */}
              <p className="text-sm text-slate-600 mt-6">
                Population • Panel • Patient Analytics
              </p>
            </div>
          </div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <MainDashboard />
            </ProtectedRoute>
          } />
          <Route path="/hf/*" element={
            <ProtectedRoute>
              <HFModule />
            </ProtectedRoute>
          } />
          <Route path="/ep/*" element={
            <ProtectedRoute>
              <EPModule />
            </ProtectedRoute>
          } />
          <Route path="/structural/*" element={
            <ProtectedRoute>
              <StructuralHeartModule />
            </ProtectedRoute>
          } />
          <Route path="/coronary/*" element={
            <ProtectedRoute>
              <CoronaryInterventionModule />
            </ProtectedRoute>
          } />
          <Route path="/valvular/*" element={
            <ProtectedRoute>
              <ValvularDiseaseModule />
            </ProtectedRoute>
          } />
          <Route path="/peripheral/*" element={
            <ProtectedRoute>
              <PeripheralVascularModule />
            </ProtectedRoute>
          } />
        </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
