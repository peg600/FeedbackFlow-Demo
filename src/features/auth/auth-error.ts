type AuthClientError = {
  code?: string;
  message?: string;
};

export function getAuthErrorMessage(
  error: AuthClientError,
  allowedCodes: ReadonlySet<string>,
  fallback: string,
) {
  const message = error.message?.trim();

  if (!error.code || !allowedCodes.has(error.code) || !message) {
    return fallback;
  }

  return message;
}
