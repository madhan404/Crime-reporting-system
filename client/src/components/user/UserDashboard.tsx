import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import FileComplaintForm from './FileComplaintForm';
import MyComplaints from './MyComplaints';
import { 
  Home, 
  FileText, 
  List, 
  LogOut, 
  User, 
  Bell,
  BarChart3,
  Plus,
  AlertTriangle
} from 'lucide-react';

interface DashboardStats {
  totalComplaints: number;
  pendingComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
  recentComplaints: any[];
}

const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/dashboard-stats', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'file-complaint', label: 'File Complaint', icon: Plus },
    { id: 'my-complaints', label: 'My Complaints', icon: List },
  ];

  const StatCard: React.FC<{ title: string; value: number; color: string; icon: React.ReactNode }> = 
    ({ title, value, color, icon }) => (
    <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-gray-400">
          {icon}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'file-complaint':
        return <FileComplaintForm onComplaintFiled={() => setActiveTab('my-complaints')} />;
      case 'my-complaints':
        return <MyComplaints />;
      case 'dashboard':
      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Total Complaints"
                    value={stats.totalComplaints}
                    color="border-blue-500"
                    icon={<FileText className="h-8 w-8" />}
                  />
                  <StatCard
                    title="Pending"
                    value={stats.pendingComplaints}
                    color="border-yellow-500"
                    icon={<AlertTriangle className="h-8 w-8" />}
                  />
                  <StatCard
                    title="In Progress"
                    value={stats.inProgressComplaints}
                    color="border-blue-500"
                    icon={<BarChart3 className="h-8 w-8" />}
                  />
                  <StatCard
                    title="Resolved"
                    value={stats.resolvedComplaints}
                    color="border-green-500"
                    icon={<FileText className="h-8 w-8" />}
                  />
                </div>
              ) : null}
            </div>

            {stats?.recentComplaints && stats.recentComplaints.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Complaints</h3>
                <div className="space-y-4">
                  {stats.recentComplaints.map((complaint) => (
                    <div
                      key={complaint._id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{complaint.title}</p>
                        <p className="text-sm text-gray-600">
                          Case ID: {complaint.caseId} • {new Date(complaint.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          complaint.status === 'Filed' ? 'bg-blue-100 text-blue-800' :
                          complaint.status === 'Assigned' ? 'bg-yellow-100 text-yellow-800' :
                          complaint.status === 'Under Investigation' ? 'bg-purple-100 text-purple-800' :
                          complaint.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {complaint.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          complaint.priority === 'High' ? 'bg-red-100 text-red-800' :
                          complaint.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {complaint.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('file-complaint')}
                  className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
                >
                  <Plus className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">File New Complaint</h4>
                    <p className="text-sm text-gray-600">Report a new incident</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('my-complaints')}
                  className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
                >
                  <List className="h-8 w-8 text-green-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">View My Complaints</h4>
                    <p className="text-sm text-gray-600">Track your cases</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600 text-white">
            <FileText className="h-8 w-8 mr-2" />
            <h1 className="text-lg font-semibold">Crime Portal</h1>
          </div>

          {/* User Info */}
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t">
            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default UserDashboard;