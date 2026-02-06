import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Create a configured axios instance
const apiClient = axios.create({
  baseURL: '/api', // Default to local API routes
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout for live probing/AI
});

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardize error format
    const message = error.response?.data?.error || error.message || 'API Request Failed';
    console.error(`Status: ${error.response?.status} - ${message}`);
    return Promise.reject(new Error(message));
  },
);

/**
 * reliableFetch - A fun wrapper for fetching API data safely 🚀
 */
export async function reliableFetch<T = any>(
  endpoint: string,
  options: AxiosRequestConfig = {},
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response: AxiosResponse<T> = await apiClient(endpoint, options);
    return { success: true, data: response.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export const api = apiClient;
