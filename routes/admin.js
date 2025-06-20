import express from 'express';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Feedback from '../models/Feedback.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply admin protection to all routes
router.use(protect);
router.use(authorize('admin'));

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'applicant' });
    const totalJobs = await Job.countDocuments();
    const totalFeedbacks = await Feedback.countDocuments();

    // Average rating
    const avgRatingResult = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    const averageRating = avgRatingResult[0]?.avgRating || 0;

    // Job status distribution
    const jobStatusStats = await Job.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Feedback rating distribution
    const feedbackRatingStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Recent activity
    const recentUsers = await User.find({ role: 'applicant' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password');

    const recentJobs = await Job.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    const recentFeedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(5);

    // Growth analytics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const growthStats = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, role: 'applicant' }),
      Job.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Feedback.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalJobs,
          totalFeedbacks,
          averageRating: Math.round(averageRating * 10) / 10
        },
        jobStatusStats,
        feedbackRatingStats,
        recentActivity: {
          users: recentUsers,
          jobs: recentJobs,
          feedbacks: recentFeedbacks
        },
        growth: {
          newUsers: growthStats[0],
          newJobs: growthStats[1],
          newFeedbacks: growthStats[2]
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching admin statistics'
    });
  }
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    const total = await User.countDocuments(query);

    // Get job counts for each user
    const usersWithJobCounts = await Promise.all(
      users.map(async (user) => {
        const jobCount = await Job.countDocuments({ user: user._id });
        return {
          ...user.toObject(),
          jobCount
        };
      })
    );

    res.json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      data: usersWithJobCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @desc    Get all jobs (admin view)
// @route   GET /api/admin/jobs
// @access  Private/Admin
router.get('/jobs', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { company: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name email');

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      count: jobs.length,
      total,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching jobs'
    });
  }
});

// @desc    Get all feedback (admin view)
// @route   GET /api/admin/feedback
// @access  Private/Admin
router.get('/feedback', async (req, res) => {
  try {
    const { page = 1, limit = 10, rating, status } = req.query;

    const query = {};
    if (rating) {
      query.rating = parseInt(rating);
    }
    if (status) {
      query.status = status;
    }

    const feedbacks = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

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

// @desc    Update feedback status
// @route   PUT /api/admin/feedback/:id/status
// @access  Private/Admin
router.put('/feedback/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      message: 'Feedback status updated successfully',
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating feedback status'
    });
  }
});

// @desc    Delete feedback
// @route   DELETE /api/admin/feedback/:id
// @access  Private/Admin
router.delete('/feedback/:id', async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    await Feedback.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while deleting feedback'
    });
  }
});

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:id/toggle-status
// @access  Private/Admin
router.put('/users/:id/toggle-status', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating user status'
    });
  }
});

export default router;