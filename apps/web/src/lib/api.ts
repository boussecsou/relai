export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  };
  let response = await fetch("/api/v1/" + path, options);
  if (response.status === 401 && path !== "bootstrap") {
    await fetch("/api/v1/bootstrap");
    response = await fetch("/api/v1/" + path, options);
  }
  if (!response.ok) {
    let message = "The local service is unavailable.";
    try {
      message = (await response.json()).error || message;
    } catch {}
    throw new ApiError(response.status, message);
  }
  return response.json();
}
