import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import EntryForm from './EntryForm';

interface EntryModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
  onEntrySaved: () => void;
}

const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose, onEntrySaved }) => {
  useEffect(() => {
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-0"
      onClick={handleOverlayClick}
    >
      <div className="bg-soft-beige rounded-2xl w-full max-w-md p-6 relative shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 text-clay-brown hover:text-black text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-semibold mb-4 text-clay-brown">
          {entry ? 'Edit Memory' : 'New Memory'}
        </h2>

        <EntryForm 
          entry={entry}
          onClose={onClose}
          onEntrySaved={onEntrySaved}
        />
      </div>
    </div>
  );
};

export default EntryModal;
