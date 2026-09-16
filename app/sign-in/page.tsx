import type { Metadata } from "next";
import SignInPanel from "@/components/SignInPanel";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Optional FPL Risk account sign in for saving your Team ID and planning defaults.",
  alternates: { canonical: "/sign-in" },
};

export default function SignInPage() {
  return <SignInPanel />;
}
