type AuthClientError = {
  code?: string;
  message?: string;
  status?: number;
};

type AuthOperation = "signIn" | "signUp" | "signOut";

const authErrors = {
  AUTH_INVALID_CREDENTIALS: "Invalid email or password",
  AUTH_INVALID_EMAIL: "Enter a valid email address.",
  AUTH_EMAIL_TAKEN: "User already exists. Use another email.",
  AUTH_PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
  AUTH_PASSWORD_TOO_LONG: "Password must be at most 128 characters.",
  AUTH_RATE_LIMITED: "Too many attempts. Please wait before trying again.",
  AUTH_SIGN_IN_FAILED: "Unable to sign in. Check your credentials and try again.",
  AUTH_SIGN_UP_FAILED: "Unable to create your account. Check your details and try again.",
  AUTH_SIGN_OUT_FAILED: "Unable to sign out. Try again.",
} as const;

type AuthErrorCode = keyof typeof authErrors;

const fallbackCodes: Record<AuthOperation, AuthErrorCode> = {
  signIn: "AUTH_SIGN_IN_FAILED",
  signUp: "AUTH_SIGN_UP_FAILED",
  signOut: "AUTH_SIGN_OUT_FAILED",
};

const authErrorRules: Record<AuthOperation, Readonly<Partial<Record<string, AuthErrorCode>>>> = {
  signIn: {
    INVALID_EMAIL: "AUTH_INVALID_EMAIL",
    INVALID_EMAIL_OR_PASSWORD: "AUTH_INVALID_CREDENTIALS",
    INVALID_PASSWORD: "AUTH_INVALID_CREDENTIALS",
    USER_NOT_FOUND: "AUTH_INVALID_CREDENTIALS",
  },
  signUp: {
    INVALID_EMAIL: "AUTH_INVALID_EMAIL",
    PASSWORD_TOO_SHORT: "AUTH_PASSWORD_TOO_SHORT",
    PASSWORD_TOO_LONG: "AUTH_PASSWORD_TOO_LONG",
    USER_ALREADY_EXISTS: "AUTH_EMAIL_TAKEN",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "AUTH_EMAIL_TAKEN",
  },
  signOut: {},
};

// 将 Better Auth 的错误码映射为本地白名单文案，避免把上游内部错误或敏感细节直接展示给用户。
export function getAuthError(error: AuthClientError | undefined, operation: AuthOperation) {
  const code = error?.status === 429
    ? "AUTH_RATE_LIMITED"
    : (error?.code && Object.hasOwn(authErrorRules[operation], error.code)
        ? authErrorRules[operation][error.code]
        : undefined) ?? fallbackCodes[operation];
  return { code, message: authErrors[code] };
}
