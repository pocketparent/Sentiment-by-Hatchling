import axiosInstance from './axios/axiosInstance';
import { JournalEntry } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/entry`
  : '/api/entry';

export async function fetchEntries(filters = {}): Promise<JournalEntry[]> {
  try {
    // Build query params from filters
    const params = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params[key] = value.toString();
      }
    });
    
    const response = await axiosInstance.get(API_BASE, { params });
    
    return response.data.entries || [];
  } catch (error) {
    console.error('❌ Fetch entries error:', error);
    throw error;
  }
}

export async function createEntry(formData: FormData): Promise<JournalEntry> {
  try {
    // Ensure required fields are present
    if (!formData.get('date_of_memory')) {
      throw new Error('Date of memory is required');
    }
    
    // If no content and no media, throw error
    if (!formData.get('content') && !formData.has('media')) {
      throw new Error('Either content or media is required');
    }
    
    // Add author_id if not present
    if (!formData.get('author_id')) {
      formData.append('author_id', localStorage.getItem('userId') || 'demo');
    }
    
    // Add source_type if not present
    if (!formData.get('source_type')) {
      formData.append('source_type', 'app');
    }
    
    // Set default privacy if not specified
    if (!formData.get('privacy')) {
      formData.append('privacy', 'private');
    }
    
    // Debug log
    console.log('📤 Submitting Entry FormData:');
    for (const [key, value] of formData.entries()) {
      console.log(`📦 ${key}:`, value);
    }

    const response = await axiosInstance.post(API_BASE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });

    console.log('✅ Entry created successfully:', response.data);
    return response.data.entry;
  } catch (error) {
    console.error('❌ Create entry error:', error);
    throw error;
  }
}

export async function updateEntry(id: string, formData: FormData): Promise<JournalEntry> {
  try {
    // Ensure we have an ID
    if (!id) {
      throw new Error('Entry ID is required for updates');
    }
    
    // Debug log
    console.log(`📤 Updating Entry ${id} with FormData:`);
    for (const [key, value] of formData.entries()) {
      console.log(`📦 ${key}:`, value);
    }

    const response = await axiosInstance.patch(`${API_BASE}/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });

    console.log('✅ Entry updated successfully:', response.data);
    return response.data.entry;
  } catch (error) {
    console.error('❌ Update entry error:', error);
    throw error;
  }
}

export async function deleteEntry(id: string): Promise<{ success: boolean }> {
  try {
    if (!id) {
      throw new Error('Entry ID is required for deletion');
    }
    
    console.log(`🗑️ Deleting entry ${id}`);
    
    const response = await axiosInstance.delete(`${API_BASE}/${id}`);

    console.log('✅ Entry deleted successfully:', response.data);
    return { success: true };
  } catch (error) {
    console.error('❌ Delete entry error:', error);
    throw error;
  }
}

export async function getEntryById(id: string): Promise<JournalEntry> {
  try {
    if (!id) {
      throw new Error('Entry ID is required');
    }
    
    console.log(`🔍 Fetching entry ${id}`);
    
    const response = await axiosInstance.get(`${API_BASE}/${id}`);

    return response.data.entry;
  } catch (error) {
    console.error('❌ Get entry error:', error);
    throw error;
  }
}

export async function generateAITags(content: string): Promise<string[]> {
  try {
    if (!content || content.trim().length < 10) {
      console.log('⚠️ Content too short for AI tag generation');
      return [];
    }
    
    console.log('🤖 Requesting AI tags for content');
    
    // For now, return mock tags to prevent errors while backend is being implemented
    // This ensures the UI works even if the backend endpoint isn't ready
    console.log('⚠️ Using mock tags while backend endpoint is being implemented');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate some relevant tags based on content
    const mockTags = [];
    
    if (content.toLowerCase().includes('baby')) mockTags.push('baby');
    if (content.toLowerCase().includes('sleep')) mockTags.push('sleep');
    if (content.toLowerCase().includes('food') || content.toLowerCase().includes('eat')) mockTags.push('food');
    if (content.toLowerCase().includes('smile') || content.toLowerCase().includes('laugh')) mockTags.push('happy');
    if (content.toLowerCase().includes('cry')) mockTags.push('emotional');
    if (content.toLowerCase().includes('walk') || content.toLowerCase().includes('crawl')) mockTags.push('milestone');
    if (content.toLowerCase().includes('doctor') || content.toLowerCase().includes('sick')) mockTags.push('health');
    
    // Add some default tags if we don't have enough
    if (mockTags.length < 2) {
      const defaultTags = ['memory', 'moment', 'family', 'growth', 'development'];
      const randomTag = defaultTags[Math.floor(Math.random() * defaultTags.length)];
      mockTags.push(randomTag);
    }
    
    console.log('✅ Mock AI tags generated:', mockTags);
    return mockTags;
    
    /* Uncomment this when backend endpoint is ready
    const response = await axiosInstance.post(`${API_BASE}/generate-tags`, { content });
    console.log('✅ AI tags generated:', response.data.tags);
    return response.data.tags || [];
    */
  } catch (error) {
    console.error('❌ AI tag generation error:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}
