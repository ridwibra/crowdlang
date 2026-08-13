//app/(auth)/forgot/page.ts
import ForgotForm from "@/components/auth/ForgotForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password Page",
};

const ForgotPage = () => {
  return (
    <div>
      <ForgotForm />
    </div>
  );
};

export default ForgotPage;
