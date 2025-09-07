import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  address: {
    type: String,
    required: true
  }
});

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
});

const complaintSchema = new mongoose.Schema({
  caseId: {
    type: String,
    unique: true,
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  crimeType: {
    type: String,
    required: true,
    enum: [
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
    ]
  },
  location: {
    type: locationSchema,
    required: true
  },
  evidenceFiles: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    data: Buffer, // Store file data as binary
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: [
      'Filed',
      'Assigned',
      'Under Investigation',
      'Evidence Collected',
      'Suspect Identified',
      'Report Submitted',
      'Completed',
      'Closed',
      'Rejected'
    ],
    default: 'Filed'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  assignedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignmentDate: Date,
  statusHistory: [statusHistorySchema],
  isAnonymous: {
    type: Boolean,
    default: false
  },
  tags: [String],
  relatedCases: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint'
  }]
}, {
  timestamps: true
});

// Indexes for better performance
complaintSchema.index({ caseId: 1 });
complaintSchema.index({ userId: 1 });
complaintSchema.index({ assignedStaff: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ crimeType: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Generate case ID before saving
complaintSchema.pre('save', async function(next) {
  if (!this.caseId) {
    const today = new Date();
    const dateStr = today.getFullYear() + 
                   String(today.getMonth() + 1).padStart(2, '0') + 
                   String(today.getDate()).padStart(2, '0');
    
    // Find the last case ID for today
    const lastCase = await mongoose.model('Complaint')
      .findOne({ caseId: new RegExp(`^CASE-${dateStr}-`) })
      .sort({ caseId: -1 });
    
    let nextNumber = 1;
    if (lastCase) {
      const lastNumber = parseInt(lastCase.caseId.split('-').pop());
      nextNumber = lastNumber + 1;
    }
    
    this.caseId = `CASE-${dateStr}-${String(nextNumber).padStart(4, '0')}`;
  }
  
  // Add to status history if status changed
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      date: new Date(),
      updatedBy: this.assignedStaff
    });
  }
  
  next();
});

// Initial status history for new complaints
complaintSchema.pre('save', function(next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      date: new Date()
    });
  }
  next();
});

export default mongoose.model('Complaint', complaintSchema);