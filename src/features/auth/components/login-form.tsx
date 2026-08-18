"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { loginSchema, type LoginValues } from "@/validators/auth";

const defaultValues: LoginValues = {
  email: "",
  password: "",
  remember: false,
};

export function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    defaultValues,
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginValues> = async (values) => {
    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.remember,
      });

      if (result.error) {
        setError("root", {
          message: "Unable to sign in. Check your credentials and try again.",
        });
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("root", { message: "Unable to sign in. Try again." });
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex h-16 items-center justify-center md:h-auto md:justify-start">
          <Brand />
        </div>

        <header className="text-center md:text-left">
          <h1
            className="text-[28px] leading-9 font-bold text-foreground md:text-[30px] md:leading-[normal] lg:text-[31px] lg:leading-[45px]"
            id="login-title"
          >
            Welcome back
          </h1>
          <p className="mt-2 text-body-sm leading-5 text-muted-foreground">
            Sign in to manage the Acme Studio workspace.
          </p>
        </header>
      </div>

      <form
        aria-labelledby="login-title"
        className="flex flex-col gap-6 md:gap-8"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-6 md:gap-8 lg:gap-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                className="text-body-sm leading-[17px] font-semibold text-text"
                htmlFor="email"
              >
                Email
              </label>
              <Input
                aria-describedby={errors.email ? "email-error" : undefined}
                aria-invalid={Boolean(errors.email) || undefined}
                autoComplete="username"
                id="email"
                inputMode="email"
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-error" id="email-error" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-body-sm leading-[17px] font-semibold text-text"
                htmlFor="password"
              >
                Password
              </label>
              <Input
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                aria-invalid={Boolean(errors.password) || undefined}
                autoComplete="current-password"
                id="password"
                type="password"
                {...register("password")}
              />
              {errors.password ? (
                <p
                  className="text-xs text-error"
                  id="password-error"
                  role="alert"
                >
                  {errors.password.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] leading-[17px] font-semibold text-text md:text-body-sm">
              <input
                className="size-[18px] appearance-none rounded-[4px] border-2 border-border bg-background transition-colors duration-200 checked:border-primary checked:bg-[url('/icons/check.svg')] checked:bg-center checked:bg-no-repeat focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:size-4 md:border-[1.5px] md:border-text"
                type="checkbox"
                {...register("remember")}
              />
              Remember me
            </label>

          </div>
        </div>

        <div className="flex flex-col gap-6 md:gap-8 lg:gap-6">
          {errors.root?.message ? (
            <p className="text-body-sm text-error" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <Button
            className="h-[46px] w-full md:h-11"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

          <aside
            aria-label="Demo account credentials"
            className="flex flex-col gap-2 rounded-[12px] bg-surface-brand p-4 md:gap-2.5 md:p-[18px] lg:gap-2 lg:p-4"
          >
            <p className="text-body-sm leading-[17px] font-bold text-primary">
              Demo account
            </p>
            <p className="break-words text-[13px] leading-4 font-semibold text-text lg:leading-[17px]">
              demo@feedbackflow.app · Demo1234!
            </p>
            <p className="text-[11px] leading-[13px] text-muted-foreground lg:leading-[15px]">
              Credentials also appear in the live README.
            </p>
          </aside>
        </div>
      </form>
    </div>
  );
}
