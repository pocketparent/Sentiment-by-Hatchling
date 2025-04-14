import React, { useState } from 'react';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
// import Header from './components/Header'; // ❌ Just remove or comment this out
import './App.css';

function App() {
  const [selectedEntry, setSelectedEntry] = useState(null);

  return (
    <div className="app-container">
      {/* Optional Header */}
      {/* <Header /> */}

      {/* Journal Feed */}
      <JournalView onSelectEntry={setSelectedEntry} />

      {/* Modal for Editing */}
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
