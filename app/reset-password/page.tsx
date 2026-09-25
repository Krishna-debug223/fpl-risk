import ResetPasswordPanel from "@/components/ResetPasswordPanel";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "FPL Prism — Reset password",
  description: "Choose a new password for your optional FPL Prism account.",
  path: "/reset-password",
  noindex: true,
});

export default function ResetPasswordPage() {
  return <ResetPasswordPanel />;
}
