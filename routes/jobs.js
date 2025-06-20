import express from 'express';
import Job from '../models/Job.js';
import { protect } from '../middleware/auth.js';
import { jobValidation, validateRequest } from '../middleware/validation.js';

const router = express.Router();

// @desc    Get all jobs for logged in user
// @route   GET /api/jobs
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = req.query;

    const query = { user: req.user._id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = { [sortBy]: sortOrder };

    const jobs = await Job.find(query)
      .sort(sortOptions)
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

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('user', 'name email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching job'
    });
  }
});

// @desc    Create new job
// @route   POST /api/jobs
// @access  Private
router.post('/', protect, jobValidation, validateRequest, async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      user: req.user._id
    };

    const job = await Job.create(jobData);
    await job.populate('user', 'name email');

    // Emit real-time notification
    req.io.emit('job-created', {
      message: `New job application added: ${job.position} at ${job.company}`,
      job,
      user: req.user.name
    });

    res.status(201).json({
      success: true,
      message: 'Job application created successfully',
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while creating job'
    });
  }
});

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private
router.put('/:id', protect, jobValidation, validateRequest, async (req, res) => {
  try {
    let job = await Job.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const oldStatus = job.status;
    job = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    // Emit real-time notification if status changed
    if (oldStatus !== job.status) {
      req.io.emit('job-status-updated', {
        message: `Job status updated: ${job.position} at ${job.company} - ${job.status}`,
        job,
        user: req.user.name,
        oldStatus,
        newStatus: job.status
      });
    }

    res.json({
      success: true,
      message: 'Job application updated successfully',
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating job'
    });
  }
});

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    await Job.findByIdAndDelete(req.params.id);

    // Emit real-time notification
    req.io.emit('job-deleted', {
      message: `Job application deleted: ${job.position} at ${job.company}`,
      job,
      user: req.user.name
    });

    res.json({
      success: true,
      message: 'Job application deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while deleting job'
    });
  }
});

// @desc    Get job statistics
// @route   GET /api/jobs/stats/overview
// @access  Private
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Job.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalJobs = await Job.countDocuments({ user: userId });

    const statusStats = {
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      accepted: 0
    };

    stats.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    // Recent activity
    const recentJobs = await Job.find({ user: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    res.json({
      success: true,
      data: {
        totalJobs,
        statusStats,
        recentJobs
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
});

export default router;