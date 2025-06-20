import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  feedback: {
    type: String,
    required: [true, 'Feedback is required'],
    trim: true,
    maxlength: [1000, 'Feedback cannot exceed 1000 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  category: {
    type: String,
    enum: ['general', 'feature', 'bug', 'improvement'],
    default: 'general'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for better query performance
feedbackSchema.index({ rating: -1 });
feedbackSchema.index({ createdAt: -1 });

export default mongoose.model('Feedback', feedbackSchema);