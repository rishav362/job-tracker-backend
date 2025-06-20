import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  status: {
    type: String,
    enum: ['applied', 'interview', 'offer', 'rejected', 'accepted'],
    default: 'applied'
  },
  appliedDate: {
    type: Date,
    required: [true, 'Applied date is required'],
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  salary: {
    type: Number,
    min: [0, 'Salary cannot be negative']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  jobUrl: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
jobSchema.index({ user: 1, createdAt: -1 });
jobSchema.index({ status: 1 });

export default mongoose.model('Job', jobSchema);