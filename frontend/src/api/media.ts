import { useState, useEffect } from 'react';
import apiClient, { createFormDataClient } from './apiClient';

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

// API endpoint for media operations
const API_ENDPOINT = '/api/media';

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
      
      // Use the form data specific client
      const formClient = createFormDataClient();
      const response = await formClient.post(`${API_ENDPOINT}/upload`, formData);
      
      return response.data.media_url;
    } catch (err: any) {
      console.error('Media upload error:', err);
      setError(err.message || 'Failed to upload media. Please try again.');
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
    const response = await apiClient.get(`${API_ENDPOINT}/url`, {
      params: { path: mediaPath }
    });
    
    return response.data.url;
  } catch (error) {
    console.error('Error getting media URL:', error);
    return mediaPath; // Return original path as fallback
  }
}

/**
 * Delete a media file
 */
export async function deleteMedia(mediaPath: string): Promise<boolean> {
  try {
    await apiClient.post(`${API_ENDPOINT}/delete`, { path: mediaPath });
    return true;
  } catch (error) {
    console.error('Error deleting media:', error);
    return false;
  }
}
