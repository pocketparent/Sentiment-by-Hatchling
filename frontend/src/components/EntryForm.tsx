import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import { EntryFormData } from '../types/entry';
import { createEntry, updateEntry, generateAITags } from '../api/entries';

interface EntryFormProps {
  entry: JournalEntry | null;
  onClose: () => void;
  onEntrySaved: () => void;
}

const EntryForm: React.FC<EntryFormProps> = ({ entry, onClose, onEntrySaved }) => {
  const [content, setContent] = useState(entry?.content || '');
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [dateOfMemory, setDateOfMemory] = useState(entry?.date_of_memory || new Date().toISOString().split('T')[0]);
  const [privacy, setPrivacy] = useState(entry?.privacy || 'private');
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(entry?.media_url || null);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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

  // Add a tag from the input field
  const handleAddTag = () => {
    if (tagInput.trim()) {
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  // Remove a tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle tag input key press (Enter to add)
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Generate AI tags based on content
  const handleGenerateTags = async () => {
    if (content.trim().length < 10) {
      setError('Please write more content to generate tags');
      return;
    }
    
    setIsGeneratingTags(true);
    setError('');
    
    try {
      const generatedTags = await generateAITags(content);
      if (generatedTags.length > 0) {
        // Merge with existing tags, avoiding duplicates
        const newTags = [...tags];
        generatedTags.forEach(tag => {
          if (!newTags.includes(tag)) {
            newTags.push(tag);
          }
        });
        setTags(newTags);
        setSuccessMessage('Tags generated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError('Could not generate tags. Please try again or add them manually.');
      }
    } catch (err) {
      setError('Failed to generate tags. Please try again or add them manually.');
      console.error('Tag generation error:', err);
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    const trimmedContent = content.trim();
    const trimmedDate = dateOfMemory.trim();

    if (!trimmedContent && !media && !entry?.media_url) {
      setError('Please write something or upload a file.');
      setIsSubmitting(false);
      return;
    }

    if (!trimmedDate) {
      setError('Please select a date.');
      setIsSubmitting(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (trimmedDate > today) {
      setError('The memory date cannot be in the future.');
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('content', trimmedContent);
      formData.append('date_of_memory', trimmedDate);
      formData.append('privacy', privacy);
      formData.append('source_type', 'app');
      
      // Add user ID if available
      const userId = localStorage.getItem('userId');
      if (userId) {
        formData.append('author_id', userId);
      }

      // Add tags
      if (tags.length > 0) {
        tags.forEach(tag => formData.append('tags', tag));
      }

      // Add media if selected
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
    } catch (err: any) {
      console.error('🔥 Entry save failed:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
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
    <div className="space-y-4">
      {/* Content textarea */}
      <textarea
        placeholder="Write your memory here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full border border-warm-sand rounded-2xl px-4 py-2 text-sm bg-white placeholder-dusty-taupe focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
        rows={4}
      />

      {/* Tags input */}
      <div className="space-y-2">
        <div className="flex">
          <input
            type="text"
            placeholder="Add a tag (e.g., first smile, milestone)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleTagKeyPress}
            className="flex-1 border border-warm-sand rounded-l-2xl px-4 py-2 text-sm bg-white placeholder-dusty-taupe focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
          />
          <button
            onClick={handleAddTag}
            className="bg-warm-sand text-clay-brown px-4 py-2 rounded-r-2xl hover:bg-blush-pink transition-colors"
          >
            Add
          </button>
        </div>
        
        {/* Generate tags button */}
        <button
          onClick={handleGenerateTags}
          disabled={isGeneratingTags || content.trim().length < 10}
          className={`text-sm text-clay-brown hover:text-black transition-colors ${
            isGeneratingTags || content.trim().length < 10 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isGeneratingTags ? 'Generating...' : '✨ Generate tags with AI'}
        </button>
        
        {/* Tags display */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center bg-blush-pink text-clay-brown px-2 py-1 rounded-full text-xs"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-clay-brown hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Date picker */}
      <input
        type="date"
        value={dateOfMemory}
        onChange={(e) => setDateOfMemory(e.target.value)}
        max={new Date().toISOString().split('T')[0]}
        className="w-full border border-warm-sand rounded-2xl px-4 py-2 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
        required
      />

      {/* Privacy selection */}
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

      {/* Media upload */}
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

      {/* Error and success messages */}
      {error && (
        <p className="text-red-500 text-sm p-2 bg-blush-pink bg-opacity-30 rounded-lg">
          {error}
        </p>
      )}
      
      {successMessage && (
        <p className="text-green-600 text-sm p-2 bg-green-50 rounded-lg">
          {successMessage}
        </p>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={`w-full bg-warm-sand text-clay-brown py-2 rounded-2xl hover:bg-blush-pink transition font-medium ${
          isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isSubmitting 
          ? 'Saving...' 
          : entry 
            ? 'Update Memory' 
            : 'Save Memory'
        }
      </button>
    </div>
  );
};

export default EntryForm;
