import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import { EntryFilters } from '../types/entry';
import { fetchEntries } from '../api/entries';
import EntryCard from './EntryCard';
import EmptyState from './EmptyState';
import { Settings, Trash, Search, Tag, Filter, Calendar, User, Eye } from 'lucide-react';
import EntryModal from './EntryModal';

interface Props {
  onSelectEntry: (entry: JournalEntry | null) => void;
}

const JournalView: React.FC<Props> = ({ onSelectEntry }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<EntryFilters>({});
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadEntries = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEntries(filters);
      setEntries(data);
      setFilteredEntries(data);
    } catch (error: any) {
      console.error('Failed to fetch entries:', error);
      setError('Failed to load memories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load entries on initial render and when filters change
  useEffect(() => {
    loadEntries();
  }, [refreshTrigger, JSON.stringify(filters)]);

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
      const res = await fetch(`/api/entry/${id}`, { 
        method: "DELETE",
        headers: {
          'X-User-ID': localStorage.getItem('userId') || 'demo'
        }
      });
      
      if (res.ok) {
        setEntries(prev => prev.filter(e => e.entry_id !== id));
      } else {
        alert("Delete failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting memory.");
    }
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setShowModal(true);
  };

  const handleEntrySaved = () => {
    // Trigger a refresh of the entries
    setRefreshTrigger(prev => prev + 1);
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
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setSearch('');
    setShowFilters(false);
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
          onEntrySaved={handleEntrySaved}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-clay-brown">Your Memories</h2>
        <button
          className="text-clay-brown hover:text-black transition"
          aria-label="Settings"
          onClick={() => onSelectEntry(null)}
        >
          <Settings size={20} />
        </button>
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

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-blush-pink bg-opacity-30 text-red-500 text-sm rounded-xl">
          {error}
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

      {/* New memory button */}
      <button
        onClick={() => {
          setSelectedEntry(null);
          setShowModal(true);
        }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-warm-sand hover:bg-blush-pink text-clay-brown rounded-full w-14 h-14 shadow-md flex items-center justify-center text-2xl transition-colors"
        title="New Memory"
      >
        +
      </button>
    </div>
  );
};

export default JournalView;
