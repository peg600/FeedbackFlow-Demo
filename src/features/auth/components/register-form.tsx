"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useForm,
  useWatch,
  type SubmitHandler,
  type UseFormRegister,
} from "react-hook-form";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/features/auth/auth-error";
import { authClient } from "@/lib/auth-client";
import {
  registerSchema,
  type RegisterValues,
} from "@/validators/auth";

const visibleSignUpErrorCodes = new Set([
  "INVALID_EMAIL",
  "PASSWORD_TOO_LONG",
  "PASSWORD_TOO_SHORT",
  "USER_ALREADY_EXISTS",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
]);

const defaultValues: RegisterValues = {
  name: "",
  email: "",
  password: "",
};

type PasswordStrength = {
  barClassName: string;
  label: "Fair" | "Good" | "Not entered" | "Weak";
  textClassName: string;
  value: number;
};

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      barClassName: "bg-border",
      label: "Not entered",
      textClassName: "text-muted-foreground",
      value: 0,
    };
  }

  if (password.length < 8) {
    return {
      barClassName: "bg-error",
      label: "Weak",
      textClassName: "text-error",
      value: 25,
    };
  }

  const characterGroups = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(
    (pattern) => pattern.test(password),
  ).length;

  if (characterGroups < 3) {
    return {
      barClassName: "bg-warning-strong",
      label: "Fair",
      textClassName: "text-warning-strong",
      value: 50,
    };
  }

  return {
    barClassName: "bg-success",
    label: "Good",
    textClassName: "text-success",
    value: 68,
  };
}

type FieldProps = {
  autoComplete: string;
  describedBy?: string;
  error?: string;
  id: keyof RegisterValues;
  label: string;
  placeholder?: string;
  register: UseFormRegister<RegisterValues>;
  type?: "email" | "password" | "text";
};

function RegisterField({
  autoComplete,
  describedBy,
  error,
  id,
  label,
  placeholder,
  register,
  type = "text",
}: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label
        className="text-body-sm leading-[17px] font-semibold text-text"
        htmlFor={id}
      >
        {label}
      </label>
      <Input
        aria-describedby={
          [describedBy, error ? errorId : undefined].filter(Boolean).join(" ") ||
          undefined
        }
        aria-invalid={Boolean(error) || undefined}
        autoComplete={autoComplete}
        id={id}
        placeholder={placeholder}
        type={type}
        {...register(id)}
      />
      {error ? (
        <p className="text-xs text-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    defaultValues,
    resolver: zodResolver(registerSchema),
  });
  const passwordStrength = getPasswordStrength(
    useWatch({ control, name: "password" }),
  );

  const onSubmit: SubmitHandler<RegisterValues> = async (values) => {
    try {
      const result = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (result.error) {
        setError("root", {
          message: getAuthErrorMessage(
            result.error,
            visibleSignUpErrorCodes,
            "Unable to create your account. Check your details and try again.",
          ),
        });
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("root", {
        message: "Unable to create your account. Try again.",
      });
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 md:gap-7 lg:gap-8 xl:gap-[54px]">
      <div className="flex flex-col gap-6 lg:gap-9 xl:gap-[66px]">
        <div className="flex h-16 items-center justify-center md:h-auto md:justify-start">
          <Brand />
        </div>
        <header className="text-center md:text-left">
          <h1
            className="text-[28px] leading-9 font-bold text-foreground md:text-[30px]"
            id="register-title"
          >
            <span className="md:hidden">Create account</span>
            <span className="hidden md:inline">Create your account</span>
          </h1>
          <p className="mt-2 text-body-sm leading-5 text-muted-foreground">
            One account owns one focused product workspace.
          </p>
        </header>
      </div>

      <form
        aria-labelledby="register-title"
        className="flex flex-col gap-7 lg:gap-8"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-4 lg:gap-5 xl:gap-6">
          <RegisterField
            autoComplete="name"
            error={errors.name?.message}
            id="name"
            label="Name"
            placeholder="e.g. Paul Maker"
            register={register}
          />
          <RegisterField
            autoComplete="username"
            error={errors.email?.message}
            id="email"
            label="Email"
            placeholder="e.g. paul@example.com"
            register={register}
            type="email"
          />
          <RegisterField
            autoComplete="new-password"
            describedBy="password-strength"
            error={errors.password?.message}
            id="password"
            label="Password"
            placeholder="Must be at least 8 characters"
            register={register}
            type="password"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div
            aria-live="polite"
            className="flex items-center justify-between text-xs text-text"
            id="password-strength"
          >
            <span>Password strength</span>
            <span className={`font-semibold ${passwordStrength.textClassName}`}>
              {passwordStrength.label}
            </span>
          </div>
          <div
            aria-label="Password strength"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={passwordStrength.value}
            aria-valuetext={passwordStrength.label}
            className="h-1.5 overflow-hidden rounded-full bg-border"
            role="progressbar"
          >
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-200 ease-out ${passwordStrength.barClassName}`}
              style={{ width: `${passwordStrength.value}%` }}
            />
          </div>
        </div>

        {errors.root?.message ? (
          <p className="text-body-sm text-error" role="alert">
            {errors.root.message}
          </p>
        ) : null}

        <div className="flex flex-col items-stretch gap-6 md:gap-7 lg:gap-4">
          <Button
            className="h-[46px] md:h-11"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-center text-[11px] leading-4 text-muted-foreground">
            By creating an account, the Terms and Privacy Policy apply.
          </p>

          <p className="text-left text-body-sm text-muted-foreground lg:text-center">
            Already have an account?{" "}
            {isSubmitting ? (
              <span
                aria-disabled="true"
                className="font-semibold text-disabled-foreground"
              >
                Log in
              </span>
            ) : (
              <Link
                className="rounded-sm font-semibold text-primary transition-colors duration-200 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                href="/login"
              >
                Log in
              </Link>
            )}
          </p>
        </div>
      </form>
    </div>
  );
}
