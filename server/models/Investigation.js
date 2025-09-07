import mongoose from 'mongoose';

const mapMarkerSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  description: String,
  markerType: {
    type: String,
    enum: ['crime-scene', 'evidence', 'witness', 'suspect', 'other'],
    default: 'other'
  }
});

const investigationSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    ref: 'Complaint'
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  notes: {
    type: String,
    required: true,
    maxlength: 2000
  },
  investigationType: {
    type: String,
    enum: [
      'Initial Assessment',
      'Evidence Collection',
      'Witness Interview',
      'Scene Investigation',
      'Suspect Investigation',
      'Follow-up',
      'Final Report'
    ],
    required: true
  },
  mapMarkers: [mapMarkerSchema],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    data: Buffer, // Store file data as binary
    description: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  statusUpdate: {
    type: String,
    enum: [
      'Filed',
      'Assigned',
      'Under Investigation',
      'Evidence Collected',
      'Suspect Identified',
      'Report Submitted',
      'Completed',
      'Closed'
    ],
    required: false
  },
  hoursSpent: {
    type: Number,
    min: 0,
    default: 0
  },
  nextActions: [{
    action: String,
    deadline: Date,
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium'
    }
  }],
  witnesses: [{
    name: String,
    contact: String,
    statement: String,
    interviewed: {
      type: Boolean,
      default: false
    }
  }],
  suspects: [{
    name: String,
    description: String,
    status: {
      type: String,
      enum: ['Identified', 'Located', 'Questioned', 'Cleared', 'Charged'],
      default: 'Identified'
    }
  }]
}, {
  timestamps: true
});

// Indexes
investigationSchema.index({ caseId: 1 });
investigationSchema.index({ staffId: 1 });
investigationSchema.index({ investigationType: 1 });
investigationSchema.index({ createdAt: -1 });

export default mongoose.model('Investigation', investigationSchema);