import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getSessionUser } from "@/lib/session";

interface AuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireCoach?: boolean;
}

const AuthGuard = ({ children, requireAdmin = false, requireCoach = false }: AuthGuardProps) => {
  const user = getSessionUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !["admin", "super_admin"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  if (requireCoach && !["coach", "admin", "super_admin"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
