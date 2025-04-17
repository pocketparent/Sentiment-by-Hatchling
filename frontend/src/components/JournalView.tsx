import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { Search, Filter, FileText, User, Eye, Plus, X } from 'lucide-react';
import EntryCard from './EntryCard';
import EntryModal from './EntryModal';
import { Entry } from '../types/Entry';
import { fetchEntries } from '../api/entries';
import { exportEntriesAsPDF, exportEntriesAsCSV, exportEntriesAsJSON, downloadBlob } from '../api/export';

// Empty state component
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-24 h-24 bg-warm-sand rounded-full flex items-center justify-center mb-4">
      <span className="text-4xl">🐣</span>
    </div>
    <h3 className="text-lg font-medium text-clay-brown mb-2">No memories yet</h3>
    <p className="text-dusty-taupe mb-6 max-w-xs">
      Start capturing moments by adding your first memory or sending an SMS.
    </p>
    <button className="px-4 py-2 bg-clay-brown text-white rounded-xl hover:bg-blush-pink transition-colors">
      Create your first memory
    </button>
  </div>
);

// Filter interface
interface Filters {
  tag?: string;
  privacy?: string;
  author_id?: string;
  start_date?: string;
  end_date?: string;
}

const JournalView: React.FC = () => {
  // State
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');
  
  // Toast for notifications
  const toast = useToast();

  // Fetch entries on component mount
  useEffect(() => {
    fetchEntriesData();
  }, []);

  // Filter entries when search or filters change
  useEffect(() => {
    if (!search && Object.keys(filters).length === 0) {
      setFilteredEntries(entries);
      return;
    }
    
    let filtered = [...entries];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.content?.toLowerCase().includes(searchLower) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply other filters
    if (filters.tag) {
      filtered = filtered.filter(entry => entry.tags?.includes(filters.tag!));
    }
    
    if (filters.privacy) {
      filtered = filtered.filter(entry => entry.privacy === filters.privacy);
    }
    
    if (filters.author_id) {
      filtered = filtered.filter(entry => entry.author_id === filters.author_id);
    }
    
    if (filters.start_date) {
      filtered = filtered.filter(entry => entry.date_of_memory >= filters.start_date!);
    }
    
    if (filters.end_date) {
      filtered = filtered.filter(entry => entry.date_of_memory <= filters.end_date!);
    }
    
    setFilteredEntries(filtered);
  }, [search, filters, entries]);

  // Fetch entries data
  const fetchEntriesData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await fetchEntries();
      setEntries(data);
      setFilteredEntries(data);
    } catch (err) {
      console.error('Error fetching entries:', err);
      setError('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  // Refresh entries
  const onRefresh = useCallback(() => {
    fetchEntriesData();
  }, []);

  // Handle entry click
  const handleEntryClick = (entry: Entry) => {
    if (isSelectionMode) {
      toggleEntrySelection(entry.entry_id);
    } else {
      setSelectedEntry(entry);
      setShowModal(true);
    }
  };

  // Update filter
  const updateFilter = (key: keyof Filters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Apply filters client-side for now
    let filtered = [...entries];
    
    if (value) {
      if (key === 'tag') {
        filtered = filtered.filter(entry => entry.tags?.includes(value));
      } else if (key === 'privacy') {
        filtered = filtered.filter(entry => entry.privacy === value);
      } else if (key === 'author_id') {
        filtered = filtered.filter(entry => entry.author_id === value);
      }
    }
    
    setFilteredEntries(filtered);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearch('');
    setShowFilters(false);
    setFilteredEntries(entries);
  };

  // Retry loading entries
  const handleRetry = () => {
    onRefresh();
  };

  // Selection mode functions
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedEntries([]);
    setExportError('');
  };

  const toggleEntrySelection = (entryId: string) => {
    setSelectedEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId) 
        : [...prev, entryId]
    );
  };

  // Export selected entries
  const exportSelectedEntries = async (format: 'pdf' | 'csv' | 'json') => {
    if (selectedEntries.length === 0) return;
    
    setExportLoading(true);
    setExportError('');
    
    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `hatchling-export-${timestamp}.${format}`;
      
      let blob: Blob;
      
      // Call the appropriate export function based on format
      if (format === 'pdf') {
        blob = await exportEntriesAsPDF(selectedEntries);
      } else if (format === 'csv') {
        blob = await exportEntriesAsCSV(selectedEntries);
      } else {
        blob = await exportEntriesAsJSON(selectedEntries);
      }
      
      // Download the blob
      downloadBlob(blob, filename);
      
      // Show success message
      toast({
        title: 'Export successful',
        description: `Your ${format.toUpperCase()} has been downloaded.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Exit selection mode
      setIsSelectionMode(false);
      setSelectedEntries([]);
    } catch (error: any) {
      console.error(`Export error (${format}):`, error);
      
      // Set error message
      setExportError(error.message || `Failed to export as ${format.toUpperCase()}`);
      
      // Show error toast
      toast({
        title: 'Export failed',
        description: error.message || `Failed to export as ${format.toUpperCase()}`,
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="relative px-4 py-6 max-w-2xl mx-auto pb-24 bg-soft-beige min-h-screen">
      {showModal && (
        <EntryModal
          entry={selectedEntry}
          onClose={() => {
            setShowModal(false);
            setSelectedEntry(null);
          }}
          onEntrySaved={() => {
            onRefresh();
            setShowModal(false);
            setSelectedEntry(null);
          }}
        />
      )}
      
      {/* Header */}
      <div className="flex justify-center mb-6">
        <h1 className="text-2xl font-semibold text-clay-brown">Your Memories</h1>
      </div>
      
      {/* Selection mode header */}
      {isSelectionMode && (
        <div className="mb-4 p-4 bg-white shadow-md rounded-xl flex justify-between items-center sticky top-0 z-10">
          <span className="text-sm font-medium text-clay-brown">
            {selectedEntries.length} {selectedEntries.length === 1 ? 'entry' : 'entries'} selected
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => exportSelectedEntries('pdf')}
              disabled={selectedEntries.length === 0 || exportLoading}
              className="px-4 py-2 text-sm bg-clay-brown text-white rounded-lg hover:bg-blush-pink transition-colors disabled:opacity-50 flex items-center"
            >
              <FileText size={16} className="mr-2" />
              Download PDF
            </button>
            <button
              onClick={() => exportSelectedEntries('csv')}
              disabled={selectedEntries.length === 0 || exportLoading}
              className="px-4 py-2 text-sm bg-clay-brown text-white rounded-lg hover:bg-blush-pink transition-colors disabled:opacity-50 flex items-center"
            >
              <FileText size={16} className="mr-2" />
              Download CSV
            </button>
            <button
              onClick={toggleSelectionMode}
              className="px-4 py-2 text-sm bg-warm-sand text-clay-brown rounded-lg hover:bg-blush-pink transition-colors flex items-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Export error message */}
      {exportError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
          <div className="flex items-start">
            <X size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Export failed</p>
              <p>{exportError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search size={16} className="text-dusty-taupe" />
        </div>
        <input
          type="text"
          className="w-full rounded-2xl border border-warm-sand px-10 py-2 text-sm placeholder-dusty-taupe bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
          placeholder="Search memories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button 
          className={`absolute inset-y-0 right-3 flex items-center ${
            showFilters ? 'text-clay-brown' : 'text-dusty-taupe'
          } hover:text-clay-brown`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} />
        </button>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-white rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-clay-brown">Filters</h3>
            <button 
              onClick={clearFilters}
              className="text-xs text-dusty-taupe hover:text-clay-brown"
            >
              Clear all
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tag filter */}
            <div>
              <label className="block text-xs text-dusty-taupe mb-1 flex items-center">
                <span className="mr-1">#</span> Tag
              </label>
              <input
                type="text"
                value={filters.tag || ''}
                onChange={(e) => updateFilter('tag', e.target.value || undefined)}
                className="w-full rounded-xl border border-warm-sand px-3 py-1 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                placeholder="Filter by tag"
              />
            </div>
            
            {/* Date range filter */}
            <div>
              <label className="block text-xs text-dusty-taupe mb-1">Date range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.start_date || ''}
                  onChange={(e) => updateFilter('start_date', e.target.value || undefined)}
                  className="w-1/2 rounded-xl border border-warm-sand px-3 py-1 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.end_date || ''}
                  onChange={(e) => updateFilter('end_date', e.target.value || undefined)}
                  className="w-1/2 rounded-xl border border-warm-sand px-3 py-1 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                  placeholder="To"
                />
              </div>
            </div>
            
            {/* Author filter */}
            <div>
              <label className="block text-xs text-dusty-taupe mb-1 flex items-center">
                <User size={12} className="mr-1" /> Author
              </label>
              <select
                value={filters.author_id || ''}
                onChange={(e) => updateFilter('author_id', e.target.value || undefined)}
                className="w-full rounded-xl border border-warm-sand px-3 py-1 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
              >
                <option value="">All authors</option>
                <option value="demo">You</option>
                {/* Add other authors dynamically if needed */}
              </select>
            </div>
            
            {/* Privacy filter */}
            <div>
              <label className="block text-xs text-dusty-taupe mb-1 flex items-center">
                <Eye size={12} className="mr-1" /> Privacy
              </label>
              <div className="flex space-x-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy-filter"
                    checked={!filters.privacy}
                    onChange={() => updateFilter('privacy', undefined)}
                    className="mr-1 text-clay-brown focus:ring-blush-pink"
                  />
                  <span className="text-xs">All</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy-filter"
                    checked={filters.privacy === 'private'}
                    onChange={() => updateFilter('privacy', 'private')}
                    className="mr-1 text-clay-brown focus:ring-blush-pink"
                  />
                  <span className="text-xs">Private</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy-filter"
                    checked={filters.privacy === 'shared'}
                    onChange={() => updateFilter('privacy', 'shared')}
                    className="mr-1 text-clay-brown focus:ring-blush-pink"
                  />
                  <span className="text-xs">Shared</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message with retry button */}
      {error && (
        <div className="mb-4 p-3 bg-blush-pink bg-opacity-30 text-red-500 text-sm rounded-xl flex justify-between items-center">
          <span>Oops, we couldn't load your memories! Check your network and try again.</span>
          <button 
            onClick={handleRetry}
            className="text-clay-brown hover:text-black text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clay-brown"></div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.entry_id}
              className={`relative bg-white rounded-2xl p-4 shadow-sm border ${
                selectedEntries.includes(entry.entry_id) 
                  ? 'border-clay-brown' 
                  : 'border-warm-sand hover:border-blush-pink'
              } transition-colors`}
            >
              {isSelectionMode && (
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedEntries.includes(entry.entry_id)}
                    onChange={() => toggleEntrySelection(entry.entry_id)}
                    className="h-5 w-5 text-clay-brown border-warm-sand rounded focus:ring-blush-pink"
                  />
                </div>
              )}
              
              <div 
                className={isSelectionMode ? 'pl-8' : ''}
                onClick={() => handleEntryClick(entry)}
              >
                <EntryCard entry={entry} />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add new entry button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={isSelectionMode ? toggleSelectionMode : () => {
            setSelectedEntry(null);
            setShowModal(true);
          }}
          className="h-14 w-14 rounded-full bg-clay-brown text-white shadow-lg flex items-center justify-center hover:bg-blush-pink transition-colors"
        >
          {isSelectionMode ? <X size={24} /> : <Plus size={24} />}
        </button>
      </div>
      
      {/* Selection mode toggle */}
      {!isSelectionMode && (
        <div className="fixed bottom-6 left-6">
          <button
            onClick={toggleSelectionMode}
            className="h-12 w-12 rounded-full bg-white border border-warm-sand text-clay-brown shadow-md flex items-center justify-center hover:bg-blush-pink hover:text-white transition-colors"
            aria-label="Select multiple entries"
            title="Select multiple entries"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default JournalView;
