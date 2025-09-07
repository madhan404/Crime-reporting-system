import React, { useState } from 'react';
import { Plus, MapPin, Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/api';

interface FileComplaintFormProps {
  onComplaintFiled: () => void;
}

const FileComplaintForm: React.FC<FileComplaintFormProps> = ({ onComplaintFiled }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    crimeType: '',
    location: {
      latitude: 0,
      longitude: 0,
      address: ''
    },
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    isAnonymous: false
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const crimeTypes = [
    'Theft/Robbery',
    'Assault',
    'Fraud',
    'Cybercrime',
    'Domestic Violence',
    'Drug Related',
    'Property Crime',
    'Traffic Violation',
    'Missing Person',
    'Other'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('location.')) {
      const locationField = name.split('.')[1];
      setFormData({
        ...formData,
        location: {
          ...formData.location,
          [locationField]: locationField === 'address' ? value : parseFloat(value) || 0
        }
      });
    } else if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: target.checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      setError('Maximum 5 files allowed');
      return;
    }
    
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding would typically require an API key
          // For demo purposes, we'll use a placeholder address
          const address = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;
          
          setFormData({
            ...formData,
            location: {
              latitude,
              longitude,
              address
            }
          });
        } catch (err) {
          console.error('Reverse geocoding failed:', err);
          setFormData({
            ...formData,
            location: {
              latitude,
              longitude,
              address: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
            }
          });
        }
        setLoading(false);
      },
      (error) => {
        setError('Failed to get location: ' + error.message);
        setLoading(false);
      }
    );
  };

  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required';
    if (formData.title.length < 5) return 'Title must be at least 5 characters';
    if (!formData.description.trim()) return 'Description is required';
    if (formData.description.length < 20) return 'Description must be at least 20 characters';
    if (!formData.crimeType) return 'Crime type is required';
    if (!formData.location.address.trim()) return 'Location address is required';
    if (formData.location.latitude === 0 || formData.location.longitude === 0) {
      return 'Please provide valid location coordinates';
    }
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
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'location') {
          Object.entries(value).forEach(([locKey, locValue]) => {
            formDataToSend.append(`location.${locKey}`, locValue.toString());
          });
        } else {
          formDataToSend.append(key, value.toString());
        }
      });

      // Add files
      files.forEach((file) => {
        formDataToSend.append('evidenceFiles', file);
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/complaints/file`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to file complaint');
      }

      setSuccess(`Complaint filed successfully! Case ID: ${data.complaint.caseId}`);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        crimeType: '',
        location: { latitude: 0, longitude: 0, address: '' },
        priority: 'Medium',
        isAnonymous: false
      });
      setFiles([]);

      // Redirect after short delay
      setTimeout(() => {
        onComplaintFiled();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to file complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">File a New Complaint</h2>
          <p className="text-gray-600">
            Please provide detailed information about the incident to help us process your complaint effectively.
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Incident Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Brief title describing the incident"
              />
            </div>

            <div>
              <label htmlFor="crimeType" className="block text-sm font-medium text-gray-700 mb-2">
                Crime Type *
              </label>
              <select
                id="crimeType"
                name="crimeType"
                required
                value={formData.crimeType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select crime type</option>
                {crimeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Description *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Provide a detailed description of what happened, including date, time, and any relevant details..."
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Location Information</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="location.latitude" className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude *
                </label>
                <input
                  id="location.latitude"
                  name="location.latitude"
                  type="number"
                  step="any"
                  required
                  value={formData.location.latitude}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0.000000"
                />
              </div>

              <div>
                <label htmlFor="location.longitude" className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude *
                </label>
                <input
                  id="location.longitude"
                  name="location.longitude"
                  type="number"
                  step="any"
                  required
                  value={formData.location.longitude}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0.000000"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Current Location
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="location.address" className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                id="location.address"
                name="location.address"
                type="text"
                required
                value={formData.location.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Full address of the incident location"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isAnonymous"
                  checked={formData.isAnonymous}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  File anonymously (hide my identity)
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence Files (Optional)
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Upload photos, videos, documents, or other evidence related to the incident (Max 5 files, 10MB each)
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
              <p className="mt-2 text-xs text-gray-500">
                PNG, JPG, GIF, PDF, DOC, TXT, MP4, MP3 up to 10MB each
              </p>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
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
                  Filing Complaint...
                </div>
              ) : (
                'File Complaint'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FileComplaintForm;