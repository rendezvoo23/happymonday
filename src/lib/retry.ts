export async function retryAsync<T>(
  operation: () => Promise<T>,
  attempts = 3,
  initialDelayMs = 400
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < attempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, initialDelayMs * 2 ** attempt)
        );
      }
    }
  }

  throw lastError;
}
