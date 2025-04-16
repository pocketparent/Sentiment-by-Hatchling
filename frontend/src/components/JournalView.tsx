import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JournalEntry } from '../types';
import { fetchEntries } from '../api/entries';
import EntryCard from './EntryCard';
import EmptyState from './EmptyState';
import { Settings, Trash, Search, Tag, Filter } from 'lucide-react';
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
  const [tagFilter, setTagFilter] = useState<string>('');
  const [privacyFilter, setPrivacyFilter] = useState<string>('');
  const navigate = useNavigate();

  const loadEntries = async () => {
    try {
      const data = await fetchEntries();
      setEntries(data);
      setFilteredEntries(data);
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    // Apply all filters
    let result = [...entries];
    
    // Apply search filter
    if (search.trim() !== '') {
      const lowerSearch = search.toLowerCase();
      result = result.filter((entry) =>
        entry.content?.toLowerCase().includes(lowerSearch) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(lowerSearch))
      );
    }
    
    // Apply tag filter
    if (tagFilter) {
      result = result.filter((entry) =>
        entry.tags?.some(tag => tag.toLowerCase() === tagFilter.toLowerCase())
      );
    }
    
    // Apply privacy filter
    if (privacyFilter) {
      result = result.filter((entry) => entry.privacy === privacyFilter);
    }
    
    setFilteredEntries(result);
  }, [search, entries, tagFilter, privacyFilter]);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this memory?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/entry/${id}`, { method: "DELETE" });
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

  // Extract all unique tags from entries
  const allTags = Array.from(
    new Set(
      entries.flatMap(entry => entry.tags || [])
    )
  ).sort();

  const clearFilters = () => {
    setTagFilter('');
    setPrivacyFilter('');
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
          onEntrySaved={loadEntries}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-clay-brown">Your Memories</h2>
        <button
          className="text-clay-brown hover:text-black transition"
          aria-label="Settings"
          onClick={() => navigate('/settings')}
        >
          <Settings size={20} />
        </button>
      </div>

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
          className="absolute inset-y-0 right-3 flex items-center text-dusty-taupe hover:text-clay-brown"
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
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full rounded-xl border border-warm-sand px-3 py-1 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
              >
                <option value="">All tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            
            {/* Privacy filter */}
            <div>
              <label className="block text-xs text-dusty-taupe mb-1">Privacy</label>
              <div className="flex space-x-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy-filter"
                    checked={privacyFilter === ''}
                    onChange={() => setPrivacyFilter('')}
                    className="mr-1 text-clay-brown focus:ring-blush-pink"
                  />
                  <span className="text-xs">All</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy-filter"
                    checked={privacyFilter === 'private'}
                    onChange={() => setPrivacyFilter('private')}
                    className="mr-1 text-clay-brown focus:ring-blush-pink"
                  />
                  <span className="text-xs">Private</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy-filter"
                    checked={privacyFilter === 'shared'}
                    onChange={() => setPrivacyFilter('shared')}
                    className="mr-1 text-clay-brown focus:ring-blush-pink"
                  />
                  <span className="text-xs">Shared</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

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
