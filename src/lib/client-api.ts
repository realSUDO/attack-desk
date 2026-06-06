type ApiErrorBody = {
  message?: string;
  error?: {
    fields?: Record<string, string>;
  };
};

export async function apiRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json()) as ApiErrorBody & {
    data?: T;
  };

  if (!response.ok || body.data === undefined) {
    const fieldMessage = body.error?.fields
      ? Object.values(body.error.fields)[0]
      : undefined;
    throw new Error(fieldMessage ?? body.message ?? "Request failed");
  }

  return body.data;
}
