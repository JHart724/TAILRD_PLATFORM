import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate(`/login?error=${error}`);
      return;
    }

    if (token) {
      localStorage.setItem('tailrd-session-token', token);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        localStorage.setItem('tailrd-user', JSON.stringify({
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          hospitalId: payload.hospitalId,
          hospitalName: payload.hospitalName,
        }));
      } catch {
        // Token decode failed — navigate anyway, auth context will handle
      }
      navigate('/dashboard');
    } else {
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-titanium-50 via-titanium-100 to-titanium-200">
      <p className="text-titanium-600">Completing sign-in...</p>
    </div>
  );
}
