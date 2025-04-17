import { useState, useEffect } from 'react';
import axiosInstance from './axios/axiosInstance';

// Media file types
export type MediaType = 'image' | 'video' | 'audio' | 'unknown';

// Media file information
export interface MediaFile {
  file: File;
  type: MediaType;
  previewUrl: string;
  name: string;
  size: number;
}

// Base API URL for media operations
const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/media`
  : '/api/media';

/**
 * Determine the media type from a file
 */
export function getMediaType(file: File): MediaType {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'unknown';
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Custom hook for handling media file selection and preview
 */
export function useMediaUpload() {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Clean up object URLs when component unmounts or media changes
  useEffect(() => {
    return () => {
      if (mediaFile?.previewUrl) {
        URL.revokeObjectURL(mediaFile.previewUrl);
      }
    };
  }, [mediaFile]);

  /**
   * Handle file selection
   */
  const handleFileSelect = (file: File | null) => {
    setError(null);
    
    // Clear existing media if null is passed
    if (!file) {
      if (mediaFile?.previewUrl) {
        URL.revokeObjectURL(mediaFile.previewUrl);
      }
      setMediaFile(null);
      return;
    }
    
    // Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      setError(`File too large. Maximum size is ${formatFileSize(MAX_SIZE)}.`);
      return;
    }
    
    // Validate file type
    const mediaType = getMediaType(file);
    if (mediaType === 'unknown') {
      setError('Unsupported file type. Please upload an image, video, or audio file.');
      return;
    }
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // Set media file info
    setMediaFile({
      file,
      type: mediaType,
      previewUrl,
      name: file.name,
      size: file.size
    });
  };

  /**
   * Upload media file to server
   */
  const uploadMedia = async (userId: string): Promise<string | null> => {
    if (!mediaFile) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('media', mediaFile.file);
      formData.append('user_id', userId);
      
      console.log(`📤 Uploading media: ${mediaFile.name} (${formatFileSize(mediaFile.size)})`);
      
      const response = await axiosInstance.post(`${API_BASE}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-User-ID': userId
        },
        // Add timeout and retry logic
        timeout: 30000, // 30 seconds
        maxRetries: 2
      });
      
      console.log(`✅ Media upload successful: ${response.data.media_url}`);
      return response.data.media_url;
    } catch (err: any) {
      console.error('❌ Media upload error:', err);
      
      // Provide more specific error messages
      if (err.code === 'ECONNABORTED') {
        setError('Upload timed out. Please try again with a smaller file or check your connection.');
      } else if (err.response) {
        // Server responded with an error
        const status = err.response.status;
        if (status === 413) {
          setError('File too large for server. Please try a smaller file.');
        } else if (status === 415) {
          setError('Unsupported file type. Please try a different format.');
        } else {
          setError(`Server error (${status}): ${err.response.data?.message || 'Failed to upload media'}`);
        }
      } else if (err.request) {
        // Request made but no response received
        setError('No response from server. Please check your connection and try again.');
      } else {
        // Something else went wrong
        setError(err.message || 'Failed to upload media. Please try again.');
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mediaFile,
    error,
    isLoading,
    handleFileSelect,
    uploadMedia,
    clearMedia: () => handleFileSelect(null)
  };
}

/**
 * Get a signed URL for a media file
 */
export async function getMediaUrl(mediaPath: string): Promise<string> {
  try {
    // Skip if mediaPath is already a full URL
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
      return mediaPath;
    }
    
    console.log(`🔍 Getting signed URL for: ${mediaPath}`);
    const response = await axiosInstance.get(`${API_BASE}/url`, {
      params: { path: mediaPath }
    });
    
    console.log(`✅ Got signed URL: ${response.data.url.substring(0, 50)}...`);
    return response.data.url;
  } catch (error) {
    console.error('❌ Error getting media URL:', error);
    return mediaPath; // Return original path as fallback
  }
}

/**
 * Delete a media file
 */
export async function deleteMedia(mediaPath: string): Promise<boolean> {
  try {
    console.log(`🗑️ Deleting media: ${mediaPath}`);
    const response = await axiosInstance.post(`${API_BASE}/delete`, {
      path: mediaPath
    });
    
    console.log(`✅ Media deleted successfully`);
    return true;
  } catch (error) {
    console.error('❌ Error deleting media:', error);
    return false;
  }
}

/**
 * Validate that a media URL is accessible
 */
export async function validateMediaUrl(url: string): Promise<boolean> {
  try {
    // For local development or relative URLs, assume they're valid
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return true;
    }
    
    // Try to fetch the headers only to check if the URL is valid
    const response = await axiosInstance.head(url, { timeout: 5000 });
    return response.status >= 200 && response.status < 400;
  } catch (error) {
    console.error('❌ Media URL validation failed:', error);
    return false;
  }
}
