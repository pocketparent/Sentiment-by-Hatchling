import axiosInstance from './axios/axiosInstance';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/export`
  : '/api/export';

/**
 * Export entries as CSV
 * @param entryIds Optional array of entry IDs to export
 * @returns Blob of CSV data
 */
export async function exportEntriesAsCSV(entryIds?: string[]): Promise<Blob> {
  try {
    console.log('📤 Exporting entries as CSV');
    
    // Build query params
    const params: Record<string, string> = { format: 'csv' };
    
    if (entryIds && entryIds.length === 1) {
      params.entry_id = entryIds[0];
    } else if (entryIds && entryIds.length > 1) {
      params.entry_ids = entryIds.join(',');
    }
    
    // Use responseType: 'blob' to handle file download
    const response = await axiosInstance.get(API_BASE, {
      params,
      responseType: 'blob',
      headers: {
        'Accept': 'text/csv',
        'X-User-ID': localStorage.getItem('userId') || 'demo'
      }
    });
    
    console.log('✅ CSV export successful');
    return response.data;
  } catch (error) {
    console.error('❌ CSV export error:', error);
    throw error;
  }
}

/**
 * Export entries as JSON
 * @param entryIds Optional array of entry IDs to export
 * @returns Blob of JSON data
 */
export async function exportEntriesAsJSON(entryIds?: string[]): Promise<Blob> {
  try {
    console.log('📤 Exporting entries as JSON');
    
    // Build query params
    const params: Record<string, string> = { format: 'json' };
    
    if (entryIds && entryIds.length === 1) {
      params.entry_id = entryIds[0];
    } else if (entryIds && entryIds.length > 1) {
      params.entry_ids = entryIds.join(',');
    }
    
    // Use responseType: 'blob' to handle file download
    const response = await axiosInstance.get(API_BASE, {
      params,
      responseType: 'blob',
      headers: {
        'Accept': 'application/json',
        'X-User-ID': localStorage.getItem('userId') || 'demo'
      }
    });
    
    console.log('✅ JSON export successful');
    return response.data;
  } catch (error) {
    console.error('❌ JSON export error:', error);
    throw error;
  }
}

/**
 * Export entries as PDF
 * @param entryIds Optional array of entry IDs to export
 * @returns Blob of PDF data or null if not implemented
 */
export async function exportEntriesAsPDF(entryIds?: string[]): Promise<Blob | null> {
  try {
    console.log('📤 Exporting entries as PDF');
    
    // Build query params
    const params: Record<string, string> = {};
    
    if (entryIds && entryIds.length === 1) {
      params.entry_id = entryIds[0];
    } else if (entryIds && entryIds.length > 1) {
      params.entry_ids = entryIds.join(',');
    }
    
    // Use responseType: 'blob' to handle file download
    const response = await axiosInstance.get(`${API_BASE}/pdf`, {
      params,
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf',
        'X-User-ID': localStorage.getItem('userId') || 'demo'
      }
    });
    
    // Check if we got a PDF or an error response
    const contentType = response.headers['content-type'];
    
    if (contentType && contentType.includes('application/pdf')) {
      console.log('✅ PDF export successful');
      return response.data;
    } else {
      // If we got a JSON response, it's probably an error
      console.warn('⚠️ PDF export not implemented on server');
      return null;
    }
  } catch (error) {
    console.error('❌ PDF export error:', error);
    // Check if it's a 501 Not Implemented error
    if (error.response && error.response.status === 501) {
      console.warn('⚠️ PDF export not implemented on server');
      return null;
    }
    throw error;
  }
}

/**
 * Helper function to trigger file download from blob
 * @param blob The blob data to download
 * @param filename The filename to use
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
