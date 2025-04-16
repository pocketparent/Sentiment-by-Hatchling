import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import { createEntry, updateEntry } from '../api/entries';

interface EntryModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
  onEntrySaved: () => void;
}

const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose, onEntrySaved }) => {
  const [content, setContent] = useState(entry?.content || '');
  const [tags, setTags] = useState(entry?.tags?.join(', ') || '');
  const [dateOfMemory, setDateOfMemory] = useState(entry?.date_of_memory || '');
  const [privacy, setPrivacy] = useState(entry?.privacy || 'private');
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(entry?.media_url || null);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Handle media file selection
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setMedia(file);
    
    if (file) {
      // Create preview URL for the selected file
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
    } else {
      setMediaPreview(entry?.media_url || null);
    }
  };

  // Remove selected media
  const handleRemoveMedia = () => {
    setMedia(null);
    setMediaPreview(null);
    
    // Reset the file input
    const fileInput = document.getElementById('media-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async () => {
    setError('');

    const trimmedContent = content.trim();
    const trimmedDate = dateOfMemory.trim();

    if (!trimmedContent && !media && !entry?.media_url) {
      setError('Please write something or upload a file.');
      return;
    }

    if (!trimmedDate) {
      setError('Please select a date.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (trimmedDate > today) {
      setError('The memory date cannot be in the future.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('content', trimmedContent);
      formData.append('date_of_memory', trimmedDate);
      formData.append('privacy', privacy);
      formData.append('source_type', 'app');
      formData.append('author_id', 'demo');

      // Process tags
      const tagList = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
        
      // If no tags provided, API will generate AI tags
      tagList.forEach((tag) => formData.append('tags', tag));

      if (media) {
        formData.append('media', media);
      }

      if (entry?.entry_id) {
        await updateEntry(entry.entry_id, formData);
      } else {
        await createEntry(formData);
      }

      onEntrySaved();
      onClose();
    } catch (err) {
      console.error('🔥 Entry save failed:', err);
      setError('Something went wrong. Please try again.');
    }
  };

  // Determine if the file is an image for preview
  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || 
           (media && media.type.startsWith('image/'));
  };

  // Determine if the file is a video for preview
  const isVideoFile = (url: string) => {
    return /\.(mp4|webm|ogg|mov)$/i.test(url) || 
           (media && media.type.startsWith('video/'));
  };

  // Determine if the file is an audio for preview
  const isAudioFile = (url: string) => {
    return /\.(mp3|wav|ogg)$/i.test(url) || 
           (media && media.type.startsWith('audio/'));
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

        {error && (
          <p className="text-red-500 text-sm mb-2 p-2 bg-blush-pink rounded-lg">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <textarea
            placeholder="Write your memory here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-warm-sand rounded-2xl px-4 py-2 text-sm bg-white placeholder-dusty-taupe focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
            rows={4}
          />

          <input
            type="text"
            placeholder="Tags (e.g., first smile, milestone, funny)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full border border-warm-sand rounded-2xl px-4 py-2 text-sm bg-white placeholder-dusty-taupe focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
          />

          <input
            type="date"
            value={dateOfMemory}
            onChange={(e) => setDateOfMemory(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full border border-warm-sand rounded-2xl px-4 py-2 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-clay-brown mb-1">
              Privacy
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="private"
                  checked={privacy === 'private'}
                  onChange={() => setPrivacy('private')}
                  className="mr-2 text-clay-brown focus:ring-blush-pink"
                />
                <span className="text-sm text-clay-brown">Private</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="shared"
                  checked={privacy === 'shared'}
                  onChange={() => setPrivacy('shared')}
                  className="mr-2 text-clay-brown focus:ring-blush-pink"
                />
                <span className="text-sm text-clay-brown">Shared</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-clay-brown mb-1">
              Upload photo, video, or voice note (optional)
            </label>
            <input
              id="media-upload"
              type="file"
              name="media"
              accept="image/*,video/*,audio/*"
              onChange={handleMediaChange}
              className="block w-full text-sm text-clay-brown file:mr-4 file:py-2 file:px-4 file:rounded-2xl file:border-0 file:text-sm file:font-semibold file:bg-warm-sand file:text-clay-brown hover:file:bg-blush-pink"
            />
          </div>

          {/* Media Preview */}
          {mediaPreview && (
            <div className="mt-2 relative">
              <div className="bg-white p-2 rounded-2xl border border-warm-sand">
                {isImageFile(mediaPreview) && (
                  <img 
                    src={mediaPreview} 
                    alt="Preview" 
                    className="w-full h-auto rounded-xl object-contain max-h-48"
                  />
                )}
                {isVideoFile(mediaPreview) && (
                  <video 
                    src={mediaPreview} 
                    controls 
                    className="w-full h-auto rounded-xl max-h-48"
                  />
                )}
                {isAudioFile(mediaPreview) && (
                  <audio 
                    src={mediaPreview} 
                    controls 
                    className="w-full"
                  />
                )}
                <button
                  onClick={handleRemoveMedia}
                  className="absolute top-4 right-4 bg-clay-brown text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-500"
                  aria-label="Remove media"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className="mt-6 w-full bg-warm-sand text-clay-brown py-2 rounded-2xl hover:bg-blush-pink transition font-medium"
        >
          {entry ? 'Update Memory' : 'Save Memory'}
        </button>
      </div>
    </div>
  );
};

export default EntryModal;
