export async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`The server returned an unexpected response (${response.status}). Please try again.`);
  }
  return (await response.json()) as T;
}
