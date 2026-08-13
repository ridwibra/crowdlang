import "./globals.css";
import AutoLogout from "@/components/auth/AutoLogout";
import { Toaster } from "sonner";
import ClientThemeProvider from "@/components/shared/ClientThemeProvider";
import PageTracker from "@/components/PageTracker";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning={true} className="">
        <AutoLogout />
        <PageTracker />
        <ClientThemeProvider>
          <Toaster
            position="top-right"
            theme="system"
            duration={5000}
            richColors
            visibleToasts={1}
            closeButton
          />
          {children}
        </ClientThemeProvider>
      </body>
    </html>
  );
}
