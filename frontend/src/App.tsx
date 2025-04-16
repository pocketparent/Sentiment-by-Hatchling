import React, { useState } from 'react';
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

  return (
    <Router>
      <div className="bg-[#fefcf9] min-h-screen text-neutral-800 relative">
        <img
          src="/hatchling-logo.png"
          alt="Hatchling logo"
          className="h-12 mx-auto mt-6 mb-2"
        />

        <Routes>
          <Route path="/" element={
            <JournalView 
              onSelectEntry={openModal} 
              onOpenSettings={openSettings}
            />
          } />
          <Route path="/login" element={<Login />} />
        </Routes>

        {/* Removed duplicate + button from here since it's now in JournalView */}

        {isModalOpen && (
          <EntryModal
            entry={selectedEntry}
            onClose={closeModal}
            onEntrySaved={() => {
              closeModal();
              // Force refresh of journal entries
            }}
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
