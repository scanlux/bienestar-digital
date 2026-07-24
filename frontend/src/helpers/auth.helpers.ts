import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

/**
 * Creates a configured QueryClient that complies with rule 11:
 * No automatic retries on HTTP 401, 403, and 404 codes.
 */
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            // Rule 11: Do not retry on logical or auth errors (401, 403, 404)
            if (status === 401 || status === 403 || status === 404) {
              return false;
            }
          }
          return failureCount < 3;
        },
      },
      mutations: {
        retry: (failureCount, error) => {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status === 401 || status === 403 || status === 404) {
              return false;
            }
          }
          return false;
        }
      }
    },
  });
};
