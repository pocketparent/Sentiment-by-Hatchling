import React, { useState, useEffect } from 'react';
import { useMediaUpload, MediaFile, MediaType, validateMediaUrl } from '../api/media';
import { X } from 'lucide-react';

interface MediaPreviewProps {
  mediaFile: MediaFile | null;
  onRemove: () => void;
  mediaUrl?: string;
  mediaType?: string;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ mediaFile, onRemove, mediaUrl, mediaType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedUrl, setValidatedUrl] = useState<string | null>(null);

  // Validate external media URL if provided
  useEffect(() => {
    if (mediaUrl && !mediaFile) {
      const validateUrl = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          const isValid = await validateMediaUrl(mediaUrl);
          if (isValid) {
            setValidatedUrl(mediaUrl);
          } else {
            console.error('Media URL validation failed:', mediaUrl);
            setError('Media could not be loaded. Please try refreshing the page.');
          }
        } catch (err) {
          console.error('Error validating media URL:', err);
          setError('Error loading media. Please try refreshing the page.');
        } finally {
          setIsLoading(false);
        }
      };
      
      validateUrl();
    }
  }, [mediaUrl]);

  // If no media to display
  if (!mediaFile && !validatedUrl && !mediaUrl) return null;

  // Determine media type from string
  const getTypeFromString = (type?: string): MediaType => {
    if (!type) return 'unknown';
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    return 'unknown';
  };

  // Get display URL (either from file or external)
  const displayUrl = mediaFile ? mediaFile.previewUrl : validatedUrl || mediaUrl;
  const displayType = mediaFile ? mediaFile.type : getTypeFromString(mediaType);

  return (
    <div className="mt-2 relative">
      <div className="bg-white p-2 rounded-2xl border border-warm-sand">
        {isLoading ? (
          <div className="w-full h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clay-brown"></div>
          </div>
        ) : error ? (
          <div className="w-full p-4 text-center text-red-500 text-sm">
            {error}
            <button 
              onClick={() => window.location.reload()} 
              className="block mx-auto mt-2 text-clay-brown underline"
            >
              Refresh page
            </button>
          </div>
        ) : (
          <>
            {displayType === 'image' && displayUrl && (
              <img 
                src={displayUrl} 
                alt="Preview" 
                className="w-full h-auto rounded-xl object-contain max-h-48"
                loading="lazy"
                onError={() => setError('Failed to load image. The file may be corrupted or no longer available.')}
              />
            )}
            {displayType === 'video' && displayUrl && (
              <video 
                src={displayUrl} 
                controls 
                className="w-full h-auto rounded-xl max-h-48"
                preload="metadata"
                onError={() => setError('Failed to load video. The file may be corrupted or no longer available.')}
              />
            )}
            {displayType === 'audio' && displayUrl && (
              <audio 
                src={displayUrl} 
                controls 
                className="w-full"
                onError={() => setError('Failed to load audio. The file may be corrupted or no longer available.')}
              />
            )}
            {mediaFile && (
              <div className="mt-1 text-xs text-dusty-taupe flex justify-between items-center">
                <span className="truncate max-w-[200px]">{mediaFile.name}</span>
                <span>{formatFileSize(mediaFile.size)}</span>
              </div>
            )}
          </>
        )}
        
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-4 right-4 bg-clay-brown text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-500"
            aria-label="Remove media"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default MediaPreview;
