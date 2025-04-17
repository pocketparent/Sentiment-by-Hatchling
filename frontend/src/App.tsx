import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
import Settings from './components/Settings';
import Login from './components/Login';
import { JournalEntry } from './types';

function App() {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch entries when the app loads or when refreshTrigger changes
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch('/api/entries', {
          headers: {
            'X-User-ID': localStorage.getItem('userId') || 'demo'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setEntries(data);
        } else {
          console.error('Failed to fetch entries:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching entries:', error);
      }
    };

    fetchEntries();
  }, [refreshTrigger]);

  const openModal = (entry: JournalEntry | null = null) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedEntry(null);
    setIsModalOpen(false);
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  const handleEntrySaved = () => {
    // Trigger a refresh of entries
    setRefreshTrigger(prev => prev + 1);
    closeModal();
  };

  return (
    <Router>
      <div className="bg-[#fefcf9] min-h-screen text-neutral-800 relative">
        <img
          src="/hatchling-logo.png"
          alt="Hatchling logo"
          className="h-16 mx-auto mt-6 mb-2" // Increased logo size from h-12 to h-16
        />

        <Routes>
          <Route path="/" element={
            <JournalView 
              entries={entries}
              onSelectEntry={openModal} 
              onOpenSettings={openSettings}
              onRefresh={() => setRefreshTrigger(prev => prev + 1)}
            />
          } />
          <Route path="/login" element={<Login />} />
        </Routes>

        {isModalOpen && (
          <EntryModal
            entry={selectedEntry}
            onClose={closeModal}
            onEntrySaved={handleEntrySaved}
          />
        )}

        {showSettings && (
          <Settings onClose={closeSettings} />
        )}
      </div>
    </Router>
  );
}

export default App;
