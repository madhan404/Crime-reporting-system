import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import UserDashboard from './components/user/UserDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import StaffDashboard from './components/staff/StaffDashboard';
import { useAuth } from './hooks/useAuth';
import { Shield, AlertTriangle } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-blue-500 mr-3" />
              <h1 className="text-4xl font-bold text-white">
                Crime Management System
              </h1>
            </div>
            <p className="text-slate-300 text-lg">
              Secure platform for reporting and tracking criminal cases
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="flex border-b">
                <button
                  onClick={() => setCurrentView('login')}
                  className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                    currentView === 'login'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setCurrentView('register')}
                  className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                    currentView === 'register'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Register
                </button>
              </div>

              <div className="p-6">
                {currentView === 'login' ? (
                  <LoginForm onSwitchToRegister={() => setCurrentView('register')} />
                ) : (
                  <RegisterForm onSwitchToLogin={() => setCurrentView('login')} />
                )}
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-200">
                  <p className="font-medium mb-1">Demo Credentials:</p>
                  <p><strong>Admin:</strong> admin@example.com / admin123</p>
                  <p><strong>Staff:</strong> staff@example.com / staff123</p>
                  <p><strong>User:</strong> user@example.com / user123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate dashboard based on user role
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'staff':
      return <StaffDashboard />;
    case 'citizen':
    default:
      return <UserDashboard />;
  }
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;