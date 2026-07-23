const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection.', 0);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = typeof body?.detail === 'string' ? body.detail : 'Request failed';
    throw new ApiError(detail, response.status);
  }

  return body as T;
}

export const apiClient = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: 'GET' }, token),
  post: <T>(path: string, data: unknown, token?: string | null) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }, token),
  put: <T>(path: string, data: unknown, token?: string | null) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }, token),
};
