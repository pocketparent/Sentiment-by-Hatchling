import React, { useState, useEffect } from 'react';
import { generateAITags } from '../api/entries';

interface AITagGeneratorProps {
  content: string;
  onTagsGenerated: (tags: string[]) => void;
  existingTags?: string[];
}

const AITagGenerator: React.FC<AITagGeneratorProps> = ({ 
  content, 
  onTagsGenerated,
  existingTags = []
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);

  // Generate tags based on content
  const handleGenerateTags = async () => {
    if (content.trim().length < 10) {
      setError('Please write more content to generate tags');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setSuccess(false);
    setGeneratedTags([]);
    
    try {
      console.log("Generating AI tags for content:", content.substring(0, 50) + "...");
      const tags = await generateAITags(content);
      console.log("Generated tags:", tags);
      
      if (tags.length > 0) {
        // Filter out tags that already exist
        const newTags = tags.filter(tag => !existingTags.includes(tag));
        setGeneratedTags(newTags);
        onTagsGenerated(newTags);
        setSuccess(true);
        
        // Reset success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000);
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
    <div className="mb-4">
      <button
        type="button"
        onClick={handleGenerateTags}
        disabled={isGenerating || content.trim().length < 10}
        className={`text-sm flex items-center mb-2 ${
          isGenerating || content.trim().length < 10 
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
        <p className="text-red-500 text-xs mt-1 mb-2">{error}</p>
      )}
      
      {success && (
        <div className="mt-2 mb-3">
          <p className="text-green-600 text-xs mb-2">Tags generated successfully!</p>
          <div className="flex flex-wrap gap-1">
            {generatedTags.map((tag, index) => (
              <span 
                key={index} 
                className="bg-blush-pink bg-opacity-20 text-clay-brown text-xs px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AITagGenerator;
