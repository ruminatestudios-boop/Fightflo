export async function parseJsonResponse<T = Record<string, unknown>>(
  response: Response
): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    if (
      response.status === 413 ||
      /request entity too large/i.test(text)
    ) {
      throw new Error(
        "Video is too large to send through the server. Use a shorter clip or compress the file."
      );
    }
    throw new Error(
      text.slice(0, 160).trim() || `Request failed (${response.status})`
    );
  }
}
