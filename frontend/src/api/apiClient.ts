import axios from 'axios';
import { AxiosInstance, AxiosRequestConfig } from 'axios';

// Create a base axios instance with common configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add user ID to all requests
apiClient.interceptors.request.use(
  (config) => {
    // Add user ID header to all requests
    config.headers['X-User-ID'] = localStorage.getItem('userId') || 'demo';
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle errors
    if (error.response) {
      // Server responded with a status code outside of 2xx range
      console.error('❌ Server error response:', error.response.data);
      return Promise.reject(error.response.data.error || 'Server error');
    } else if (error.request) {
      // Request was made but no response was received
      console.error('❌ No response received:', error.request);
      return Promise.reject('No response from server');
    } else {
      // Something happened in setting up the request
      console.error('❌ Request setup error:', error.message);
      return Promise.reject(error.message);
    }
  }
);

// Function to create a form data specific axios instance
export const createFormDataClient = (): AxiosInstance => {
  const formClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
    timeout: 30000, // 30 seconds timeout for uploads
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  });
  
  // Add the same interceptors
  formClient.interceptors.request.use(
    (config) => {
      config.headers['X-User-ID'] = localStorage.getItem('userId') || 'demo';
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  formClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        console.error('❌ Form upload error response:', error.response.data);
        return Promise.reject(error.response.data.error || 'Upload failed');
      } else if (error.request) {
        console.error('❌ No response received for form upload:', error.request);
        return Promise.reject('No response from server during upload');
      } else {
        console.error('❌ Form upload setup error:', error.message);
        return Promise.reject(error.message);
      }
    }
  );
  
  return formClient;
};

export default apiClient;
