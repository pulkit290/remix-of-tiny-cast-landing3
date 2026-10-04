import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

// Public-page CTA that becomes a Dashboard link once the visitor is signed in.
export function AuthLink({ to, className, children, signedIn = "Dashboard" }: {
  to: "/login" | "/signup"; className?: string; children: ReactNode; signedIn?: ReactNode;
}) {
  const { user } = useAuth();
  if (user) return <Link to="/dashboard" className={className}>{signedIn}</Link>;
  return <Link to={to} className={className}>{children}</Link>;
}
