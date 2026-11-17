import { Navigate, Outlet } from 'react-router-dom';
import type { User } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';

/**
 * Guarda de autenticação. `roles` restringe ainda o acesso por papel
 * (ex.: área administrativa). Sem papéis, mantém o comportamento original.
 */
export default function ProtectedRoute({
  roles,
}: { roles?: User['role'][] } = {}) {
  const { token, user } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (roles?.length && (!user || !roles.includes(user.role))) {
    return <Navigate to={user ? '/app' : '/login'} replace />;
  }
  return <Outlet />;
}
