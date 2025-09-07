import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  UserPlus, 
  Calendar, 
  User,
  FileText,
  MapPin,
  AlertCircle,
  CheckCircle
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
    mobile: string;
  };
  assignedStaff?: {
    _id: string;
    name: string;
    staffId: string;
    department: string;
  };
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  evidenceFiles?: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    uploadDate: string;
  }>;
}

interface Staff {
  _id: string;
  name: string;
  staffId: string;
  department: string;
  status: string;
}

const ManageComplaints: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [assignmentModal, setAssignmentModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    crimeType: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchComplaints();
    fetchStaff();
  }, [currentPage, filters]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/complaints?${params}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setComplaints(data.complaints);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/staff?status=active', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchComplaintDetails = async (caseId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/complaints/${caseId}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedComplaint(data.complaint);
      }
    } catch (error) {
      console.error('Failed to fetch complaint details:', error);
    }
  };

  const assignComplaint = async () => {
    if (!selectedComplaint || !selectedStaffId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/complaints/${selectedComplaint.caseId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ staffId: selectedStaffId }),
      });

      if (response.ok) {
        setAssignmentModal(false);
        setSelectedStaffId('');
        fetchComplaints();
        if (selectedComplaint) {
          fetchComplaintDetails(selectedComplaint.caseId);
        }
      }
    } catch (error) {
      console.error('Failed to assign complaint:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Filed': 'bg-blue-100 text-blue-800',
      'Assigned': 'bg-yellow-100 text-yellow-800',
      'Under Investigation': 'bg-purple-100 text-purple-800',
      'Evidence Collected': 'bg-indigo-100 text-indigo-800',
      'Suspect Identified': 'bg-orange-100 text-orange-800',
      'Report Submitted': 'bg-teal-100 text-teal-800',
      'Completed': 'bg-green-100 text-green-800',
      'Closed': 'bg-gray-100 text-gray-800',
      'Rejected': 'bg-red-100 text-red-800'
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

  // Investigation Reports Section Component
  const InvestigationReportsSection = ({ caseId }: { caseId: string }) => {
    const [investigations, setInvestigations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedInvestigation, setSelectedInvestigation] = useState<any>(null);

    const fetchInvestigations = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/investigations/case/${caseId}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setInvestigations(data.investigations || []);
        }
      } catch (error) {
        console.error('Error fetching investigations:', error);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      if (caseId) {
        fetchInvestigations();
      }
    }, [caseId]);

    const InvestigationDetailsModal = () => {
      if (!selectedInvestigation) return null;

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedInvestigation.title}</h3>
                  <p className="text-gray-600">Investigation Report</p>
                </div>
                <button
                  onClick={() => setSelectedInvestigation(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Investigation Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Type</h4>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {selectedInvestigation.investigationType}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Hours Spent</h4>
                  <span className="text-sm text-gray-900">{selectedInvestigation.hoursSpent || 0} hours</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Date</h4>
                  <span className="text-sm text-gray-900">
                    {new Date(selectedInvestigation.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Staff Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Investigation Staff</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium text-gray-900">{selectedInvestigation.staffId?.name || 'Unknown Staff'}</p>
                  <p className="text-sm text-gray-600">
                    {selectedInvestigation.staffId?.staffId} • {selectedInvestigation.staffId?.department}
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Investigation Notes</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedInvestigation.notes}</p>
                </div>
              </div>

              {/* Attachments */}
              {selectedInvestigation.attachments && selectedInvestigation.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Investigation Attachments</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedInvestigation.attachments.map((file: any, index: number) => (
                        <div key={index} className="flex items-center space-x-3 p-2 bg-white rounded border">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-gray-600" />
                            </div>
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
                              onClick={() => window.open(`/api/investigations/${selectedInvestigation._id}/attachments/${file.filename}`, '_blank')}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Investigation Reports</h4>
          {loading ? (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-500 text-sm">Loading investigation reports...</p>
            </div>
          ) : investigations.length > 0 ? (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="space-y-2">
                {investigations.map((investigation) => (
                  <div key={investigation._id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{investigation.title}</p>
                      <p className="text-xs text-gray-500">
                        {investigation.investigationType} • {investigation.staffId?.name} • {new Date(investigation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedInvestigation(investigation)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Report
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-gray-500 text-sm">No investigation reports found for this case.</p>
            </div>
          )}
        </div>
        <InvestigationDetailsModal />
      </>
    );
  };

  const ComplaintDetailsModal = () => {
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
                {!selectedComplaint.assignedStaff && (
                  <button
                    onClick={() => setAssignmentModal(true)}
                    className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Assign Staff</span>
                  </button>
                )}
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
            {/* Complainant Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Complainant Information</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">{selectedComplaint.userId?.name || 'Unknown User'}</p>
                <p className="text-sm text-gray-600">{selectedComplaint.userId?.email || 'No email'}</p>
                <p className="text-sm text-gray-600">{selectedComplaint.userId?.mobile || 'No mobile'}</p>
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Incident Location</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <p className="text-gray-900">{selectedComplaint.location.address}</p>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Coordinates: {selectedComplaint.location.latitude}, {selectedComplaint.location.longitude}
                </p>
              </div>
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Status</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedComplaint.status)}`}>
                  {selectedComplaint.status}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Priority Level</h4>
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

            {/* Assigned Staff */}
            {selectedComplaint.assignedStaff ? (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Staff</h4>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="font-medium text-gray-900">{selectedComplaint.assignedStaff.name}</p>
                  <p className="text-sm text-gray-600">
                    {selectedComplaint.assignedStaff.staffId} • {selectedComplaint.assignedStaff.department}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-yellow-800">This complaint has not been assigned to any staff member yet.</p>
                </div>
              </div>
            )}

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

            {/* Investigation Reports */}
            <InvestigationReportsSection caseId={selectedComplaint.caseId} />
          </div>
        </div>
      </div>
    );
  };

  const AssignmentModal = () => {
    if (!assignmentModal || !selectedComplaint) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-xl max-w-md w-full">
          <div className="p-6 border-b">
            <h3 className="text-lg font-bold text-gray-900">Assign Staff Member</h3>
            <p className="text-sm text-gray-600 mt-1">
              Select a staff member to assign to case {selectedComplaint.caseId}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Staff Members
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a staff member</option>
                {staff.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.staffId}) - {member.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setAssignmentModal(false);
                  setSelectedStaffId('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={assignComplaint}
                disabled={!selectedStaffId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Assign
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Manage Complaints</h2>
        
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search complaints..."
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
              <option value="Filed">Filed</option>
              <option value="Assigned">Assigned</option>
              <option value="Under Investigation">Under Investigation</option>
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

            <select
              name="crimeType"
              value={filters.crimeType}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Crime Types</option>
              <option value="Theft/Robbery">Theft/Robbery</option>
              <option value="Assault">Assault</option>
              <option value="Fraud">Fraud</option>
              <option value="Cybercrime">Cybercrime</option>
            </select>

            <button
              onClick={() => {
                setFilters({ status: '', priority: '', crimeType: '', search: '' });
                setCurrentPage(1);
              }}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </button>
          </div>
        </div>

        {/* Complaints List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading complaints...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-gray-500 mt-2">No complaints found</p>
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
                        {!complaint.assignedStaff && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            Unassigned
                          </span>
                        )}
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
                          <span>{complaint.userId?.name || 'Unknown User'}</span>
                        </div>
                        {complaint.assignedStaff && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{complaint.assignedStaff.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!complaint.assignedStaff && (
                        <button
                          onClick={() => {
                            setSelectedComplaint(complaint);
                            setAssignmentModal(true);
                          }}
                          className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <UserPlus className="h-4 w-4" />
                          <span>Assign</span>
                        </button>
                      )}
                      <button
                        onClick={() => fetchComplaintDetails(complaint.caseId)}
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
      <ComplaintDetailsModal />
      <AssignmentModal />
    </div>
  );
};

export default ManageComplaints;