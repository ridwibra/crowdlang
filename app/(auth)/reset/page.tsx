//app/(auth)/reset/page.ts
import ResetForm from "@/components/auth/ResetForm";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Reset Password Page",
};

function ResetFormLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4 py-10 dark:bg-[#0f172a]">
      <div className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-6 py-4 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />

        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Loading password reset...
        </span>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<ResetFormLoading />}>
      <ResetForm />
    </Suspense>
  );
}
