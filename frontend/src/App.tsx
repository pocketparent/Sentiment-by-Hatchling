import React, { useState } from 'react';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
// import './App.css'; // ← remove this line

function App() {
  const [selectedEntry, setSelectedEntry] = useState(null);

  return (
    <div className="app-container">
      <JournalView onSelectEntry={setSelectedEntry} />
      {selectedEntry && (
        <EntryModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}

export default App;
