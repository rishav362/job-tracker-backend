import express from 'express';
import Feedback from '../models/Feedback.js';
import { feedbackValidation, validateRequest } from '../middleware/validation.js';

const router = express.Router();

// @desc    Submit feedback
// @route   POST /api/feedback
// @access  Public
router.post('/', feedbackValidation, validateRequest, async (req, res) => {
  try {
    const feedback = await Feedback.create(req.body);

    // Emit real-time notification to admin
    req.io.to('admin-room').emit('new-feedback', {
      message: 'New feedback received',
      feedback,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while submitting feedback'
    });
  }
});

// @desc    Get public feedback
// @route   GET /api/feedback/public
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const { page = 1, limit = 10, rating } = req.query;

    const query = { isPublic: true };
    if (rating) {
      query.rating = parseInt(rating);
    }

    const feedbacks = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-email'); // Don't expose emails in public API

    const total = await Feedback.countDocuments(query);

    res.json({
      success: true,
      count: feedbacks.length,
      total,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      data: feedbacks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching feedback'
    });
  }
});

// @desc    Get feedback statistics
// @route   GET /api/feedback/stats
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const totalFeedbacks = await Feedback.countDocuments();
    const averageRating = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    const ratingDistribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };

    stats.forEach(stat => {
      ratingDistribution[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        totalFeedbacks,
        averageRating: averageRating[0]?.avgRating || 0,
        ratingDistribution
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching feedback statistics'
    });
  }
});

export default router;