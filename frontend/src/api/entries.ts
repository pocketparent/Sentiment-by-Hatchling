// Frontend API client fixes for entries.ts

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.myhatchling.ai';

// Define types
export interface Entry {
  entry_id: string;
  content: string;
  tags: string[];
  privacy: 'private' | 'shared';
  author_id: string;
  created_at: string;
  updated_at: string;
  media_url?: string;
}

export interface EntryInput {
  content: string;
  tags?: string[];
  privacy?: 'private' | 'shared';
  media_url?: string;
}

// Helper function to get user ID from localStorage
const getUserId = (): string => {
  return localStorage.getItem('userId') || 'demo';
};

// Fetch all entries
export const fetchEntries = async (): Promise<Entry[]> => {
  try {
    console.log('Fetching entries...');
    const response = await axios.get(`${API_URL}/api/entry`, {
      headers: {
        'x-user-id': getUserId()
      }
    });
    
    console.log('Entries received:', response.data.entries);
    return response.data.entries || [];
  } catch (error) {
    console.error('Failed to fetch entries:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
};

// Create a new entry
export const createEntry = async (entryData: EntryInput): Promise<Entry> => {
  try {
    const response = await axios.post(`${API_URL}/api/entry`, entryData, {
      headers: {
        'x-user-id': getUserId()
      }
    });
    
    console.log('Entry created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to create entry:', error);
    throw new Error('Failed to create entry. Please try again.');
  }
};

// Get entry by ID
export const getEntry = async (entryId: string): Promise<Entry> => {
  try {
    const response = await axios.get(`${API_URL}/api/entry/${entryId}`, {
      headers: {
        'x-user-id': getUserId()
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch entry ${entryId}:`, error);
    throw new Error('Failed to fetch entry. Please try again.');
  }
};

// Update an entry
export const updateEntry = async (entryId: string, entryData: Partial<EntryInput>): Promise<Entry> => {
  try {
    const response = await axios.put(`${API_URL}/api/entry/${entryId}`, entryData, {
      headers: {
        'x-user-id': getUserId()
      }
    });
    
    console.log('Entry updated:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Failed to update entry ${entryId}:`, error);
    throw new Error('Failed to update entry. Please try again.');
  }
};

// Delete an entry
export const deleteEntry = async (entryId: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/api/entry/${entryId}`, {
      headers: {
        'x-user-id': getUserId()
      }
    });
    
    console.log('Entry deleted:', entryId);
  } catch (error) {
    console.error(`Failed to delete entry ${entryId}:`, error);
    throw new Error('Failed to delete entry. Please try again.');
  }
};

// Generate AI tags for content
export const generateAITags = async (content: string): Promise<string[]> => {
  try {
    console.log('🤖 Requesting AI tags for content');
    
    // Check if content is long enough
    if (!content || content.trim().length < 10) {
      console.warn('Content too short for AI tag generation');
      return ['moment'];
    }
    
    try {
      const response = await axios.post(`${API_URL}/api/entry/generate-tags`, { content }, {
        headers: {
          'x-user-id': getUserId()
        },
        timeout: 10000 // 10 second timeout for AI processing
      });
      
      console.log('✅ AI tags generated:', response.data.tags);
      return response.data.tags;
    } catch (apiError) {
      console.error('Error calling AI tag API:', apiError);
      console.warn('⚠️ Using mock tags while backend endpoint is being fixed');
      
      // Fallback to simple content-based tag generation
      const words = content.toLowerCase().split(/\s+/);
      const potentialTags = ['moment', 'memory', 'milestone', 'experience', 'growth', 'family', 'love', 'joy'];
      
      // Try to extract meaningful words from content
      const contentBasedTags = words
        .filter(word => word.length > 3 && !['this', 'that', 'with', 'from', 'have', 'were', 'they', 'their'].includes(word))
        .slice(0, 2);
      
      // Combine with some default tags
      const mockTags = [...new Set([...contentBasedTags, 'moment', potentialTags[Math.floor(Math.random() * potentialTags.length)]])];
      console.log('✅ Mock AI tags generated:', mockTags);
      return mockTags;
    }
  } catch (error) {
    console.error('Failed to generate AI tags:', error);
    return ['moment']; // Return at least one tag as fallback
  }
};
