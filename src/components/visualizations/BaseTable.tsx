import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, Download } from 'lucide-react';

export interface BaseTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  width?: string;
}

export interface BaseTableProps {
  columns: BaseTableColumn[];
  data: any[];
  title?: string;
  subtitle?: string;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  className?: string;
  onRowClick?: (row: any) => void;
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    pageSize: number;
    currentPage: number;
    onPageChange: (page: number) => void;
  };
}

const BaseTable: React.FC<BaseTableProps> = ({
  columns,
  data,
  title,
  subtitle,
  searchable = true,
  filterable = false,
  exportable = false,
  className = '',
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  pagination
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const searchableColumns = columns.filter(col => col.searchable !== false);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm && searchableColumns.length > 0) {
      result = result.filter(row =>
        searchableColumns.some(col =>
          String(row[col.key] || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal === bVal) return 0;
        
        const comparison = aVal > bVal ? 1 : -1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchTerm, sortColumn, sortDirection, searchableColumns]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredAndSortedData;
    
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredAndSortedData.slice(startIndex, startIndex + pagination.pageSize);
  }, [filteredAndSortedData, pagination]);

  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const getScoreColor = (value: number, thresholds = [80, 70, 60]): string => {
    if (value >= thresholds[0]) return "text-emerald-600 bg-emerald-50";
    if (value >= thresholds[1]) return "text-blue-600 bg-blue-50";
    if (value >= thresholds[2]) return "text-amber-600 bg-amber-50";
    return "text-rose-600 bg-rose-50";
  };

  if (loading) {
    return (
      <div className={`bg-white/55 backdrop-blur-lg rounded-xl shadow-glass border border-white/20 p-8 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-steel-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-steel-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/55 backdrop-blur-lg rounded-xl shadow-glass border border-white/20 overflow-hidden ${className}`}>
      {/* Header */}
      {(title || searchable || filterable || exportable) && (
        <div className="p-6 bg-white/30 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-center justify-between">
            <div>
              {title && <h3 className="text-lg font-semibold text-steel-900">{title}</h3>}
              {subtitle && <p className="text-sm text-steel-600 mt-1">{subtitle}</p>}
            </div>
            
            <div className="flex items-center gap-3">
              {searchable && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-steel-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white/50 border border-white/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-blue-500/20 focus:border-medical-blue-300"
                  />
                </div>
              )}
              
              {filterable && (
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className="p-2 bg-white/50 border border-white/30 rounded-lg hover:bg-white/70 transition-colors"
                >
                  <Filter className="w-4 h-4 text-steel-600" />
                </button>
              )}
              
              {exportable && (
                <button 
                  className="p-2 bg-white/50 border border-white/30 rounded-lg hover:bg-white/70 transition-colors"
                  onClick={() => {
                    console.log('Exporting table data');
                    // TODO: Implement table export functionality
                    alert('Table Export - Data will be exported as CSV/Excel');
                  }}
                >
                  <Download className="w-4 h-4 text-steel-600" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/30 backdrop-blur-sm border-b border-white/20">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-xs font-semibold text-steel-700 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-white/40' : ''
                  } ${column.className || ''}`}
                  style={column.width ? { width: column.width } : undefined}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-steel-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={index}
                  className={`hover:bg-white/30 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                      {column.render ? 
                        column.render(row[column.key], row) : 
                        <span className="text-steel-900">{row[column.key]}</span>
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="p-4 bg-white/30 backdrop-blur-sm border-t border-white/20 flex items-center justify-between">
          <div className="text-sm text-steel-600">
            Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.pageSize, filteredAndSortedData.length)} of{' '}
            {filteredAndSortedData.length} results
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 bg-white/50 border border-white/30 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70"
            >
              Previous
            </button>
            <span className="px-3 py-1 bg-medical-blue-50 border border-medical-blue-200 rounded text-sm">
              Page {pagination.currentPage}
            </span>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage * pagination.pageSize >= filteredAndSortedData.length}
              className="px-3 py-1 bg-white/50 border border-white/30 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function for score coloring - exported for reuse
export const getScoreColor = (value: number, thresholds = [80, 70, 60]): string => {
  if (value >= thresholds[0]) return "text-emerald-600 bg-emerald-50";
  if (value >= thresholds[1]) return "text-blue-600 bg-blue-50";
  if (value >= thresholds[2]) return "text-amber-600 bg-amber-50";
  return "text-rose-600 bg-rose-50";
};

export default BaseTable;