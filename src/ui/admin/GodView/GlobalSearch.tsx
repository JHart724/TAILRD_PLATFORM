/**
 * Global Search Component
 * 
 * Provides search capability across all modules for patients, providers,
 * facilities, and other entities. Uses fuzzy search with real-time results.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, User, Building, FileText, Loader2 } from 'lucide-react';
import { useTheme } from '../../../theme';

interface SearchResult {
  id: string;
  type: 'patient' | 'provider' | 'facility' | 'concept';
  name: string;
  module: string;
  subtitle?: string;
  metadata?: Record<string, any>;
}

export const GlobalSearch: React.FC = () => {
  const { semantic } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 // Cmd/Ctrl + K to open search
 if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
 e.preventDefault();
 setIsOpen(true);
 setTimeout(() => inputRef.current?.focus(), 100);
 }
 
 // Escape to close
 if (e.key === 'Escape') {
 setIsOpen(false);
 setQuery('');
 setResults([]);
 }
 };

 document.addEventListener('keydown', handleKeyDown);
 return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle search input
  useEffect(() => {
 if (!query.trim()) {
 setResults([]);
 setIsSearching(false);
 return;
 }

 const searchTimer = setTimeout(async () => {
 setIsSearching(true);
 try {
 const response = await fetch(`/api/admin/god/global-search?q=${encodeURIComponent(query)}&limit=10`, {
 headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
 });
 
 if (response.ok) {
 const data = await response.json();
 setResults(data.results);
 setSelectedIndex(0);
 }
 } catch (error) {
 console.error('Search error:', error);
 setResults([]);
 } finally {
 setIsSearching(false);
 }
 }, 300);

 return () => clearTimeout(searchTimer);
  }, [query]);

  // Handle navigation keys
  useEffect(() => {
 if (!isOpen) return;

 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'ArrowDown') {
 e.preventDefault();
 setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
 } else if (e.key === 'ArrowUp') {
 e.preventDefault();
 setSelectedIndex(prev => Math.max(prev - 1, 0));
 } else if (e.key === 'Enter' && results[selectedIndex]) {
 e.preventDefault();
 handleSelectResult(results[selectedIndex]);
 }
 };

 document.addEventListener('keydown', handleKeyDown);
 return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelectResult = (result: SearchResult) => {
 // Navigate to the appropriate module/view
 const moduleRoutes: Record<string, string> = {
 heartFailure: '/hf',
 structuralHeart: '/structural-heart',
 electrophysiology: '/electrophysiology',
 peripheralVascular: '/peripheral-vascular',
 valvularDisease: '/valvular',
 coronaryIntervention: '/coronary',
 revenueCycle: '/revenue-cycle'
 };

 const basePath = moduleRoutes[result.module] || '/admin';
 let targetPath = basePath;

 // Route to specific views based on result type
 if (result.type === 'patient') {
 targetPath = `${basePath}/care-team?patient=${result.id}`;
 } else if (result.type === 'provider') {
 targetPath = `${basePath}/service-line?provider=${result.id}`;
 } else if (result.type === 'facility') {
 targetPath = `${basePath}/executive?facility=${result.id}`;
 }

 // Navigate (you might want to use React Router's navigate here)
 window.location.href = targetPath;
 
 setIsOpen(false);
 setQuery('');
 setResults([]);
  };

  const getResultIcon = (type: string) => {
 switch (type) {
 case 'patient': return Users;
 case 'provider': return User;
 case 'facility': return Building;
 default: return FileText;
 }
  };

  const getModuleColor = (module: string) => {
 const colors: Record<string, string> = {
 heartFailure: semantic['module.heartFailure'],
 structuralHeart: semantic['module.structural'],
 electrophysiology: semantic['module.ep'],
 peripheralVascular: semantic['module.vascular'],
 valvularDisease: semantic['module.valvular'],
 coronaryIntervention: semantic['module.coronary'],
 revenueCycle: semantic['module.revenue']
 };
 return colors[module] || semantic['chart.secondary'];
  };

  return (
 <>
 {/* Search Trigger Button */}
 <button
 onClick={() => setIsOpen(true)}
 className="flex items-center gap-3 px-4 py-2 rounded-lg border transition-all hover:bg-gray-50 min-w-64"
 style={{ 
 borderColor: semantic['border.default'],
 backgroundColor: semantic['surface.primary']
 }}
 >
 <Search className="w-4 h-4" style={{ color: semantic['text.muted'] }} />
 <span className="flex-1 text-left text-sm" style={{ color: semantic['text.muted'] }}>
 Search patients, providers...
 </span>
 <div className="flex gap-1">
 <kbd 
 className="px-1.5 py-0.5 rounded text-xs font-mono"
 style={{ 
 backgroundColor: semantic['surface.tertiary'],
 color: semantic['text.muted'],
 fontSize: '10px'
 }}
 >
 ⌘K
 </kbd>
 </div>
 </button>

 {/* Search Modal */}
 {isOpen && (
 <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
 {/* Backdrop */}
 <div 
 className="fixed inset-0"
 style={{ backgroundColor: semantic['surface.overlay'] }}
 onClick={() => setIsOpen(false)}
 />
 
 {/* Search Panel */}
 <div 
 className="relative w-full max-w-2xl mx-4 rounded-xl border shadow-xl"
 style={{ 
 backgroundColor: semantic['surface.elevated'],
 borderColor: semantic['border.default']
 }}
 >
 {/* Search Input */}
 <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: semantic['border.muted'] }}>
 <Search className="w-5 h-5" style={{ color: semantic['text.muted'] }} />
 <input
 ref={inputRef}
 type="text"
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Search across all modules..."
 className="flex-1 text-lg bg-transparent outline-none"
 style={{ color: semantic['text.primary'] }}
 autoFocus
 />
 {isSearching && (
 <Loader2 className="w-5 h-5 animate-spin" style={{ color: semantic['text.muted'] }} />
 )}
 <button
 onClick={() => setIsOpen(false)}
 className="p-1 hover:bg-gray-100 rounded"
 >
 <X className="w-4 h-4" style={{ color: semantic['text.muted'] }} />
 </button>
 </div>

 {/* Search Results */}
 <div ref={resultsRef} className="max-h-80 overflow-y-auto">
 {results.length > 0 ? (
 <div className="p-2">
 {results.map((result, index) => {
 const Icon = getResultIcon(result.type);
 const moduleColor = getModuleColor(result.module);
 const isSelected = index === selectedIndex;
 
 return (
 <button
 key={result.id}
 onClick={() => handleSelectResult(result)}
 className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
 isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'
 }`}
 style={{ 
 backgroundColor: isSelected ? semantic['surface.tertiary'] : 'transparent'
 }}
 >
 <div 
 className="p-2 rounded-lg"
 style={{ 
 backgroundColor: `${moduleColor}15`,
 }}
 >
 <Icon className="w-4 h-4" style={{ color: moduleColor }} />
 </div>
 
 <div className="flex-1 min-w-0">
 <div className="font-medium truncate" style={{ color: semantic['text.primary'] }}>
 {result.name}
 </div>
 {result.subtitle && (
 <div className="text-sm truncate" style={{ color: semantic['text.muted'] }}>
 {result.subtitle}
 </div>
 )}
 </div>
 
 <div className="text-right">
 <div 
 className="px-2 py-1 rounded-full text-xs font-medium"
 style={{ 
 backgroundColor: `${moduleColor}15`,
 color: moduleColor
 }}
 >
 {result.module.replace(/([A-Z])/g, ' $1').trim()}
 </div>
 <div className="text-xs mt-1" style={{ color: semantic['text.muted'] }}>
 {result.type}
 </div>
 </div>
 </button>
 );
 })}
 </div>
 ) : query.length > 0 && !isSearching ? (
 <div className="p-8 text-center">
 <div className="text-lg font-medium mb-2" style={{ color: semantic['text.primary'] }}>
 No results found
 </div>
 <div style={{ color: semantic['text.muted'] }}>
 Try searching with different terms
 </div>
 </div>
 ) : (
 <div className="p-8 text-center">
 <div className="text-lg font-medium mb-2" style={{ color: semantic['text.primary'] }}>
 Global Search
 </div>
 <div style={{ color: semantic['text.muted'] }}>
 Search for patients, providers, facilities, or clinical concepts across all modules
 </div>
 </div>
 )}
 </div>

 {/* Search Tips */}
 <div 
 className="px-4 py-3 border-t text-xs"
 style={{ 
 borderColor: semantic['border.muted'],
 color: semantic['text.muted']
 }}
 >
 <div className="flex items-center justify-between">
 <span>Use ↑↓ to navigate, ↵ to select, esc to close</span>
 <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
 </div>
 </div>
 </div>
 </div>
 )}
 </>
  );
};