import React from 'react';
import { JournalEntry } from '../types';
import { Play, CheckSquare, Square } from 'lucide-react';

type Props = {
  entry: JournalEntry;
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: (entryId: string) => void;
};

const EntryCard: React.FC<Props> = ({ 
  entry, 
  onClick, 
  isSelectionMode = false, 
  isSelected = false,
  onSelectionToggle
}) => {
  // Determine if the file is an image for preview
  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || (entry.media_type?.startsWith('image/') ?? false);
  };

  // Determine if the file is a video for preview
  const isVideoFile = (url: string) => {
    return /\.(mp4|webm|ogg|mov)$/i.test(url) || (entry.media_type?.startsWith('video/') ?? false);
  };

  // Determine if the file is an audio for preview
  const isAudioFile = (url: string) => {
    return /\.(mp3|wav|ogg)$/i.test(url) || (entry.media_type?.startsWith('audio/') ?? false);
  };

  // Determine the card style based on entry type
  const getCardStyle = () => {
    if (entry.media_url) {
      if (isImageFile(entry.media_url)) {
        return "image-entry";
      } else if (isVideoFile(entry.media_url)) {
        return "video-entry";
      } else if (isAudioFile(entry.media_url)) {
        return "audio-entry";
      }
    }
    return "text-entry";
  };

  const cardStyle = getCardStyle();
  
  const handleCardClick = () => {
    if (isSelectionMode && onSelectionToggle) {
      onSelectionToggle(entry.entry_id);
    } else {
      onClick();
    }
  };

  return (
    <div
      className={`rounded-2xl bg-white p-4 cursor-pointer ${cardStyle} ${isSelected ? 'ring-2 ring-blush-pink' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-center mb-2 text-sm text-dusty-taupe">
        <span>{entry.date_of_memory || 'Unknown date'}</span>
        <div className="flex items-center gap-2">
          {isSelectionMode && (
            <div className="text-clay-brown" onClick={(e) => {
              e.stopPropagation();
              if (onSelectionToggle) onSelectionToggle(entry.entry_id);
            }}>
              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
            </div>
          )}
          {entry.privacy && (
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
              entry.privacy === 'private' 
                ? 'bg-warm-sand text-clay-brown' 
                : 'bg-blush-pink text-clay-brown'
            }`}>
              {entry.privacy}
            </span>
          )}
        </div>
      </div>

      {/* Conditional rendering based on entry type - improved for better display in JournalView */}
      {cardStyle === "image-entry" && entry.media_url && (
        <div className="mb-3">
          <img
            src={entry.media_url}
            alt="Memory"
            className="w-full rounded-lg border border-warm-sand object-cover"
            style={{ maxHeight: "200px" }}
            loading="lazy"
          />
        </div>
      )}

      {cardStyle === "video-entry" && entry.media_url && (
        <div className="mb-3 relative">
          <div className="relative w-full h-40 bg-gray-100 rounded-lg border border-warm-sand flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-30 rounded-lg"></div>
            <div className="z-10 bg-white bg-opacity-70 rounded-full p-3">
              <Play size={24} className="text-clay-brown" />
            </div>
            <span className="absolute bottom-2 right-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">Video</span>
          </div>
        </div>
      )}

      {cardStyle === "audio-entry" && entry.media_url && (
        <div className="mb-3">
          <audio
            controls
            src={entry.media_url}
            className="w-full mt-2"
          />
        </div>
      )}

      {/* Content is always shown, but styled differently based on entry type */}
      {entry.content ? (
        <p className={`text-clay-brown text-sm whitespace-pre-line ${cardStyle === "text-entry" ? "text-lg font-medium" : "line-clamp-3"}`}>
          {entry.content}
        </p>
      ) : (
        <p className="text-dusty-taupe italic text-sm">No content</p>
      )}

      {entry.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entry.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs bg-blush-pink text-clay-brown px-2 py-0.5 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default EntryCard;
