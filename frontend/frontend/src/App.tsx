import React, { useState, useEffect } from 'react';
import './App.css';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
import Settings from './components/Settings';
import { fetchEntries, createEntry, updateEntry, deleteEntry } from './api/entries';
import { JournalEntry } from './types';
import { EntryFilters } from './types/entry';
import { Settings as SettingsIcon } from 'lucide-react';

function App() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPrivacy, setSelectedPrivacy] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [filters, setFilters] = useState<EntryFilters>({});

  // Load entries when component mounts or filters change
  useEffect(() => {
    loadEntries();
  }, [JSON.stringify(filters)]);

  // Filter entries when search term, tags, or privacy changes
  useEffect(() => {
    filterEntries();
  }, [entries, searchTerm, selectedTags, selectedPrivacy]);

  const loadEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Loading entries with filters:', filters);
      const fetchedEntries = await fetchEntries(filters);
      console.log('Fetched entries:', fetchedEntries);
      setEntries(fetchedEntries);
    } catch (err) {
      console.error('Error fetching entries from API:', err);
      setError('Failed to load memories. Please try again.');
      // Keep existing entries instead of clearing them
    } finally {
      setIsLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = [...entries];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(entry => 
        selectedTags.every(tag => entry.tags?.includes(tag))
      );
    }

    // Filter by privacy
    if (selectedPrivacy) {
      filtered = filtered.filter(entry => entry.privacy === selectedPrivacy);
    }

    setFilteredEntries(filtered);
  };

  const handleAddEntry = (newEntry: JournalEntry) => {
    setEntries(prevEntries => [newEntry, ...prevEntries]);
    setShowEntryModal(false);
  };

  const handleUpdateEntry = (updatedEntry: JournalEntry) => {
    setEntries(prevEntries => 
      prevEntries.map(entry => 
        entry.entry_id === updatedEntry.entry_id ? updatedEntry : entry
      )
    );
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteEntry(entryId);
      setEntries(prevEntries => 
        prevEntries.filter(entry => entry.entry_id !== entryId)
      );
    } catch (error) {
      console.error('Failed to delete entry:', error);
      setError('Failed to delete entry. Please try again.');
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleTagFilter = (tags: string[]) => {
    setSelectedTags(tags);
    setFilters(prev => ({
      ...prev,
      tag: tags.length === 1 ? tags[0] : undefined
    }));
  };

  const handlePrivacyFilter = (privacy: string | null) => {
    setSelectedPrivacy(privacy);
    setFilters(prev => ({
      ...prev,
      privacy: privacy || undefined
    }));
  };

  const handleRetry = () => {
    loadEntries();
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setShowEntryModal(true);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="logo-container">
          <img src="/hatchling-logo.png" alt="Hatchling" className="h-8" />
          <h1 className="text-2xl font-bold">Hatchling</h1>
        </div>
        <button 
          className="settings-button"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      <main className="App-main">
        <JournalView 
          entries={filteredEntries}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
          onSearch={handleSearch}
          onTagFilter={handleTagFilter}
          onPrivacyFilter={handlePrivacyFilter}
          onAddEntry={() => {
            setSelectedEntry(null);
            setShowEntryModal(true);
          }}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
          onOpenSettings={() => setShowSettings(true)}
        />
      </main>

      {showEntryModal && (
        <EntryModal 
          entry={selectedEntry}
          onClose={() => {
            setShowEntryModal(false);
            setSelectedEntry(null);
          }}
          onEntrySaved={(entry) => {
            if (selectedEntry) {
              handleUpdateEntry(entry);
            } else {
              handleAddEntry(entry);
            }
            setShowEntryModal(false);
          }}
        />
      )}

      {showSettings && (
        <Settings 
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;
