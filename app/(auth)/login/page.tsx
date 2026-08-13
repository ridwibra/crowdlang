//app/(auth)/login/page.ts
import LoginForm from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login Page",
};

const RegisterPage = () => {
  return (
    <div>
      <LoginForm />
    </div>
  );
};

export default RegisterPage;
