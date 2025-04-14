import React, { useState } from 'react';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
import { JournalEntry } from './types';

function App() {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectEntry = (entry: JournalEntry | null) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-[#fdfaf6] min-h-screen">
      <JournalView onSelectEntry={handleSelectEntry} />

      {isModalOpen && (
        <EntryModal
          entry={selectedEntry}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEntry(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
