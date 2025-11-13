import axios, { AxiosRequestConfig } from 'axios';

export interface HttpResponse<T = any> {
  status: number;
  statusText: string;
  data: T;
  headers: Record<string, string>;
}

export interface HttpError {
  status?: number;
  message: string;
  url: string;
}

/**
 * Makes an HTTP request with error handling
 */
export async function httpRequest<T = any>(
  url: string,
  config: AxiosRequestConfig = {}
): Promise<HttpResponse<T>> {
  try {
    const response = await axios({
      url,
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status
      ...config,
    });

    return {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers as Record<string, string>,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw {
        status: error.response?.status,
        message: error.message,
        url,
      } as HttpError;
    }
    throw error;
  }
}

/**
 * Checks if a URL is accessible (2xx/3xx status)
 */
export async function isUrlAccessible(url: string): Promise<boolean> {
  try {
    const response = await httpRequest(url, { method: 'GET' });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

/**
 * Posts JSON data to a webhook
 */
export async function postWebhook(
  url: string,
  payload: any
): Promise<void> {
  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Webhook returned ${response.status}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Webhook failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Normalizes a URL by removing hash and trailing slash
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    let path = parsed.pathname;
    if (path.endsWith('/') && path.length > 1) {
      path = path.slice(0, -1);
    }
    parsed.pathname = path;
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Checks if two URLs are on the same origin
 */
export function isSameOrigin(url1: string, url2: string): boolean {
  try {
    const parsed1 = new URL(url1);
    const parsed2 = new URL(url2);
    return parsed1.origin === parsed2.origin;
  } catch {
    return false;
  }
}
