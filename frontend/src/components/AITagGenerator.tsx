// AITagGenerator.tsx fixes for proper tag generation

import React, { useState } from 'react';
import { generateAITags } from '../api/entries';

interface AITagGeneratorProps {
  content: string;
  onTagsGenerated: (tags: string[]) => void;
}

const AITagGenerator: React.FC<AITagGeneratorProps> = ({ content, onTagsGenerated }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleGenerateTags = async () => {
    if (!content || content.trim().length < 10) {
      setError('Please add more content before generating tags');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      const tags = await generateAITags(content);
      
      if (tags && tags.length > 0) {
        onTagsGenerated(tags);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000); // Clear success message after 3 seconds
      } else {
        setError('No tags could be generated. Please try again.');
      }
    } catch (err) {
      console.error('Error generating tags:', err);
      setError('Failed to generate tags. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-tag-generator">
      <button
        onClick={handleGenerateTags}
        disabled={loading || !content || content.trim().length < 10}
        className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          loading 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-green-100 text-green-800 hover:bg-green-200'
        }`}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          <>
            <span className="mr-1">✨</span>
            Generate tags with AI
          </>
        )}
      </button>
      
      {error && (
        <div className="text-red-500 text-sm mt-2">
          {error}
        </div>
      )}
      
      {success && (
        <div className="text-green-600 text-sm mt-2">
          Tags generated successfully!
        </div>
      )}
    </div>
  );
};

export default AITagGenerator;
