import React, { useState, useMemo, useCallback } from "react";

// Core Types
type Role = "Executive" | "Service Line" | "Care Team";
type ModuleId =
  | "hf"
  | "ep"
  | "structural"
  | "coronary"
  | "valvular"
  | "peripheral";
type ViewMode = "main" | "module";

// Icons
const Icons = {
  Users: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197V9a3 3 0 00-6 0v12.01"
      />
    </svg>
  ),
  Dollar: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
      />
    </svg>
  ),
  Target: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Activity: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  Heart: () => (
    <svg
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  ),
  Zap: () => (
    <svg
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
  Valve: () => (
    <svg
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h8M12 8v8"
      />
    </svg>
  ),
  Coronary: () => (
    <svg
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M8 8l8 8M16 8l-8 8"
      />
    </svg>
  ),
  Peripheral: () => (
    <svg
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M8 16l8-8M16 16l-8-8"
      />
    </svg>
  ),
  ArrowRight: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  ),
  ArrowLeft: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  ),
  Settings: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  Alert: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  ),
  Brain: () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
};

// Utility Functions
const formatMoney = (amount) => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return `$${amount.toLocaleString()}`;
};

// Module Data
const MODULES = [
  {
    id: "hf",
    name: "Heart Failure",
    shortName: "HF",
    description: "GDMT optimization with specialty phenotype detection",
    functional: true,
    patients: 1247,
    procedures: 892,
    revenue: 804780,
    qualityScore: 94,
    icon: Icons.Heart,
    features: [
      "GDMT Analytics",
      "Specialty Screening",
      "Advanced Therapies",
      "340B Revenue",
    ],
  },
  {
    id: "ep",
    name: "Electrophysiology",
    shortName: "EP",
    description: "AI-powered rhythm management and device optimization",
    functional: true,
    patients: 2156,
    procedures: 1234,
    revenue: 3250000,
    qualityScore: 96,
    icon: Icons.Zap,
    features: [
      "AI Risk Detection",
      "Device Management",
      "LAAC Workflow",
      "Mount Sinai Algorithms",
    ],
  },
  {
    id: "structural",
    name: "Structural Heart",
    shortName: "Structural",
    description: "TAVR, TEER, and LAAC program management",
    functional: true,
    patients: 1876,
    procedures: 945,
    revenue: 1704220,
    qualityScore: 96,
    icon: Icons.Valve,
    features: [
      "TAVR Pipeline",
      "TEER Workflow",
      "Heart Team Integration",
      "Risk Stratification",
    ],
  },
  {
    id: "coronary",
    name: "Coronary Revascularization",
    shortName: "Coronary",
    description: "PCI and CABG decision support with imaging guidance",
    functional: true,
    patients: 8234,
    procedures: 4567,
    revenue: 4012440,
    qualityScore: 95,
    icon: Icons.Coronary,
    features: [
      "SYNTAX Integration",
      "Imaging Guidance",
      "Heart Team Workflow",
      "DAPT Optimization",
    ],
  },
  {
    id: "valvular",
    name: "Valvular Disease",
    shortName: "Valvular",
    description: "Valve disease progression and intervention timing",
    functional: true,
    patients: 2156,
    procedures: 1234,
    revenue: 1908130,
    qualityScore: 93,
    icon: Icons.Activity,
    features: [
      "Disease Progression",
      "Intervention Timing",
      "Multi-valve Tracking",
      "Echo Integration",
    ],
  },
  {
    id: "peripheral",
    name: "Peripheral Vascular",
    shortName: "Peripheral",
    description: "PAD management and access optimization",
    functional: true,
    patients: 1892,
    procedures: 876,
    revenue: 1055770,
    qualityScore: 91,
    icon: Icons.Peripheral,
    features: [
      "PAD Management",
      "Access Optimization",
      "Risk Stratification",
      "Wound Care",
    ],
  },
];

// Sample patient data generator
const generateSamplePatients = (moduleId, count = 20) => {
  const names = [
    "John Smith",
    "Jane Doe",
    "Maria Garcia",
    "David Johnson",
    "Sarah Wilson",
    "Michael Brown",
    "Lisa Davis",
  ];
  const physicians = [
    "Dr. Rivera",
    "Dr. Chen",
    "Dr. Patel",
    "Dr. Lewis",
    "Dr. Ahmed",
    "Dr. Thompson",
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `${moduleId.toUpperCase()}${(i + 1).toString().padStart(4, "0")}`,
    name: names[Math.floor(Math.random() * names.length)],
    age: 50 + Math.floor(Math.random() * 40),
    physician: physicians[Math.floor(Math.random() * physicians.length)],
    priority: ["High", "Medium", "Low"][Math.floor(Math.random() * 3)],
    status: ["Active", "Review", "Follow-up"][Math.floor(Math.random() * 3)],
  }));
};

// UI Components
const KpiCard = ({
  label,
  value,
  icon: Icon,
  variant = "default",
  trend,
  onClick,
}) => {
  const getVariantColors = (variant) => {
    const variants = {
      default: "bg-white/70 border-slate-200/70 text-slate-900",
      success: "bg-emerald-50/70 border-emerald-200/70 text-emerald-900",
      warning: "bg-amber-50/70 border-amber-200/70 text-amber-900",
      danger: "bg-rose-50/70 border-rose-200/70 text-rose-900",
      info: "bg-blue-50/70 border-blue-200/70 text-blue-900",
    };
    return variants[variant] || variants.default;
  };

  return (
    <div
      className={`w-full text-left rounded-2xl p-6 border shadow-lg transition-all duration-300 ${getVariantColors(
        variant
      )} ${
        onClick
          ? "cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:scale-105"
          : ""
      } backdrop-blur-sm`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-lg bg-white/50">
              <Icon />
            </div>
          )}
          <span className="text-sm font-bold text-slate-800">{label}</span>
        </div>
        {trend && (
          <div
            className={`text-xs font-semibold ${
              trend > 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {trend > 0 ? "↗" : "↘"} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
    </div>
  );
};

const RoleToggle = ({ value, onChange }) => {
  const roles = [
    {
      id: "Executive",
      label: "Executive",
      desc: "Financial & ROI",
      color: "text-indigo-700 bg-indigo-50 border-indigo-200",
    },
    {
      id: "Service Line",
      label: "Service Line",
      desc: "Operations",
      color: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      id: "Care Team",
      label: "Care Team",
      desc: "Patient Care",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
  ];

  return (
    <div className="flex gap-2 bg-white/80 rounded-xl p-2 border border-slate-200/70 backdrop-blur-sm shadow-lg">
      {roles.map((role) => (
        <button
          key={role.id}
          onClick={() => onChange(role.id)}
          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            value === role.id
              ? `${role.color} shadow-sm transform scale-105`
              : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <div className="text-center">
            <div className="font-semibold">{role.label}</div>
            <div className="text-xs opacity-75">{role.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

const ModuleTile = ({ module, onClick }) => {
  const Icon = module.icon;

  return (
    <button
      onClick={onClick}
      className="relative rounded-3xl p-8 text-left transition-all duration-300 border group bg-white/90 border-slate-200/70 hover:bg-white hover:shadow-2xl hover:-translate-y-2 cursor-pointer hover:border-blue-300/50 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="p-4 rounded-2xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-indigo-100 group-hover:from-blue-100 group-hover:to-indigo-200">
          <Icon />
        </div>
        <span className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full font-medium border border-emerald-200">
          Active
        </span>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-2">{module.name}</h3>
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
        {module.description}
      </p>

      <div className="space-y-3 text-sm text-slate-700">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <Icons.Users />
            <span>Patients</span>
          </span>
          <span className="font-bold text-lg">
            {module.patients.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <Icons.Activity />
            <span>Procedures</span>
          </span>
          <span className="font-bold text-lg">
            {module.procedures.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <Icons.Target />
            <span>Quality Score</span>
          </span>
          <span className="font-bold text-lg text-emerald-600">
            {module.qualityScore}%
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <Icons.Dollar />
            <span>Revenue</span>
          </span>
          <span className="font-bold text-lg text-blue-600">
            {formatMoney(module.revenue)}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {module.features.slice(0, 3).map((feature) => (
          <span
            key={feature}
            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200"
          >
            {feature}
          </span>
        ))}
      </div>

      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="p-2 rounded-full bg-blue-500 text-white">
          <Icons.ArrowRight />
        </div>
      </div>
    </button>
  );
};

const PatientQueue = ({
  title,
  patients,
  variant = "default",
  maxItems = 6,
}) => {
  const getVariantStyle = (variant) => {
    switch (variant) {
      case "warning":
        return "bg-amber-50 border-amber-200";
      case "danger":
        return "bg-red-50 border-red-200";
      case "success":
        return "bg-emerald-50 border-emerald-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/90 backdrop-blur-sm p-8 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <span className="text-lg font-bold text-slate-600">
          {patients.length}
        </span>
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {patients.slice(0, maxItems).map((patient) => (
          <div
            key={patient.id}
            className={`flex items-center justify-between p-4 ${getVariantStyle(
              variant
            )} rounded-xl border transition-all hover:shadow-md`}
          >
            <div className="flex-1">
              <div className="font-semibold text-slate-900">{patient.name}</div>
              <div className="text-sm text-slate-600">
                {patient.age}y • {patient.id} • {patient.physician}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs px-3 py-1.5 rounded-full bg-white/80 text-slate-700 font-medium">
                {patient.status}
              </div>
              <Icons.ArrowRight />
            </div>
          </div>
        ))}
        {patients.length > maxItems && (
          <div className="text-center py-4 text-sm text-slate-500">
            +{patients.length - maxItems} more patients
          </div>
        )}
      </div>
    </div>
  );
};

// Module KPIs based on role
const getModuleKPIs = (moduleId, role) => {
  const kpiData = {
    hf: {
      Executive: [
        {
          label: "HF Revenue",
          value: formatMoney(804780),
          icon: Icons.Dollar,
          variant: "success",
          trend: 8.7,
        },
        {
          label: "GDMT Opportunity",
          value: formatMoney(2450000),
          icon: Icons.Target,
          variant: "warning",
          trend: 12.3,
        },
        {
          label: "Market Penetration",
          value: "67.2%",
          icon: Icons.Users,
          variant: "default",
          trend: 5.2,
        },
        {
          label: "Quality Bonus",
          value: formatMoney(125000),
          icon: Icons.Target,
          variant: "success",
          trend: 15.8,
        },
      ],
      "Service Line": [
        {
          label: "GDMT Compliance",
          value: "73.4%",
          icon: Icons.Target,
          variant: "warning",
          trend: 2.1,
        },
        {
          label: "Provider Variation",
          value: "18.2%",
          icon: Icons.Alert,
          variant: "danger",
          trend: -3.4,
        },
        {
          label: "Care Coordination",
          value: "89.1%",
          icon: Icons.Users,
          variant: "success",
          trend: 4.2,
        },
        {
          label: "Readmission Rate",
          value: "8.7%",
          icon: Icons.Activity,
          variant: "warning",
          trend: -2.8,
        },
      ],
      "Care Team": [
        {
          label: "Active Alerts",
          value: "47",
          icon: Icons.Alert,
          variant: "warning",
        },
        {
          label: "GDMT Gaps",
          value: "128",
          icon: Icons.Target,
          variant: "danger",
        },
        {
          label: "Phenotype Flags",
          value: "23",
          icon: Icons.Brain,
          variant: "info",
        },
        {
          label: "Panel Size",
          value: "247",
          icon: Icons.Users,
          variant: "default",
        },
      ],
    },
    ep: {
      Executive: [
        {
          label: "EP Revenue",
          value: formatMoney(3250000),
          icon: Icons.Dollar,
          variant: "success",
          trend: 15.2,
        },
        {
          label: "Device Volume",
          value: "456",
          icon: Icons.Activity,
          variant: "success",
          trend: 12.8,
        },
        {
          label: "LAAC Procedures",
          value: "89",
          icon: Icons.Zap,
          variant: "warning",
          trend: 22.5,
        },
        {
          label: "Market Share",
          value: "42.3%",
          icon: Icons.Target,
          variant: "success",
          trend: 8.9,
        },
      ],
      "Service Line": [
        {
          label: "AI Detection Rate",
          value: "94.1%",
          icon: Icons.Brain,
          variant: "success",
          trend: 3.7,
        },
        {
          label: "Device Follow-up",
          value: "91.7%",
          icon: Icons.Settings,
          variant: "success",
          trend: 2.1,
        },
        {
          label: "Anticoagulation Rate",
          value: "88.4%",
          icon: Icons.Target,
          variant: "warning",
          trend: 4.8,
        },
        {
          label: "Complication Rate",
          value: "2.1%",
          icon: Icons.Alert,
          variant: "success",
          trend: -1.2,
        },
      ],
      "Care Team": [
        {
          label: "High Risk AFib",
          value: "34",
          icon: Icons.Alert,
          variant: "danger",
        },
        {
          label: "Device Alerts",
          value: "12",
          icon: Icons.Zap,
          variant: "warning",
        },
        { label: "AI Flags", value: "8", icon: Icons.Brain, variant: "info" },
        {
          label: "Active Patients",
          value: "287",
          icon: Icons.Users,
          variant: "default",
        },
      ],
    },
    structural: {
      Executive: [
        {
          label: "Structural Revenue",
          value: formatMoney(1704220),
          icon: Icons.Dollar,
          variant: "success",
          trend: 18.4,
        },
        {
          label: "TAVR Volume",
          value: "234",
          icon: Icons.Valve,
          variant: "success",
          trend: 21.7,
        },
        {
          label: "TEER Volume",
          value: "89",
          icon: Icons.Activity,
          variant: "warning",
          trend: 15.3,
        },
        {
          label: "Program Growth",
          value: "28.7%",
          icon: Icons.Target,
          variant: "success",
          trend: 12.1,
        },
      ],
      "Service Line": [
        {
          label: "Heart Team Usage",
          value: "96.2%",
          icon: Icons.Users,
          variant: "success",
          trend: 4.8,
        },
        {
          label: "Risk Stratification",
          value: "92.1%",
          icon: Icons.Target,
          variant: "success",
          trend: 3.2,
        },
        {
          label: "Procedural Success",
          value: "97.8%",
          icon: Icons.Activity,
          variant: "success",
          trend: 1.9,
        },
        {
          label: "Length of Stay",
          value: "2.1 days",
          icon: Icons.Settings,
          variant: "success",
          trend: -8.7,
        },
      ],
      "Care Team": [
        {
          label: "TAVR Candidates",
          value: "23",
          icon: Icons.Valve,
          variant: "success",
        },
        {
          label: "TEER Evaluations",
          value: "15",
          icon: Icons.Activity,
          variant: "warning",
        },
        {
          label: "High Risk Cases",
          value: "7",
          icon: Icons.Alert,
          variant: "danger",
        },
        {
          label: "Active Pipeline",
          value: "198",
          icon: Icons.Users,
          variant: "default",
        },
      ],
    },
    coronary: {
      Executive: [
        {
          label: "Coronary Revenue",
          value: formatMoney(4012440),
          icon: Icons.Dollar,
          variant: "success",
          trend: 12.1,
        },
        {
          label: "PCI Volume",
          value: "2,234",
          icon: Icons.Activity,
          variant: "default",
          trend: 8.9,
        },
        {
          label: "CABG Volume",
          value: "1,156",
          icon: Icons.Coronary,
          variant: "default",
          trend: 4.2,
        },
        {
          label: "Market Share",
          value: "34.7%",
          icon: Icons.Target,
          variant: "warning",
          trend: 2.8,
        },
      ],
      "Service Line": [
        {
          label: "SYNTAX Compliance",
          value: "91.2%",
          icon: Icons.Target,
          variant: "success",
          trend: 3.7,
        },
        {
          label: "Heart Team Usage",
          value: "78.4%",
          icon: Icons.Users,
          variant: "warning",
          trend: 5.1,
        },
        {
          label: "Imaging Utilization",
          value: "84.6%",
          icon: Icons.Brain,
          variant: "success",
          trend: 7.3,
        },
        {
          label: "Same Day Discharge",
          value: "67.8%",
          icon: Icons.Settings,
          variant: "default",
          trend: 9.2,
        },
      ],
      "Care Team": [
        {
          label: "Complex Cases",
          value: "34",
          icon: Icons.Alert,
          variant: "warning",
        },
        {
          label: "Heart Team Reviews",
          value: "12",
          icon: Icons.Users,
          variant: "info",
        },
        {
          label: "Imaging Pending",
          value: "8",
          icon: Icons.Brain,
          variant: "warning",
        },
        {
          label: "Active Cases",
          value: "156",
          icon: Icons.Activity,
          variant: "default",
        },
      ],
    },
    valvular: {
      Executive: [
        {
          label: "Valvular Revenue",
          value: formatMoney(1908130),
          icon: Icons.Dollar,
          variant: "success",
          trend: 15.3,
        },
        {
          label: "Severe AS Cases",
          value: "89",
          icon: Icons.Activity,
          variant: "warning",
          trend: 18.7,
        },
        {
          label: "MR Interventions",
          value: "45",
          icon: Icons.Activity,
          variant: "success",
          trend: 22.1,
        },
        {
          label: "Clinic Efficiency",
          value: "92.4%",
          icon: Icons.Target,
          variant: "success",
          trend: 6.8,
        },
      ],
      "Service Line": [
        {
          label: "Echo Compliance",
          value: "95.7%",
          icon: Icons.Brain,
          variant: "success",
          trend: 1.9,
        },
        {
          label: "Intervention Timing",
          value: "87.3%",
          icon: Icons.Settings,
          variant: "success",
          trend: 3.2,
        },
        {
          label: "Progression Tracking",
          value: "89.1%",
          icon: Icons.Target,
          variant: "success",
          trend: 4.1,
        },
        {
          label: "Referral Rate",
          value: "78.9%",
          icon: Icons.Users,
          variant: "warning",
          trend: 2.7,
        },
      ],
      "Care Team": [
        {
          label: "Severe AS Watch",
          value: "23",
          icon: Icons.Alert,
          variant: "warning",
        },
        {
          label: "Echo Overdue",
          value: "12",
          icon: Icons.Brain,
          variant: "danger",
        },
        {
          label: "Symptom Changes",
          value: "5",
          icon: Icons.Activity,
          variant: "info",
        },
        {
          label: "Active Tracking",
          value: "203",
          icon: Icons.Users,
          variant: "default",
        },
      ],
    },
    peripheral: {
      Executive: [
        {
          label: "PAD Revenue",
          value: formatMoney(1055770),
          icon: Icons.Dollar,
          variant: "success",
          trend: 11.4,
        },
        {
          label: "Intervention Volume",
          value: "456",
          icon: Icons.Activity,
          variant: "default",
          trend: 14.2,
        },
        {
          label: "Access Management",
          value: "287",
          icon: Icons.Peripheral,
          variant: "warning",
          trend: 8.7,
        },
        {
          label: "Limb Salvage Rate",
          value: "94.2%",
          icon: Icons.Target,
          variant: "success",
          trend: 3.1,
        },
      ],
      "Service Line": [
        {
          label: "ABI Screening",
          value: "78.4%",
          icon: Icons.Target,
          variant: "warning",
          trend: 5.2,
        },
        {
          label: "Wound Healing",
          value: "86.7%",
          icon: Icons.Activity,
          variant: "success",
          trend: 7.8,
        },
        {
          label: "Access Patency",
          value: "91.3%",
          icon: Icons.Peripheral,
          variant: "success",
          trend: 2.4,
        },
        {
          label: "Risk Factor Control",
          value: "73.1%",
          icon: Icons.Brain,
          variant: "warning",
          trend: 4.6,
        },
      ],
      "Care Team": [
        {
          label: "Critical Limb Cases",
          value: "15",
          icon: Icons.Alert,
          variant: "danger",
        },
        {
          label: "Access Issues",
          value: "8",
          icon: Icons.Peripheral,
          variant: "warning",
        },
        {
          label: "Wound Care",
          value: "23",
          icon: Icons.Activity,
          variant: "info",
        },
        {
          label: "Active Patients",
          value: "167",
          icon: Icons.Users,
          variant: "default",
        },
      ],
    },
  };

  return kpiData[moduleId]?.[role] || [];
};

// Main Dashboard Component
export default function CompleteTailrdPlatform() {
  const [viewMode, setViewMode] = useState("main");
  const [activeModule, setActiveModule] = useState("hf");
  const [moduleRole, setModuleRole] = useState("Executive");

  // Generate sample data for all modules
  const [modulePatients] = useState(() => {
    const data = {};
    MODULES.forEach((module) => {
      data[module.id] = generateSamplePatients(module.id, 25);
    });
    return data;
  });

  const totalMetrics = useMemo(() => {
    const totals = MODULES.reduce(
      (acc, module) => ({
        patients: acc.patients + module.patients,
        procedures: acc.procedures + module.procedures,
        revenue: acc.revenue + module.revenue,
      }),
      { patients: 0, procedures: 0, revenue: 0 }
    );

    const avgQuality =
      MODULES.reduce((sum, m) => sum + m.qualityScore, 0) / MODULES.length;

    return {
      totalPatients: totals.patients,
      totalProcedures: totals.procedures,
      totalRevenue: totals.revenue,
      avgQuality: Math.round(avgQuality),
      functionalModules: MODULES.filter((m) => m.functional).length,
    };
  }, []);

  const openModule = useCallback((moduleId) => {
    setActiveModule(moduleId);
    setViewMode("module");
  }, []);

  const backToMain = useCallback(() => {
    setViewMode("main");
  }, []);

  if (viewMode === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                TAILRD Healthcare Platform
              </h1>
              <p className="text-lg text-slate-600">
                Comprehensive cardiovascular care management
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Last Updated</div>
              <div className="text-lg font-semibold text-slate-700">
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Platform Overview KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <KpiCard
              label="Total Patients"
              value={totalMetrics.totalPatients.toLocaleString()}
              icon={Icons.Users}
              variant="default"
              trend={8.2}
            />
            <KpiCard
              label="Total Procedures"
              value={totalMetrics.totalProcedures.toLocaleString()}
              icon={Icons.Activity}
              variant="success"
              trend={12.4}
            />
            <KpiCard
              label="Total Revenue"
              value={formatMoney(totalMetrics.totalRevenue)}
              icon={Icons.Dollar}
              variant="success"
              trend={15.7}
            />
            <KpiCard
              label="Avg Quality Score"
              value={`${totalMetrics.avgQuality}%`}
              icon={Icons.Target}
              variant="success"
              trend={3.2}
            />
            <KpiCard
              label="Active Modules"
              value={`${totalMetrics.functionalModules}/6`}
              icon={Icons.Settings}
              variant="info"
            />
          </div>

          {/* Module Grid */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Clinical Modules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {MODULES.map((module) => (
                <ModuleTile
                  key={module.id}
                  module={module}
                  onClick={() => openModule(module.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Module View
  const currentModule = MODULES.find((m) => m.id === activeModule);
  const patients = modulePatients[activeModule] || [];
  const moduleKPIs = getModuleKPIs(activeModule, moduleRole);

  const RoleBanner = ({ role }) => {
    const getRoleStyle = (role) => {
      switch (role) {
        case "Executive":
          return "bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 text-indigo-800";
        case "Service Line":
          return "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-800";
        case "Care Team":
          return "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-800";
        default:
          return "bg-slate-50 border-slate-200 text-slate-800";
      }
    };

    return (
      <div
        className={`rounded-2xl border px-6 py-4 text-sm backdrop-blur-sm ${getRoleStyle(
          role
        )}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-current opacity-60"></div>
          <span className="font-bold text-lg">{role} Dashboard</span>
          <span className="text-xs opacity-75 px-2 py-1 bg-white/50 rounded-full">
            Active View
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Module Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={backToMain}
              className="p-3 rounded-2xl bg-white/80 border border-slate-200/70 shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm"
            >
              <Icons.ArrowLeft />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                {currentModule?.name}
              </h1>
              <p className="text-lg text-slate-600">
                {currentModule?.description}
              </p>
            </div>
          </div>
          <RoleToggle value={moduleRole} onChange={setModuleRole} />
        </div>

        {/* Role Banner */}
        <RoleBanner role={moduleRole} />

        {/* Module KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {moduleKPIs.map((kpi, index) => (
            <KpiCard key={index} {...kpi} />
          ))}
        </div>

        {/* Patient Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <PatientQueue
            title="High Priority"
            patients={patients.filter((p) => p.priority === "High")}
            variant="danger"
          />
          <PatientQueue
            title="Pending Reviews"
            patients={patients.filter((p) => p.status === "Review")}
            variant="warning"
          />
          <PatientQueue
            title="Follow-up Needed"
            patients={patients.filter((p) => p.status === "Follow-up")}
            variant="success"
          />
        </div>

        {/* Additional Module Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 backdrop-blur-sm p-8 shadow-lg">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              Module Features
            </h3>
            <div className="space-y-4">
              {currentModule?.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-slate-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 backdrop-blur-sm p-8 shadow-lg">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Patients</span>
                <span className="font-bold text-xl">
                  {currentModule?.patients.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Annual Procedures</span>
                <span className="font-bold text-xl">
                  {currentModule?.procedures.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Quality Score</span>
                <span className="font-bold text-xl text-emerald-600">
                  {currentModule?.qualityScore}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Annual Revenue</span>
                <span className="font-bold text-xl text-blue-600">
                  {formatMoney(currentModule?.revenue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
