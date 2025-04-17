import axios from 'axios';

// Create a base axios instance with common configuration
const axiosInstance = axios.create({
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add auth headers
axiosInstance.interceptors.request.use(
  (config) => {
    // Add user ID to all requests
    const userId = localStorage.getItem('userId') || 'demo';
    config.headers['X-User-ID'] = userId;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log errors for debugging
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle specific error cases if needed
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.warn('Authentication required');
      // Could redirect to login or trigger auth flow
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
