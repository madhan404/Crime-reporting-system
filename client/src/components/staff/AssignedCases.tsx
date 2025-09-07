import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Calendar, 
  User,
  FileText,
  MapPin,
  Clock
} from 'lucide-react';

interface Complaint {
  _id: string;
  caseId: string;
  title: string;
  status: string;
  priority: string;
  crimeType: string;
  createdAt: string;
  userId: {
    name: string;
    email: string;
  };
  location: {
    address: string;
  };
  evidenceFiles?: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    uploadDate: string;
  }>;
  statusHistory: Array<{
    status: string;
    date: string;
    notes?: string;
  }>;
}

const AssignedCases: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [updateModal, setUpdateModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    notes: ''
  });
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAssignedCases();
  }, [currentPage, filters]);

  const fetchAssignedCases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/complaints?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setComplaints(data.complaints);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch assigned cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseDetails = async (caseId: string) => {
    try {
      const response = await fetch(`/api/complaints/${caseId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedComplaint(data.complaint);
      }
    } catch (error) {
      console.error('Failed to fetch case details:', error);
    }
  };

  const updateCaseStatus = async () => {
    if (!selectedComplaint || !statusUpdate.status) return;

    try {
      const response = await fetch(`/api/complaints/${selectedComplaint.caseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(statusUpdate),
      });

      if (response.ok) {
        setUpdateModal(false);
        setStatusUpdate({ status: '', notes: '' });
        fetchAssignedCases();
        if (selectedComplaint) {
          fetchCaseDetails(selectedComplaint.caseId);
        }
      }
    } catch (error) {
      console.error('Failed to update case status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Assigned': 'bg-yellow-100 text-yellow-800',
      'Under Investigation': 'bg-purple-100 text-purple-800',
      'Evidence Collected': 'bg-indigo-100 text-indigo-800',
      'Suspect Identified': 'bg-orange-100 text-orange-800',
      'Report Submitted': 'bg-teal-100 text-teal-800',
      'Completed': 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'Low': 'bg-green-100 text-green-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'High': 'bg-orange-100 text-orange-800',
      'Critical': 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
    setCurrentPage(1);
  };

  const CaseDetailsModal = () => {
    if (!selectedComplaint) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedComplaint.title}</h3>
                <p className="text-gray-600">Case ID: {selectedComplaint.caseId}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setStatusUpdate({ 
                      status: selectedComplaint.status, 
                      notes: '' 
                    });
                    setUpdateModal(true);
                  }}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Edit className="h-4 w-4" />
                  <span>Update Status</span>
                </button>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Case Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Status</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedComplaint.status)}`}>
                  {selectedComplaint.status}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Priority</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedComplaint.priority)}`}>
                  {selectedComplaint.priority}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Crime Type</h4>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                  {selectedComplaint.crimeType}
                </span>
              </div>
            </div>

            {/* Complainant and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Complainant</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium text-gray-900">{selectedComplaint.userId.name}</p>
                  <p className="text-sm text-gray-600">{selectedComplaint.userId.email}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Location</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <p className="text-gray-900">{selectedComplaint.location.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Files */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Evidence Files</h4>
              {selectedComplaint.evidenceFiles && selectedComplaint.evidenceFiles.length > 0 ? (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedComplaint.evidenceFiles.map((file, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 bg-white rounded border">
                        <div className="flex-shrink-0">
                          {file.mimetype?.startsWith('image/') ? (
                            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                          ) : file.mimetype?.startsWith('video/') ? (
                            <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-purple-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.originalName || file.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => window.open(`/api/complaints/${selectedComplaint._id}/evidence/${file.filename}`, '_blank')}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-500 text-sm">No evidence files uploaded for this case.</p>
                </div>
              )}
            </div>

            {/* Status Timeline */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Case Timeline</h4>
              <div className="space-y-4">
                {selectedComplaint.statusHistory?.map((history, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(history.status)}`}>
                          {history.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(history.date).toLocaleString()}
                        </span>
                      </div>
                      {history.notes && (
                        <p className="text-sm text-gray-600 mt-1">{history.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const UpdateStatusModal = () => {
    if (!updateModal || !selectedComplaint) return null;

    const statusOptions = [
      'Assigned',
      'Under Investigation',
      'Evidence Collected',
      'Suspect Identified',
      'Report Submitted',
      'Completed'
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-xl max-w-md w-full">
          <div className="p-6 border-b">
            <h3 className="text-lg font-bold text-gray-900">Update Case Status</h3>
            <p className="text-sm text-gray-600 mt-1">
              Update status for case {selectedComplaint.caseId}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                value={statusUpdate.status}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={statusUpdate.notes}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add notes about this status update..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setUpdateModal(false);
                  setStatusUpdate({ status: '', notes: '' });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateCaseStatus}
                disabled={!statusUpdate.status}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Assigned Cases</h2>
        
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search cases..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Evidence Collected">Evidence Collected</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            <button
              onClick={() => {
                setFilters({ status: '', priority: '', search: '' });
                setCurrentPage(1);
              }}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </button>
          </div>
        </div>

        {/* Cases List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading assigned cases...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-gray-500 mt-2">No assigned cases found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {complaints.map((complaint) => (
                <div
                  key={complaint._id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {complaint.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                          {complaint.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <FileText className="h-4 w-4" />
                          <span>{complaint.caseId}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{complaint.userId.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{complaint.crimeType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setStatusUpdate({ 
                            status: complaint.status, 
                            notes: '' 
                          });
                          setSelectedComplaint(complaint);
                          setUpdateModal(true);
                        }}
                        className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Update</span>
                      </button>
                      <button
                        onClick={() => fetchCaseDetails(complaint.caseId)}
                        className="flex items-center space-x-2 px-3 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CaseDetailsModal />
      <UpdateStatusModal />
    </div>
  );
};

export default AssignedCases;