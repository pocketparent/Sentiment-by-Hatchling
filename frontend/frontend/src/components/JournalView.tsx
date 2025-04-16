import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import { EntryFilters } from '../types/entry';
import { fetchEntries, deleteEntry } from '../api/entries';
import EntryCard from './EntryCard';
import EmptyState from './EmptyState';
import { Trash, Search, Tag, Filter, Calendar, User, Eye } from 'lucide-react';

interface Props {
  entries: JournalEntry[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSearch: (term: string) => void;
  onTagFilter: (tags: string[]) => void;
  onPrivacyFilter: (privacy: string | null) => void;
  onAddEntry: () => void;
  onEditEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onOpenSettings: () => void;
}

const JournalView: React.FC<Props> = ({ 
  entries, 
  isLoading, 
  error, 
  onRetry, 
  onSearch, 
  onTagFilter, 
  onPrivacyFilter, 
  onAddEntry, 
  onEditEntry,
  onDeleteEntry,
  onOpenSettings
}) => {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<EntryFilters>({});
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearch(term);
    onSearch(term);
  };

  // Handle delete confirmation
  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this memory?");
    if (!confirmed) return;
    onDeleteEntry(id);
  };

  // Extract all unique tags from entries
  const allTags = Array.from(
    new Set(
      entries.flatMap(entry => entry.tags || [])
    )
  ).sort();

  // Update a specific filter
  const updateFilter = (key: keyof EntryFilters, value: string | undefined) => {
    const newFilters = {
      ...filters,
      [key]: value
    };
    setFilters(newFilters);
    
    // Update parent component filters
    if (key === 'tag') {
      onTagFilter(value ? [value] : []);
    } else if (key === 'privacy') {
      onPrivacyFilter(value || null);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearch('');
    setShowFilters(false);
    onSearch('');
    onTagFilter([]);
    onPrivacyFilter(null);
  };

  return (
    <div className="relative px-4 py-6 max-w-2xl mx-auto pb-24 bg-soft-beige min-h-screen">
      <div className="flex justify-center items-center mb-6 relative">
        <h2 className="text-2xl font-semibold text-clay-brown">Memory Journal</h2>
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
          onChange={handleSearchChange}
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
          <span>{error}</span>
          <button 
            onClick={onRetry}
            className="text-clay-brown hover:text-black text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clay-brown"></div>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.entry_id}
              className="relative bg-white rounded-2xl p-4 shadow-sm border border-warm-sand hover:border-blush-pink transition-colors"
            >
              <div className="flex-grow cursor-pointer" onClick={() => onEditEntry(entry)}>
                <EntryCard entry={entry} onClick={() => onEditEntry(entry)} />
              </div>
              <button
                onClick={() => handleDelete(entry.entry_id)}
                className="absolute top-4 right-4 text-dusty-taupe hover:text-red-500 transition-colors"
                title="Delete Memory"
              >
                <Trash size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New memory button - using clay-brown for better visibility */}
      <button
        onClick={onAddEntry}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-clay-brown hover:bg-blush-pink text-white rounded-full w-14 h-14 shadow-md flex items-center justify-center text-2xl transition-colors"
        title="New Memory"
      >
        +
      </button>
    </div>
  );
};

export default JournalView;
