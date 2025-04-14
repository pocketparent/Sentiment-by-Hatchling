import React, { useState } from 'react';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';

function App() {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const handleNewEntry = () => {
    setCreatingNew(true);
    setSelectedEntry(null);
  };

  const closeModal = () => {
    setCreatingNew(false);
    setSelectedEntry(null);
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      <JournalView onSelectEntry={setSelectedEntry} />
      {(selectedEntry || creatingNew) && (
        <EntryModal
          entry={selectedEntry}
          onClose={closeModal}
        />
      )}
      <button
        className="fixed bottom-6 right-6 bg-black text-white rounded-full w-14 h-14 text-3xl shadow-lg hover:bg-gray-800"
        onClick={handleNewEntry}
        aria-label="Add new entry"
      >
        +
      </button>
    </div>
  );
}

export default App;
