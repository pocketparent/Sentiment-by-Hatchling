import apiClient, { createFormDataClient } from './apiClient';
import { JournalEntry } from '../types';
import { EntryFilters } from '../types/entry';

const API_ENDPOINT = '/api/entry';

export async function fetchEntries(filters: EntryFilters = {}): Promise<JournalEntry[]> {
  try {
    console.log(`🔍 Fetching entries with filters:`, filters);
    
    const response = await apiClient.get(API_ENDPOINT, { params: filters });
    
    console.log(`✅ Fetched ${response.data.entries?.length || 0} entries`);
    return response.data.entries || [];
  } catch (error) {
    console.error('❌ Fetch entries error:', error);
    // Return empty array instead of throwing to prevent UI breakage
    return [];
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

    // Use the form data specific client
    const formClient = createFormDataClient();
    const response = await formClient.post(API_ENDPOINT, formData);

    console.log('✅ Entry created successfully:', response.data);
    return response.data.entry || response.data; // Handle both response formats
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

    // Use the form data specific client
    const formClient = createFormDataClient();
    const response = await formClient.patch(`${API_ENDPOINT}/${id}`, formData);

    console.log('✅ Entry updated successfully:', response.data);
    return response.data.entry || response.data; // Handle both response formats
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
    
    await apiClient.delete(`${API_ENDPOINT}/${id}`);

    console.log('✅ Entry deleted successfully');
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
    
    const response = await apiClient.get(`${API_ENDPOINT}/${id}`);

    return response.data.entry || response.data; // Handle both response formats
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
    
    // Try to use the backend endpoint
    try {
      const response = await apiClient.post(`${API_ENDPOINT}/generate-tags`, { content });

      console.log('✅ AI tags generated from API:', response.data.tags);
      return response.data.tags || [];
    } catch (apiError) {
      console.error('❌ API tag generation failed, using fallback:', apiError);
      
      // Generate fallback tags based on content
      const fallbackTags = generateFallbackTags(content);
      console.log('✅ Fallback tags generated:', fallbackTags);
      return fallbackTags;
    }
  } catch (error) {
    console.error('❌ AI tag generation error:', error);
    // Return fallback tags instead of empty array
    return generateFallbackTags(content);
  }
}

// Helper function to generate fallback tags based on content
function generateFallbackTags(content: string): string[] {
  const lowerContent = content.toLowerCase();
  const tags: string[] = [];
  
  // Check for common keywords
  if (lowerContent.includes('baby') || lowerContent.includes('infant') || lowerContent.includes('newborn')) {
    tags.push('baby');
  }
  if (lowerContent.includes('sleep') || lowerContent.includes('nap') || lowerContent.includes('bedtime')) {
    tags.push('sleep');
  }
  if (lowerContent.includes('food') || lowerContent.includes('eat') || lowerContent.includes('feeding')) {
    tags.push('food');
  }
  if (lowerContent.includes('smile') || lowerContent.includes('laugh') || lowerContent.includes('happy')) {
    tags.push('happy');
  }
  if (lowerContent.includes('cry') || lowerContent.includes('sad') || lowerContent.includes('tears')) {
    tags.push('emotional');
  }
  if (lowerContent.includes('walk') || lowerContent.includes('crawl') || lowerContent.includes('step')) {
    tags.push('milestone');
  }
  if (lowerContent.includes('doctor') || lowerContent.includes('sick') || lowerContent.includes('health')) {
    tags.push('health');
  }
  
  // Add a default tag if none were found
  if (tags.length === 0) {
    tags.push('memory');
  }
  
  return tags;
}
