import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Skeleton } from './ui';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6"><Skeleton style={{ height: 200 }} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
