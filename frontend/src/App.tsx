// App.tsx fixes for proper entry management and display

import React, { useState, useEffect } from 'react';
import { fetchEntries, createEntry, EntryInput, Entry } from './api/entries';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  // Load entries when component mounts
  useEffect(() => {
    loadEntries();
  }, []);

  // Function to load entries from API
  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedEntries = await fetchEntries();
      console.log('Entries loaded in App:', fetchedEntries);
      setEntries(fetchedEntries);
    } catch (err) {
      console.error('Error loading entries:', err);
      setError('Failed to load memories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle entry creation
  const handleCreateEntry = async (entryData: EntryInput) => {
    try {
      const newEntry = await createEntry(entryData);
      setEntries(prevEntries => [newEntry, ...prevEntries]);
      setShowEntryModal(false);
      return true;
    } catch (err) {
      console.error('Error creating entry:', err);
      return false;
    }
  };

  // Function to handle entry selection for editing
  const handleSelectEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setShowEntryModal(true);
  };

  // Function to handle entry update
  const handleUpdateEntry = async (updatedEntry: Entry) => {
    try {
      // Update entry in state
      setEntries(prevEntries => 
        prevEntries.map(entry => 
          entry.entry_id === updatedEntry.entry_id ? updatedEntry : entry
        )
      );
      setShowEntryModal(false);
      setSelectedEntry(null);
      return true;
    } catch (err) {
      console.error('Error updating entry:', err);
      return false;
    }
  };

  // Function to handle entry deletion
  const handleDeleteEntry = async (entryId: string) => {
    try {
      // Remove entry from state
      setEntries(prevEntries => 
        prevEntries.filter(entry => entry.entry_id !== entryId)
      );
      setShowEntryModal(false);
      setSelectedEntry(null);
      return true;
    } catch (err) {
      console.error('Error deleting entry:', err);
      return false;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="logo-container">
          <img src="/logo.png" alt="Hatchling" className="h-24 mb-2" />
          <h1 className="text-2xl font-bold">Hatchling</h1>
        </div>
      </header>

      <main className="App-main">
        <JournalView 
          entries={entries}
          loading={loading}
          error={error}
          onRetry={loadEntries}
          onNewEntry={() => {
            setSelectedEntry(null);
            setShowEntryModal(true);
          }}
          onSelectEntry={handleSelectEntry}
          onOpenSettings={() => setShowSettings(true)}
        />

        {showEntryModal && (
          <EntryModal
            entry={selectedEntry}
            onClose={() => {
              setShowEntryModal(false);
              setSelectedEntry(null);
            }}
            onSave={selectedEntry ? handleUpdateEntry : handleCreateEntry}
            onDelete={selectedEntry ? handleDeleteEntry : undefined}
          />
        )}

        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
