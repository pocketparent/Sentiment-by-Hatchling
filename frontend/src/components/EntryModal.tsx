import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import EntryForm from './EntryForm';
import { Edit, X } from 'lucide-react';

interface EntryModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
  onEntrySaved: () => void;
  viewOnly?: boolean;
}

const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose, onEntrySaved, viewOnly = false }) => {
  const [isEditMode, setIsEditMode] = useState(!viewOnly);

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

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-0"
      onClick={handleOverlayClick}
    >
      <div className="bg-soft-beige rounded-2xl w-full max-w-md p-6 relative shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Close button - moved to top-right corner with better spacing */}
        <button
          className="absolute top-3 right-3 text-clay-brown hover:text-black text-xl p-1 rounded-full hover:bg-warm-sand/50 transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        
        {isEditMode ? (
          <>
            <h2 className="text-xl font-semibold mb-4 text-clay-brown pr-8">
              {entry ? 'Edit Memory' : 'New Memory'}
            </h2>

            <EntryForm 
              entry={entry}
              onClose={onClose}
              onEntrySaved={onEntrySaved}
            />
          </>
        ) : (
          <div className="view-only-mode">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-clay-brown">
                Memory
              </h2>
              {/* Edit button - positioned with proper spacing from close button */}
              <button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-1 px-3 py-1 bg-clay-brown text-white rounded-lg hover:bg-blush-pink transition-colors text-sm mr-8"
                aria-label="Edit Memory"
              >
                <Edit size={16} />
                Edit
              </button>
            </div>
            
            {entry && (
              <div className="space-y-4">
                {/* Date */}
                <div className="text-sm text-dusty-taupe">
                  {entry.date_of_memory && formatDate(entry.date_of_memory)}
                </div>
                
                {/* Media */}
                {entry.media_url && (
                  <div className="rounded-xl overflow-hidden mb-3">
                    {entry.media_type?.startsWith('image/') ? (
                      <img 
                        src={entry.media_url} 
                        alt="Memory" 
                        className="w-full h-auto rounded-xl"
                        loading="lazy"
                      />
                    ) : entry.media_type?.startsWith('video/') ? (
                      <video 
                        src={entry.media_url} 
                        controls 
                        className="w-full h-auto rounded-xl"
                        preload="metadata"
                      />
                    ) : entry.media_type?.startsWith('audio/') ? (
                      <audio 
                        src={entry.media_url} 
                        controls 
                        className="w-full"
                      />
                    ) : null}
                  </div>
                )}
                
                {/* Content */}
                <div className="text-clay-brown whitespace-pre-wrap">
                  {entry.content}
                </div>
                
                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {entry.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="px-2 py-1 bg-warm-sand text-clay-brown rounded-lg text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Privacy */}
                <div className="text-xs text-dusty-taupe mt-4">
                  {entry.privacy === 'private' ? 'Private memory' : 'Shared with caregivers'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EntryModal;
