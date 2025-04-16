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
        console.log("Fetching entries...");
        const response = await fetch('/api/entry', {
          headers: {
            'X-User-ID': localStorage.getItem('userId') || 'demo'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Entries fetched successfully:", data);
          if (data.entries && Array.isArray(data.entries)) {
            setEntries(data.entries);
          } else {
            console.error('Unexpected response format:', data);
            setEntries([]);
          }
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
    console.log("Entry saved, refreshing entries...");
    setRefreshTrigger(prev => prev + 1);
    closeModal();
  };

  return (
    <Router>
      <div className="bg-[#fefcf9] min-h-screen text-neutral-800 relative">
        <img
          src="/hatchling-logo.png"
          alt="Hatchling logo"
          className="h-20 mx-auto mt-6 mb-1" // Increased logo size from h-16 to h-20 and reduced bottom margin
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
