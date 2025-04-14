import React, { useState } from 'react';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
import { JournalEntry } from './types';

function App() {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEntrySelect = (entry: JournalEntry | null) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setSelectedEntry(null);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-neutral-800 relative">
      <JournalView onSelectEntry={handleEntrySelect} />

      {/* Floating + Button */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-black text-white text-2xl flex items-center justify-center shadow-lg hover:bg-neutral-800 transition"
        onClick={() => handleEntrySelect(null)}
        aria-label="New Entry"
      >
        +
      </button>

      {/* Modal */}
      {isModalOpen && (
        <EntryModal
          entry={selectedEntry}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

export default App;
