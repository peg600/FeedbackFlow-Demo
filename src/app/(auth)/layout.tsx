import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = { robots: NO_INDEX };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
