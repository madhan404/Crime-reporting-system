import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'citizen' | 'staff' | 'investigator' | 'supervisor' | 'admin';
  orgUnit?: string;
  badgeNumber?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};