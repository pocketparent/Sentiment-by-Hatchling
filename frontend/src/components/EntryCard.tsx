import React from 'react';
import { JournalEntry } from '../types';

type Props = {
  entry: JournalEntry;
  onClick: () => void;
};

const EntryCard: React.FC<Props> = ({ entry, onClick }) => {
  // Determine if the file is an image for preview
  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  // Determine if the file is a video for preview
  const isVideoFile = (url: string) => {
    return /\.(mp4|webm|ogg|mov)$/i.test(url);
  };

  // Determine if the file is an audio for preview
  const isAudioFile = (url: string) => {
    return /\.(mp3|wav|ogg)$/i.test(url);
  };

  return (
    <div
      className="rounded-2xl bg-white p-4 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-2 text-sm text-dusty-taupe">
        <span>{entry.date_of_memory || 'Unknown date'}</span>
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

      {entry.content ? (
        <p className="text-clay-brown text-sm whitespace-pre-line line-clamp-3">{entry.content}</p>
      ) : (
        <p className="text-dusty-taupe italic text-sm">No content</p>
      )}

      {entry.media_url && (
        <div className="mt-3">
          {isVideoFile(entry.media_url) ? (
            <video
              controls
              src={entry.media_url}
              className="w-full h-32 rounded-lg border border-warm-sand object-cover"
            />
          ) : isImageFile(entry.media_url) ? (
            <img
              src={entry.media_url}
              alt="Memory"
              className="w-full h-32 object-cover rounded-lg border border-warm-sand"
            />
          ) : isAudioFile(entry.media_url) ? (
            <audio
              controls
              src={entry.media_url}
              className="w-full mt-2"
            />
          ) : (
            <div className="w-full p-2 bg-warm-sand bg-opacity-20 rounded-lg text-center text-xs text-dusty-taupe">
              Attachment
            </div>
          )}
        </div>
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
