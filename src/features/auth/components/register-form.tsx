"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler, type UseFormRegister } from "react-hook-form";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
  registerSchema,
  type RegisterValues,
} from "@/validators/auth";

const defaultValues: RegisterValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

type FieldProps = {
  autoComplete: string;
  error?: string;
  id: keyof RegisterValues;
  label: string;
  register: UseFormRegister<RegisterValues>;
  type?: "email" | "password" | "text";
};

function RegisterField({
  autoComplete,
  error,
  id,
  label,
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
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error) || undefined}
        autoComplete={autoComplete}
        id={id}
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
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    defaultValues,
    resolver: zodResolver(registerSchema),
  });

  const onSubmit: SubmitHandler<RegisterValues> = async (values) => {
    try {
      const result = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (result.error) {
        setError("root", {
          message:
            "Unable to create your account. Check your details and try again.",
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
    <div className="flex w-full min-w-0 flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex h-16 items-center justify-center md:h-auto md:justify-start">
          <Brand />
        </div>
        <header className="text-center md:text-left">
          <h1
            className="text-[28px] leading-9 font-bold text-foreground md:text-[30px]"
            id="register-title"
          >
            Create your account
          </h1>
          <p className="mt-2 text-body-sm leading-5 text-muted-foreground">
            Start collecting and organizing product feedback.
          </p>
        </header>
      </div>

      <form
        aria-labelledby="register-title"
        className="flex flex-col gap-6"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        <RegisterField
          autoComplete="name"
          error={errors.name?.message}
          id="name"
          label="Name"
          register={register}
        />
        <RegisterField
          autoComplete="username"
          error={errors.email?.message}
          id="email"
          label="Email"
          register={register}
          type="email"
        />
        <RegisterField
          autoComplete="new-password"
          error={errors.password?.message}
          id="password"
          label="Password"
          register={register}
          type="password"
        />
        <RegisterField
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          id="confirmPassword"
          label="Confirm password"
          register={register}
          type="password"
        />

        {errors.root?.message ? (
          <p className="text-body-sm text-error" role="alert">
            {errors.root.message}
          </p>
        ) : null}

        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </div>
  );
}
