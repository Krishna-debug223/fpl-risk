import type { Metadata } from "next";
import SignInPanel from "@/components/SignInPanel";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to save your FPL Risk setup, or continue as a guest.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <SignInPanel />;
}
