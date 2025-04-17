import React, { useState, useRef, ChangeEvent } from 'react';
import { useMediaUpload, MediaType } from '../api/media';
import { Image, Video, Mic, File, Upload } from 'lucide-react';
import MediaPreview from './MediaPreview';

interface MediaUploaderProps {
  onMediaSelected: (file: File | null) => void;
  initialMediaUrl?: string | null;
  mediaType?: MediaType | null;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({ 
  onMediaSelected, 
  initialMediaUrl = null,
  mediaType = null 
}) => {
  const { 
    mediaFile, 
    error, 
    isLoading, 
    handleFileSelect, 
    clearMedia 
  } = useMediaUpload();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
    onMediaSelected(file);
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
      onMediaSelected(file);
    }
  };

  // Handle remove media
  const handleRemoveMedia = () => {
    clearMedia();
    onMediaSelected(null);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-clay-brown">
        Upload photo, video, or voice note
      </label>
      
      {/* Drag and drop area */}
      <div
        className={`border-2 border-dashed rounded-2xl p-4 text-center ${
          dragActive ? 'border-blush-pink bg-blush-pink bg-opacity-10' : 'border-warm-sand'
        } ${mediaFile ? 'bg-soft-beige' : 'bg-white'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {mediaFile ? (
          <MediaPreview mediaFile={mediaFile} onRemove={handleRemoveMedia} />
        ) : initialMediaUrl ? (
          <div className="mt-2 relative">
            <div className="bg-white p-2 rounded-2xl border border-warm-sand">
              {mediaType === 'image' || initialMediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img 
                  src={initialMediaUrl} 
                  alt="Preview" 
                  className="w-full h-auto rounded-xl object-contain max-h-48"
                />
              ) : mediaType === 'video' || initialMediaUrl.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                <video 
                  src={initialMediaUrl} 
                  controls 
                  className="w-full h-auto rounded-xl max-h-48"
                />
              ) : mediaType === 'audio' || initialMediaUrl.match(/\.(mp3|wav|ogg)$/i) ? (
                <audio 
                  src={initialMediaUrl} 
                  controls 
                  className="w-full"
                />
              ) : (
                <div className="flex items-center justify-center h-32 bg-soft-beige rounded-xl">
                  <File size={32} className="text-dusty-taupe" />
                </div>
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
        ) : (
          <div className="py-6">
            <div className="flex justify-center mb-3">
              <Upload size={32} className="text-dusty-taupe" />
            </div>
            <p className="text-sm text-dusty-taupe mb-2">
              Drag and drop a file here, or click to select
            </p>
            <div className="flex justify-center space-x-2 text-xs text-dusty-taupe">
              <span className="flex items-center">
                <Image size={12} className="mr-1" /> Images
              </span>
              <span className="flex items-center">
                <Video size={12} className="mr-1" /> Videos
              </span>
              <span className="flex items-center">
                <Mic size={12} className="mr-1" /> Audio
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        id="media-upload"
        name="media"
        accept="image/*,video/*,audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* Button to trigger file selection */}
      {!mediaFile && !initialMediaUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2 bg-warm-sand text-clay-brown rounded-xl hover:bg-blush-pink transition-colors text-sm font-medium"
        >
          Select File
        </button>
      )}
      
      {/* Error message */}
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-clay-brown"></div>
          <span className="ml-2 text-sm text-dusty-taupe">Uploading...</span>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
