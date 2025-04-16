import React, { useState, useEffect } from 'react';
import './App.css';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
import Settings from './components/Settings';
import { fetchEntries } from './api/entries';
import { Entry } from './types/entry';

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPrivacy, setSelectedPrivacy] = useState<string | null>(null);

  // Load entries when component mounts
  useEffect(() => {
    loadEntries();
  }, []);

  // Filter entries when search term, tags, or privacy changes
  useEffect(() => {
    filterEntries();
  }, [entries, searchTerm, selectedTags, selectedPrivacy]);

  const loadEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use mock data if API fails
      try {
        const fetchedEntries = await fetchEntries();
        setEntries(fetchedEntries);
      } catch (err) {
        console.error('Error fetching entries from API, using mock data:', err);
        // Mock data as fallback
        setEntries([]);
      }
    } catch (err) {
      console.error('Error loading entries:', err);
      setError('Failed to load memories. Please try again.');
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

  const handleAddEntry = (newEntry: Entry) => {
    setEntries(prevEntries => [newEntry, ...prevEntries]);
    setShowEntryModal(false);
  };

  const handleUpdateEntry = (updatedEntry: Entry) => {
    setEntries(prevEntries => 
      prevEntries.map(entry => 
        entry.entry_id === updatedEntry.entry_id ? updatedEntry : entry
      )
    );
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntries(prevEntries => 
      prevEntries.filter(entry => entry.entry_id !== entryId)
    );
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleTagFilter = (tags: string[]) => {
    setSelectedTags(tags);
  };

  const handlePrivacyFilter = (privacy: string | null) => {
    setSelectedPrivacy(privacy);
  };

  const handleRetry = () => {
    loadEntries();
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="logo-container">
          <img src="/logo.png" alt="Hatchling" className="h-20" />
          <h1 className="text-2xl font-bold">Hatchling</h1>
        </div>
        <button 
          className="settings-button"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          <i className="fas fa-cog"></i>
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
          onAddEntry={() => setShowEntryModal(true)}
          onEditEntry={(entry) => {
            // Logic for editing entry
          }}
        />
      </main>

      {showEntryModal && (
        <EntryModal 
          onClose={() => setShowEntryModal(false)}
          onSave={handleAddEntry}
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

