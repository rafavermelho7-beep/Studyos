import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · StudyOS" };

export default function LoginPage() {
  return <LoginForm />;
}
