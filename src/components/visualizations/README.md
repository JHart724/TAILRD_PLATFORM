# Shared Visualization Component Library

This library provides reusable, consistent visualization components for the TAILRD healthcare analytics platform. All components follow the same design system and patterns to ensure visual consistency across all modules.

## Components Overview

### BaseTable
A flexible, feature-rich table component with built-in sorting, searching, filtering, and pagination.

#### Features
- ✅ Sortable columns
- ✅ Global search functionality
- ✅ Custom cell rendering
- ✅ Pagination support
- ✅ Loading states
- ✅ Export capabilities
- ✅ Responsive design
- ✅ Healthcare-specific color coding

#### Usage
```tsx
import { BaseTable, BaseTableColumn, getScoreColor } from '@/components/visualizations';

const columns: BaseTableColumn[] = [
  { key: 'name', label: 'Provider Name', sortable: true },
  { key: 'patients', label: 'Patients', sortable: true },
  { 
    key: 'score', 
    label: 'Quality Score', 
    sortable: true,
    render: (value) => (
      <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(value)}`}>
        {value}%
      </span>
    )
  }
];

<BaseTable
  title="Provider Performance"
  subtitle="Q4 2024 Quality Metrics"
  columns={columns}
  data={providerData}
  searchable={true}
  exportable={true}
  onRowClick={(row) => console.log('Selected:', row)}
/>
```

### BaseChart
A versatile chart component supporting multiple visualization types with consistent styling.

#### Chart Types
- **Bar Chart**: `type="bar"` - Vertical bar charts with optional target lines
- **Line Chart**: `type="line"` - Line charts with data points and grid lines
- **Comparison Chart**: `type="comparison"` - Horizontal progress bars for comparisons
- **Progress Chart**: `type="progress"` - Circular progress indicators

#### Features
- ✅ Multiple chart types
- ✅ Responsive design
- ✅ Interactive hover states
- ✅ Trend indicators
- ✅ Custom color schemes
- ✅ Export functionality
- ✅ Target/goal visualization

#### Usage
```tsx
import { BaseChart, ChartDataPoint, CHART_COLORS } from '@/components/visualizations';

const chartData: ChartDataPoint[] = [
  { label: 'ACE/ARB', value: 94.2, target: 95 },
  { label: 'Beta Blockers', value: 91.7, target: 95 },
  { label: 'MRAs', value: 78.4, target: 85 },
  { label: 'SGLT2i', value: 64.1, target: 75 }
];

<BaseChart
  type="bar"
  title="GDMT Compliance Rates"
  subtitle="Current vs Target Performance"
  data={chartData}
  showValues={true}
  colors={Object.values(CHART_COLORS.medical)}
  trend={{ direction: 'up', value: '+2.3%', period: 'last month' }}
  exportable={true}
/>
```

## Utility Functions

### getScoreColor(value, thresholds)
Returns appropriate CSS classes for healthcare score color coding.
- **Excellent** (≥90): Green
- **Good** (≥80): Blue  
- **Fair** (≥70): Amber
- **Poor** (<70): Red

### formatHealthcareMetric(value, type)
Formats healthcare metrics with appropriate units and formatting.
- `currency`: $1,234,567
- `percentage`: 94.2%
- `count`: 1,234
- `ratio`: 2.5:1

### getChartColors(count)
Returns an array of consistent colors for charts with medical-appropriate color schemes.

## Design Principles

### Visual Consistency
- All components use the same glassmorphism design with `bg-white/55 backdrop-blur-lg`
- Consistent color palette across all visualizations
- Standard spacing and typography following design system

### Healthcare Context
- Color coding optimized for healthcare quality metrics
- Support for target/goal visualization
- Medical-appropriate terminology and units

### Accessibility
- ARIA labels and roles for screen readers
- Keyboard navigation support
- High contrast color ratios
- Semantic HTML structure

### Performance
- Memoized components to prevent unnecessary re-renders
- Efficient sorting and filtering algorithms
- Lazy loading for large datasets
- Optimized SVG rendering for charts

## Integration Examples

### Heart Failure GDMT Dashboard
```tsx
// GDMT Compliance Table
<BaseTable
  title="Provider GDMT Performance"
  columns={[
    { key: 'provider_name', label: 'Provider', sortable: true },
    { key: 'patients', label: 'Patients', sortable: true },
    { 
      key: 'gdmt_compliance', 
      label: 'GDMT Compliance',
      render: (value) => (
        <span className={getScoreColor(value)}>
          {formatHealthcareMetric(value, 'percentage')}
        </span>
      )
    }
  ]}
  data={gdmtData}
/>

// GDMT Pillar Performance Chart
<BaseChart
  type="comparison"
  title="4-Pillar GDMT Performance"
  data={gdmtPillars}
  colors={getChartColors(4)}
/>
```

### Electrophysiology Device Metrics
```tsx
// Device Utilization Progress
<BaseChart
  type="progress" 
  title="ICD Utilization Rate"
  data={[{ label: 'Current Rate', value: 78, target: 85 }]}
/>

// Provider Comparison
<BaseChart
  type="bar"
  title="Provider Device Implant Rates"
  data={deviceData}
  showValues={true}
  yAxisLabel="Procedures per Month"
/>
```

## Color Scheme Reference

```tsx
export const CHART_COLORS = {
  medical: {
    blue: '#2563EB',     // Primary actions, information
    green: '#059669',    // Positive outcomes, targets met
    red: '#DC2626',      // Critical issues, alerts
    amber: '#D97706',    // Warnings, attention needed
    purple: '#7C3AED',   // Specialty metrics
    indigo: '#4F46E5'    // Secondary information
  }
};
```

## Best Practices

### Data Preparation
```tsx
// Transform your data to match component interfaces
const transformedData = rawData.map(item => ({
  label: item.provider_name,
  value: item.compliance_rate,
  target: item.target_rate,
  category: item.specialty
}));
```

### Error Handling
```tsx
// Always provide fallbacks for missing data
<BaseTable
  data={data || []}
  loading={isLoading}
  emptyMessage="No providers found matching your criteria"
/>
```

### Performance Optimization
```tsx
// Use useMemo for expensive data transformations
const chartData = useMemo(() => 
  transformRawDataToChartFormat(rawData), [rawData]
);

// Implement proper loading states
{isLoading ? (
  <BaseTable loading={true} columns={columns} data={[]} />
) : (
  <BaseTable columns={columns} data={processedData} />
)}
```

This shared library enables rapid development of consistent, accessible healthcare analytics visualizations across all TAILRD platform modules.