import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import ManageStaff from './ManageStaff';
import ManageComplaints from './ManageComplaints';
import { 
  Home, 
  Users, 
  FileText, 
  LogOut, 
  User, 
  BarChart3,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalStaff: number;
  totalComplaints: number;
  pendingComplaints: number;
  assignedComplaints: number;
  resolvedComplaints: number;
  recentComplaints: any[];
  crimeTypeStats: { _id: string; count: number }[];
  statusStats: Record<string, number>;
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchAdminStats();
    }
  }, [activeTab]);

  const fetchAdminStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/admin-stats', {
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
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'complaints', label: 'Manage Complaints', icon: FileText },
    { id: 'staff', label: 'Manage Staff', icon: Users },
  ];

  const StatCard: React.FC<{ 
    title: string; 
    value: number; 
    color: string; 
    icon: React.ReactNode;
    trend?: string;
  }> = ({ title, value, color, icon, trend }) => (
    <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-xs text-gray-500 mt-1">{trend}</p>
          )}
        </div>
        <div className="text-gray-400">
          {icon}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'complaints':
        return <ManageComplaints />;
      case 'staff':
        return <ManageStaff />;
      case 'dashboard':
      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : stats ? (
                <>
                  {/* Main Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <StatCard
                      title="Total Users"
                      value={stats.totalUsers}
                      color="border-blue-500"
                      icon={<Users className="h-8 w-8" />}
                    />
                    <StatCard
                      title="Active Staff"
                      value={stats.totalStaff}
                      color="border-green-500"
                      icon={<Shield className="h-8 w-8" />}
                    />
                    <StatCard
                      title="Total Complaints"
                      value={stats.totalComplaints}
                      color="border-purple-500"
                      icon={<FileText className="h-8 w-8" />}
                    />
                  </div>

                  {/* Complaint Status Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                      title="Pending Complaints"
                      value={stats.pendingComplaints}
                      color="border-yellow-500"
                      icon={<Clock className="h-8 w-8" />}
                    />
                    <StatCard
                      title="Active Cases"
                      value={stats.assignedComplaints}
                      color="border-orange-500"
                      icon={<AlertTriangle className="h-8 w-8" />}
                    />
                    <StatCard
                      title="Resolved Cases"
                      value={stats.resolvedComplaints}
                      color="border-green-500"
                      icon={<CheckCircle className="h-8 w-8" />}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Complaints */}
                    {stats.recentComplaints && stats.recentComplaints.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Complaints</h3>
                        <div className="space-y-4">
                          {stats.recentComplaints.slice(0, 5).map((complaint) => (
                            <div
                              key={complaint._id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{complaint.title}</p>
                                <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                                  <span>{complaint.caseId}</span>
                                  <span>•</span>
                                  <span>{complaint.crimeType}</span>
                                  <span>•</span>
                                  <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  complaint.status === 'Filed' ? 'bg-blue-100 text-blue-800' :
                                  complaint.status === 'Assigned' ? 'bg-yellow-100 text-yellow-800' :
                                  complaint.status === 'Under Investigation' ? 'bg-purple-100 text-purple-800' :
                                  complaint.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {complaint.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Crime Type Distribution */}
                    {stats.crimeTypeStats && stats.crimeTypeStats.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Crime Type Distribution</h3>
                        <div className="space-y-3">
                          {stats.crimeTypeStats.slice(0, 6).map((item, index) => (
                            <div key={item._id} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">{item._id}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{
                                      width: `${(item.count / Math.max(...stats.crimeTypeStats.map(s => s.count))) * 100}%`
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-900 w-8">{item.count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('complaints')}
                  className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
                >
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Manage Complaints</h4>
                    <p className="text-sm text-gray-600">View and assign cases</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
                >
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Manage Staff</h4>
                    <p className="text-sm text-gray-600">Add and manage staff members</p>
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
            <Shield className="h-8 w-8 mr-2" />
            <h1 className="text-lg font-semibold">Admin Portal</h1>
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

export default AdminDashboard;