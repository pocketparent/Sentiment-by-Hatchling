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
      },
      timeout: 15000 // 15 second timeout
    });
    
    if (!response.data || response.data.size === 0) {
      throw new Error('Empty CSV response received');
    }
    
    console.log('✅ CSV export successful');
    return response.data;
  } catch (error: any) {
    console.error('❌ CSV export error:', error);
    
    // Provide more specific error messages
    if (error.message === 'Network Error') {
      throw new Error('Network error while generating CSV. Please check your connection and try again.');
    }
    
    if (error.response && error.response.status === 404) {
      throw new Error('CSV export endpoint not found. Please try again later.');
    }
    
    throw new Error('Failed to export entries as CSV');
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
      },
      timeout: 15000 // 15 second timeout
    });
    
    if (!response.data || response.data.size === 0) {
      throw new Error('Empty JSON response received');
    }
    
    console.log('✅ JSON export successful');
    return response.data;
  } catch (error: any) {
    console.error('❌ JSON export error:', error);
    
    // Provide more specific error messages
    if (error.message === 'Network Error') {
      throw new Error('Network error while generating JSON. Please check your connection and try again.');
    }
    
    if (error.response && error.response.status === 404) {
      throw new Error('JSON export endpoint not found. Please try again later.');
    }
    
    throw new Error('Failed to export entries as JSON');
  }
}

/**
 * Export entries as PDF
 * @param entryIds Optional array of entry IDs to export
 * @returns Blob of PDF data
 */
export async function exportEntriesAsPDF(entryIds?: string[]): Promise<Blob> {
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
      },
      // Increase timeout for PDF generation which may take longer
      timeout: 30000
    });
    
    if (!response.data || response.data.size === 0) {
      throw new Error('Empty PDF response received');
    }
    
    console.log('✅ PDF export successful');
    return response.data;
  } catch (error: any) {
    console.error('❌ PDF export error:', error);
    
    // Check if this is a 404 error (endpoint not found)
    if (error.response && error.response.status === 404) {
      throw new Error('PDF export is not available at this time. Please try CSV or JSON format instead.');
    }
    
    // Handle other specific error cases
    if (error.message === 'Network Error') {
      throw new Error('Network error while generating PDF. Please check your connection and try again.');
    }
    
    // Handle blob-related errors
    if (error.message && error.message.includes('Blob')) {
      throw new Error('Error processing PDF data. Please try a different export format.');
    }
    
    throw new Error('Failed to export entries as PDF');
  }
}

/**
 * Helper function to trigger file download from blob
 * @param blob The blob data to download
 * @param filename The filename to use
 */
export function downloadBlob(blob: Blob, filename: string): void {
  try {
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
  } catch (error) {
    console.error('Error downloading blob:', error);
    throw new Error('Failed to download file');
  }
}
