//app/(auth)/verify/[token]/page.ts

import VerifyForm from "@/components/auth/VerifyForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Account",
};

const VerifyPage = () => {
  return <VerifyForm />;
};

export default VerifyPage;
