import { JournalEntry } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/entry`
  : '/api/entry';

export async function fetchEntries(filters = {}): Promise<JournalEntry[]> {
  // Build query string from filters
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      queryParams.append(key, value.toString());
    }
  });
  
  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-User-ID': localStorage.getItem('userId') || 'demo'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error fetching entries:', errorText);
      throw new Error('Failed to fetch journal entries');
    }
    
    const data = await response.json();
    return data.entries || [];
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

    const response = await fetch(API_BASE, {
      method: 'POST',
      body: formData,
      headers: {
        'X-User-ID': localStorage.getItem('userId') || 'demo'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) || await response.text();
      console.error('❌ Server error response:', errorData);
      throw new Error(typeof errorData === 'object' && errorData.error 
        ? errorData.error 
        : 'Failed to create entry');
    }

    const result = await response.json();
    console.log('✅ Entry created successfully:', result);
    return result.entry;
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

    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      body: formData,
      headers: {
        'X-User-ID': localStorage.getItem('userId') || 'demo'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) || await response.text();
      console.error('❌ Server error response:', errorData);
      throw new Error(typeof errorData === 'object' && errorData.error 
        ? errorData.error 
        : 'Failed to update entry');
    }

    const result = await response.json();
    console.log('✅ Entry updated successfully:', result);
    return result.entry;
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
    
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: {
        'X-User-ID': localStorage.getItem('userId') || 'demo'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) || await response.text();
      console.error('❌ Server error response:', errorData);
      throw new Error(typeof errorData === 'object' && errorData.error 
        ? errorData.error 
        : 'Failed to delete entry');
    }

    const result = await response.json();
    console.log('✅ Entry deleted successfully:', result);
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
    
    const response = await fetch(`${API_BASE}/${id}`, {
      headers: {
        'X-User-ID': localStorage.getItem('userId') || 'demo'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) || await response.text();
      console.error('❌ Server error response:', errorData);
      throw new Error(typeof errorData === 'object' && errorData.error 
        ? errorData.error 
        : 'Failed to fetch entry');
    }

    const result = await response.json();
    return result.entry;
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
    const response = await fetch(`${API_BASE}/generate-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': localStorage.getItem('userId') || 'demo'
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null) || await response.text();
      console.error('❌ AI tag generation failed:', errorData);
      return [];
    }

    const result = await response.json();
    console.log('✅ AI tags generated:', result.tags);
    return result.tags || [];
    */
  } catch (error) {
    console.error('❌ AI tag generation error:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}
