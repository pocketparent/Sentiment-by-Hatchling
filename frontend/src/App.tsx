import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import JournalView from './components/JournalView';
import EntryModal from './components/EntryModal';
import Settings from './components/Settings';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import { useState, useEffect } from 'react';
import { JournalEntry } from './types';
import { fetchEntries } from './api/entries';

// Admin route wrapper component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  
  if (!isAdmin) {
    return <Navigate to="/login?role=admin" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status on load
  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
  }, []);

  // Fetch entries when the app loads or when refreshTrigger changes
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const entriesData = await fetchEntries();
        setEntries(entriesData);
      } catch (error) {
        console.error('Error fetching entries:', error);
      }
    };

    loadEntries();
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

        {/* Admin navigation bar - only visible to admin users */}
        {isAdmin && (
          <div className="bg-clay-brown text-white py-2 px-4 mb-4">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <div className="font-medium">Admin Dashboard</div>
              <div className="flex space-x-4">
                <a href="/admin" className="text-white hover:text-soft-beige">Dashboard</a>
                <a href="/" className="text-white hover:text-soft-beige">View App</a>
                <button 
                  onClick={() => {
                    localStorage.removeItem('isAdmin');
                    setIsAdmin(false);
                    window.location.href = '/';
                  }}
                  className="text-white hover:text-soft-beige"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

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
          <Route path="/admin" element={
            <AdminRoute>
              <AdminPanel userId={localStorage.getItem('userId') || ''} isAdmin={true} />
            </AdminRoute>
          } />
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
