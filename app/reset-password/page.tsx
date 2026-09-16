import type { Metadata } from "next";
import ResetPasswordPanel from "@/components/ResetPasswordPanel";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your optional FPL Risk account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordPanel />;
}
