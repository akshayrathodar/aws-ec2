import { Navigate } from 'react-router-dom';
import { useAuth } from './auth';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}
