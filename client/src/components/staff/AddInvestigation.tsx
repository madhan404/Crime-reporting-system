import React, { useState, useEffect } from 'react';
import { Plus, X, MapPin, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/api';

interface AddInvestigationProps {
  onInvestigationAdded: () => void;
}

interface Complaint {
  _id: string;
  caseId: string;
  title: string;
  status: string;
}

const AddInvestigation: React.FC<AddInvestigationProps> = ({ onInvestigationAdded }) => {
  const [assignedCases, setAssignedCases] = useState<Complaint[]>([]);
  const [formData, setFormData] = useState({
    caseId: '',
    title: '',
    notes: '',
    investigationType: '',
    hoursSpent: 0,
    statusUpdate: ''
  });
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [witnesses, setWitnesses] = useState<any[]>([]);
  const [suspects, setSuspects] = useState<any[]>([]);
  const [nextActions, setNextActions] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const investigationTypes = [
    'Initial Assessment',
    'Evidence Collection',
    'Witness Interview',
    'Scene Investigation',
    'Suspect Investigation',
    'Follow-up',
    'Final Report'
  ];

  const statusOptions = [
    'Under Investigation',
    'Evidence Collected',
    'Suspect Identified',
    'Report Submitted',
    'Completed'
  ];

  useEffect(() => {
    fetchAssignedCases();
  }, []);

  const fetchAssignedCases = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/complaints?limit=100`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignedCases(data.complaints);
      }
    } catch (error) {
      console.error('Failed to fetch assigned cases:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'hoursSpent' ? parseFloat(value) || 0 : value
    });

    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 3) {
      setError('Maximum 3 files allowed');
      return;
    }
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const addMapMarker = () => {
    setMapMarkers([...mapMarkers, {
      latitude: 0,
      longitude: 0,
      label: '',
      description: '',
      markerType: 'other'
    }]);
  };

  const updateMapMarker = (index: number, field: string, value: string | number) => {
    const updated = mapMarkers.map((marker, i) => 
      i === index ? { ...marker, [field]: value } : marker
    );
    setMapMarkers(updated);
  };

  const removeMapMarker = (index: number) => {
    setMapMarkers(mapMarkers.filter((_, i) => i !==  index));
  };

  const addWitness = () => {
    setWitnesses([...witnesses, {
      name: '',
      contact: '',
      statement: '',
      interviewed: false
    }]);
  };

  const updateWitness = (index: number, field: string, value: string | boolean) => {
    const updated = witnesses.map((witness, i) => 
      i === index ? { ...witness, [field]: value } : witness
    );
    setWitnesses(updated);
  };

  const removeWitness = (index: number) => {
    setWitnesses(witnesses.filter((_, i) => i !== index));
  };

  const addSuspect = () => {
    setSuspects([...suspects, {
      name: '',
      description: '',
      status: 'Identified'
    }]);
  };

  const updateSuspect = (index: number, field: string, value: string) => {
    const updated = suspects.map((suspect, i) => 
      i === index ? { ...suspect, [field]: value } : suspect
    );
    setSuspects(updated);
  };

  const removeSuspect = (index: number) => {
    setSuspects(suspects.filter((_, i) => i !== index));
  };

  const addNextAction = () => {
    setNextActions([...nextActions, {
      action: '',
      deadline: '',
      priority: 'Medium'
    }]);
  };

  const updateNextAction = (index: number, field: string, value: string) => {
    const updated = nextActions.map((action, i) => 
      i === index ? { ...action, [field]: value } : action
    );
    setNextActions(updated);
  };

  const removeNextAction = (index: number) => {
    setNextActions(nextActions.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!formData.caseId) return 'Please select a case';
    if (!formData.title.trim()) return 'Title is required';
    if (formData.title.length < 5) return 'Title must be at least 5 characters';
    if (!formData.notes.trim()) return 'Investigation notes are required';
    if (formData.notes.length < 10) return 'Notes must be at least 10 characters';
    if (!formData.investigationType) return 'Investigation type is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      
      // Debug: Log form data
      console.log('Form data being sent:', formData);
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.toString());
      });

      // Add complex data as JSON strings
      formDataToSend.append('mapMarkers', JSON.stringify(mapMarkers));
      formDataToSend.append('witnesses', JSON.stringify(witnesses));
      formDataToSend.append('suspects', JSON.stringify(suspects));
      formDataToSend.append('nextActions', JSON.stringify(nextActions));

      // Add files
      files.forEach((file) => {
        formDataToSend.append('attachments', file);
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/investigations`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add investigation');
      }

      setSuccess('Investigation log added successfully!');
      
      // Reset form
      setFormData({
        caseId: '',
        title: '',
        notes: '',
        investigationType: '',
        hoursSpent: 0,
        statusUpdate: ''
      });
      setMapMarkers([]);
      setWitnesses([]);
      setSuspects([]);
      setNextActions([]);
      setFiles([]);

      // Redirect after short delay
      setTimeout(() => {
        onInvestigationAdded();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add investigation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Investigation Log</h2>
          <p className="text-gray-600">
            Record investigation progress, evidence, and updates for assigned cases.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Basic Information
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label htmlFor="caseId" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Case *
                </label>
                <select
                  id="caseId"
                  name="caseId"
                  required
                  value={formData.caseId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Select a case</option>
                  {assignedCases.map((complaint) => (
                    <option key={complaint._id} value={complaint.caseId}>
                      {complaint.caseId} - {complaint.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="investigationType" className="block text-sm font-medium text-gray-700 mb-2">
                  Investigation Type *
                </label>
                <select
                  id="investigationType"
                  name="investigationType"
                  required
                  value={formData.investigationType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Select investigation type</option>
                  {investigationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Investigation Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Brief title describing this investigation activity"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Investigation Notes *
              </label>
              <textarea
                id="notes"
                name="notes"
                required
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Detailed notes about the investigation activities, findings, and observations..."
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label htmlFor="hoursSpent" className="block text-sm font-medium text-gray-700 mb-2">
                  Hours Spent
                </label>
                <input
                  id="hoursSpent"
                  name="hoursSpent"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.hoursSpent}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="statusUpdate" className="block text-sm font-medium text-gray-700 mb-2">
                  Update Case Status (Optional)
                </label>
                <select
                  id="statusUpdate"
                  name="statusUpdate"
                  value={formData.statusUpdate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Keep current status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Map Markers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Location Markers</h3>
              <button
                type="button"
                onClick={addMapMarker}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <MapPin className="h-4 w-4" />
                <span>Add Marker</span>
              </button>
            </div>

            {mapMarkers.map((marker, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Marker {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeMapMarker(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={marker.latitude}
                    onChange={(e) => updateMapMarker(index, 'latitude', parseFloat(e.target.value) || 0)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={marker.longitude}
                    onChange={(e) => updateMapMarker(index, 'longitude', parseFloat(e.target.value) || 0)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Label"
                    value={marker.label}
                    onChange={(e) => updateMapMarker(index, 'label', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={marker.markerType}
                    onChange={(e) => updateMapMarker(index, 'markerType', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="crime-scene">Crime Scene</option>
                    <option value="evidence">Evidence</option>
                    <option value="witness">Witness</option>
                    <option value="suspect">Suspect</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Description"
                  value={marker.description}
                  onChange={(e) => updateMapMarker(index, 'description', e.target.value)}
                  className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Witnesses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Witnesses</h3>
              <button
                type="button"
                onClick={addWitness}
                className="flex items-center space-x-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Witness</span>
              </button>
            </div>

            {witnesses.map((witness, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Witness {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeWitness(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={witness.name}
                    onChange={(e) => updateWitness(index, 'name', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Contact"
                    value={witness.contact}
                    onChange={(e) => updateWitness(index, 'contact', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <textarea
                  placeholder="Statement"
                  value={witness.statement}
                  onChange={(e) => updateWitness(index, 'statement', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <label className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    checked={witness.interviewed}
                    onChange={(e) => updateWitness(index, 'interviewed', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Interviewed</span>
                </label>
              </div>
            ))}
          </div>

          {/* Suspects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Suspects</h3>
              <button
                type="button"
                onClick={addSuspect}
                className="flex items-center space-x-2 px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Suspect</span>
              </button>
            </div>

            {suspects.map((suspect, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Suspect {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeSuspect(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={suspect.name}
                    onChange={(e) => updateSuspect(index, 'name', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={suspect.status}
                    onChange={(e) => updateSuspect(index, 'status', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Identified">Identified</option>
                    <option value="Located">Located</option>
                    <option value="Questioned">Questioned</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Charged">Charged</option>
                  </select>
                </div>
                <textarea
                  placeholder="Description"
                  value={suspect.description}
                  onChange={(e) => updateSuspect(index, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Next Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Next Actions</h3>
              <button
                type="button"
                onClick={addNextAction}
                className="flex items-center space-x-2 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Action</span>
              </button>
            </div>

            {nextActions.map((action, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Action {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeNextAction(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Action description"
                    value={action.action}
                    onChange={(e) => updateNextAction(index, 'action', e.target.value)}
                    className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={action.priority}
                    onChange={(e) => updateNextAction(index, 'priority', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <input
                  type="date"
                  value={action.deadline}
                  onChange={(e) => updateNextAction(index, 'deadline', e.target.value)}
                  className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Optional)
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Upload evidence files, photos, documents (Max 3 files, 10MB each)
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="files" className="cursor-pointer">
                  <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="h-4 w-4 mr-2" />
                    Choose Files
                  </span>
                  <input
                    id="files"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="sr-only"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  />
                </label>
              </div>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding Investigation...
                </div>
              ) : (
                'Add Investigation Log'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInvestigation;