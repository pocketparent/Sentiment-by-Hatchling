import React, { useState, useEffect } from 'react';
import { generateAITags } from '../api/entries';

interface AITagGeneratorProps {
  content: string;
  onTagsGenerated: (tags: string[]) => void;
  existingTags?: string[];
  mediaUrl?: string;
  mediaType?: string;
}

const AITagGenerator: React.FC<AITagGeneratorProps> = ({ 
  content, 
  onTagsGenerated,
  existingTags = [],
  mediaUrl,
  mediaType
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Generate tags based on content and media
  const handleGenerateTags = async () => {
    if (content.trim().length < 10 && !mediaUrl) {
      setError('Please write more content or add media to generate tags');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setSuccess(false);
    
    try {
      const generatedTags = await generateAITags(content, mediaUrl, mediaType);
      if (generatedTags.length > 0) {
        // Filter out tags that already exist
        const newTags = generatedTags.filter(tag => !existingTags.includes(tag));
        onTagsGenerated(newTags);
        setSuccess(true);
        
        // Reset success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('Could not generate tags. Please try again or add them manually.');
      }
    } catch (err) {
      setError('Failed to generate tags. Please try again or add them manually.');
      console.error('Tag generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleGenerateTags}
        disabled={isGenerating || (content.trim().length < 10 && !mediaUrl)}
        className={`text-sm flex items-center ${
          isGenerating || (content.trim().length < 10 && !mediaUrl)
            ? 'text-dusty-taupe opacity-50 cursor-not-allowed' 
            : 'text-clay-brown hover:text-black transition-colors'
        }`}
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-clay-brown mr-2"></div>
            Generating tags...
          </>
        ) : (
          <>
            <span className="mr-1">✨</span>
            Generate tags with AI
          </>
        )}
      </button>
      
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
      
      {success && (
        <p className="text-green-600 text-xs mt-1">Tags generated successfully!</p>
      )}
    </div>
  );
};

export default AITagGenerator;
