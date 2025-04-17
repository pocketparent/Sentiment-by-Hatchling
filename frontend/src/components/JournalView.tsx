import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import { EntryFilters } from '../types/entry';
import EntryCard from './EntryCard';
import EmptyState from './EmptyState';
import { Settings, Trash, Search, Tag, Filter, Calendar, User, Eye, Download, FileText } from 'lucide-react';
import EntryModal from './EntryModal';
import { deleteEntry } from '../api/entries';

interface Props {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry | null) => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
}

const JournalView: React.FC<Props> = ({ entries, onSelectEntry, onOpenSettings, onRefresh }) => {
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<EntryFilters>({});
  const [error, setError] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Initialize filtered entries with all entries
  useEffect(() => {
    setFilteredEntries(entries);
    setLoading(false);
  }, [entries]);

  // Apply search filter separately (client-side filtering)
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredEntries(entries);
    } else {
      const lowerSearch = search.toLowerCase();
      setFilteredEntries(
        entries.filter((entry) =>
          entry.content?.toLowerCase().includes(lowerSearch) ||
          entry.tags?.some(tag => tag.toLowerCase().includes(lowerSearch))
        )
      );
    }
  }, [search, entries]);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this memory?");
    if (!confirmed) return;

    try {
      const result = await deleteEntry(id);
      
      if (result.success) {
        // Trigger refresh from parent component
        onRefresh();
      } else {
        alert("Delete failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting memory.");
    }
  };

  const handleEditEntry = (entry: JournalEntry) => {
    onSelectEntry(entry);
  };

  // Extract all unique tags from entries
  const allTags = Array.from(
    new Set(
      entries.flatMap(entry => entry.tags || [])
    )
  ).sort();

  // Update a specific filter
  const updateFilter = (key: keyof EntryFilters, value: string | undefined) => {
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

  // Export functions
  const exportToPDF = (entryId?: string) => {
    setExportLoading(true);
    const endpoint = entryId 
      ? `/api/export/pdf?entry_id=${entryId}` 
      : '/api/export/pdf';
    
    window.location.href = endpoint;
    setTimeout(() => setExportLoading(false), 1000);
  };

  const exportToCSV = (entryId?: string) => {
    setExportLoading(true);
    const endpoint = entryId 
      ? `/api/export/csv?entry_id=${entryId}` 
      : '/api/export/csv';
    
    window.location.href = endpoint;
    setTimeout(() => setExportLoading(false), 1000);
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
            setShowModal(false);
            setSelectedEntry(null);
            onRefresh();
          }}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-clay-brown">Your Memories</h2>
        <div className="flex items-center space-x-2">
          {/* Export dropdown */}
          <div className="relative">
            <button
              className="text-clay-brown hover:text-black transition"
              aria-label="Export"
              onClick={() => setShowExportOptions(!showExportOptions)}
            >
              <Download size={20} />
            </button>
            
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 z-10 border border-warm-sand">
                <button
                  onClick={() => {
                    exportToPDF();
                    setShowExportOptions(false);
                  }}
                  disabled={exportLoading}
                  className="flex items-center px-4 py-2 text-sm text-clay-brown hover:bg-soft-beige w-full text-left"
                >
                  <FileText size={16} className="mr-2" />
                  Export all as PDF
                </button>
                <button
                  onClick={() => {
                    exportToCSV();
                    setShowExportOptions(false);
                  }}
                  disabled={exportLoading}
                  className="flex items-center px-4 py-2 text-sm text-clay-brown hover:bg-soft-beige w-full text-left"
                >
                  <FileText size={16} className="mr-2" />
                  Export all as CSV
                </button>
              </div>
            )}
          </div>
          
          <button
            className="text-clay-brown hover:text-black transition"
            aria-label="Settings"
            onClick={onOpenSettings}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

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

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-4 p-4 bg-white rounded-2xl border border-warm-sand">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-clay-brown">Filters</h3>
            <button 
              className="text-xs text-dusty-taupe hover:text-clay-brown"
              onClick={clearFilters}
            >
              Clear all
            </button>
          </div>
          
          <div className="space-y-3">
            {/* Tag filter */}
            <div>
              <label className="block text-xs text-dusty-taupe mb-1 flex items-center">
                <Tag size={12} className="mr-1" /> Tag
              </label>
              <select
                value={filters.tag || ''}
                onChange={(e) => updateFilter('tag', e.target.value || undefined)}
                className="w-full rounded-xl border border-warm-sand px-3 py-1 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
              >
                <option value="">All tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            
            {/* Date range filter */}
            <div>
              <label className="block text-xs text-dusty-taupe mb-1 flex items-center">
                <Calendar size={12} className="mr-1" /> Date Range
              </label>
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
              className="relative bg-white rounded-2xl p-4 shadow-sm border border-warm-sand hover:border-blush-pink transition-colors"
            >
              <div className="flex-grow cursor-pointer" onClick={() => handleEditEntry(entry)}>
                <EntryCard entry={entry} onClick={() => handleEditEntry(entry)} />
              </div>
              <div className="absolute top-4 right-4 flex space-x-2">
                {/* Export dropdown for individual entry */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEntry(entry);
                      setShowExportOptions(prev => selectedEntry?.entry_id === entry.entry_id ? !prev : true);
                    }}
                    className="text-dusty-taupe hover:text-clay-brown transition-colors"
                    title="Export Memory"
                    aria-label="Export Memory"
                  >
                    <Download size={16} />
                  </button>
                  
                  {showExportOptions && selectedEntry?.entry_id === entry.entry_id && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg py-1 z-10 border border-warm-sand">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportToPDF(entry.entry_id);
                          setShowExportOptions(false);
                        }}
                        disabled={exportLoading}
                        className="flex items-center px-3 py-2 text-xs text-clay-brown hover:bg-soft-beige w-full text-left"
                      >
                        <FileText size={14} className="mr-2" />
                        Export as PDF
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportToCSV(entry.entry_id);
                          setShowExportOptions(false);
                        }}
                        disabled={exportLoading}
                        className="flex items-center px-3 py-2 text-xs text-clay-brown hover:bg-soft-beige w-full text-left"
                      >
                        <FileText size={14} className="mr-2" />
                        Export as CSV
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(entry.entry_id);
                  }}
                  className="text-dusty-taupe hover:text-red-500 transition-colors"
                  title="Delete Memory"
                  aria-label="Delete Memory"
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New memory button - using clay-brown for better visibility */}
      <button
        onClick={() => onSelectEntry(null)}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-clay-brown hover:bg-blush-pink text-white rounded-full w-14 h-14 shadow-md flex items-center justify-center text-2xl transition-colors"
        title="New Memory"
        aria-label="Create New Memory"
      >
        +
      </button>
    </div>
  );
};

export default JournalView;
