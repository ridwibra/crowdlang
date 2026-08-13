import UnauthorizedComponent from "@/components/auth/UnauthorizedForm";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <UnauthorizedComponent />
    </Suspense>
  );
}
