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

  const openModal = (entry: JournalEntry | null = null) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedEntry(null);
    setIsModalOpen(false);
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
          <Route path="/" element={<JournalView onSelectEntry={openModal} />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
        </Routes>

        <button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-black text-white text-2xl flex items-center justify-center shadow-lg hover:bg-neutral-800 transition z-50"
          onClick={() => openModal(null)}
          aria-label="New Entry"
        >
          +
        </button>

        {isModalOpen && (
          <EntryModal
            entry={selectedEntry}
            onClose={closeModal}
          />
        )}
      </div>
    </Router>
  );
}

export default App;
