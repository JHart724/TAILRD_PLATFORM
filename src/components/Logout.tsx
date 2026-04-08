import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Logout: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
 localStorage.removeItem('tailrd-session-token');
 localStorage.removeItem('tailrd-refresh-token');
 localStorage.removeItem('tailrd-user');
 localStorage.removeItem('tailrd-user-id');
 sessionStorage.clear();
 navigate('/', { replace: true });
  }, [navigate]);

  return (
 <div className="min-h-screen bg-gradient-to-br from-titanium-50 via-titanium-100 to-titanium-200 flex items-center justify-center">
 <div className="text-center">
 <p className="text-titanium-600">Logging out...</p>
 </div>
 </div>
  );
};

export default Logout;