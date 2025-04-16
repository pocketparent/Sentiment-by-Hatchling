import React from 'react';
import { useMediaUpload, MediaFile, MediaType } from '../api/media';

interface MediaPreviewProps {
  mediaFile: MediaFile | null;
  onRemove: () => void;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ mediaFile, onRemove }) => {
  if (!mediaFile) return null;

  return (
    <div className="mt-2 relative">
      <div className="bg-white p-2 rounded-2xl border border-warm-sand">
        {mediaFile.type === 'image' && (
          <img 
            src={mediaFile.previewUrl} 
            alt="Preview" 
            className="w-full h-auto rounded-xl object-contain max-h-48"
          />
        )}
        {mediaFile.type === 'video' && (
          <video 
            src={mediaFile.previewUrl} 
            controls 
            className="w-full h-auto rounded-xl max-h-48"
          />
        )}
        {mediaFile.type === 'audio' && (
          <audio 
            src={mediaFile.previewUrl} 
            controls 
            className="w-full"
          />
        )}
        <div className="mt-1 text-xs text-dusty-taupe flex justify-between items-center">
          <span className="truncate max-w-[200px]">{mediaFile.name}</span>
          <span>{formatFileSize(mediaFile.size)}</span>
        </div>
        <button
          onClick={onRemove}
          className="absolute top-4 right-4 bg-clay-brown text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-500"
          aria-label="Remove media"
        >
          ×
        </button>
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
