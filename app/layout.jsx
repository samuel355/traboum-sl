import { ClerkProvider } from "@clerk/nextjs";
import { AuthAuditTracker } from "@/components/AuthAuditTracker";
import "./globals.css";

export const metadata = {
  title: "Trabuom Stool Lands",
  description: "Land management for Trabuom Stool Lands",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      isSatellite={process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE === "true"}
      domain={process.env.NEXT_PUBLIC_CLERK_DOMAIN}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
      appearance={{
        variables: {
          colorPrimary: "#0B0E2D",
          colorText: "#0B0E2D",
          colorBackground: "#FFFFFF",
          borderRadius: "10px",
          fontFamily: '"Outfit", system-ui, sans-serif',
        },
      }}
    >
      <html lang="en">
        <body className="font-sans antialiased">
          <AuthAuditTracker />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
