import { body, validationResult } from 'express-validator';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

export const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['applicant', 'admin'])
    .withMessage('Role must be either applicant or admin')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const jobValidation = [
  body('company')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Company name is required and must not exceed 100 characters'),
  body('position')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Position is required and must not exceed 100 characters'),
  body('status')
    .optional()
    .isIn(['applied', 'interview', 'offer', 'rejected', 'accepted'])
    .withMessage('Invalid status'),
  body('appliedDate')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  body('salary')
    .optional()
    .isNumeric()
    .withMessage('Salary must be a number')
];

export const feedbackValidation = [
  body('feedback')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Feedback is required and must not exceed 1000 characters'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];