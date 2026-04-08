const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const { calculateEqualSplit, validateCustomSplit } = require('../utils/splitCalculator');
const { isValidObjectId } = require('../utils/validators');

// @route   POST /api/expenses
// @desc    Create a new expense
// @access  Private
router.post('/', auth, [
  body('description').trim().isLength({ min: 1, max: 200 }).withMessage('Description is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('group').isMongoId().withMessage('Valid group ID is required'),
  body('paidBy').isMongoId().withMessage('Valid payer ID is required'),
  body('splitType').isIn(['equal', 'custom']).withMessage('Split type must be equal or custom'),
  body('category').optional().isIn(['Food', 'Travel', 'Rent', 'Entertainment', 'Utilities', 'Shopping', 'Healthcare', 'Other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { description, amount, group: groupId, paidBy, splitType, splits: customSplits, category, date, splitAmong } = req.body;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.some(m => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    let splits;

    if (splitType === 'equal') {
      // Split equally among specified members or all group members
      const participants = splitAmong && splitAmong.length > 0 
        ? splitAmong 
        : group.members.map(m => m.toString());
      splits = calculateEqualSplit(amount, participants);
    } else {
      // Validate custom splits
      const validation = validateCustomSplit(amount, customSplits);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }
      splits = customSplits;
    }

    const expense = await Expense.create({
      description,
      amount,
      paidBy,
      group: groupId,
      splits,
      category: category || 'Other',
      splitType,
      date: date || Date.now()
    });

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .populate('group', 'name');

    // Real-time notification to group members
    req.io.to(`group:${groupId}`).emit('expense:created', {
      expense: populated,
      message: `${req.user.name} added "${description}" — ₹${amount}`
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenses/group/:groupId
// @desc    Get all expenses for a group
// @access  Private
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.groupId)) return res.status(400).json({ message: 'Invalid group ID' });
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.some(m => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const expenses = await Expense.find({ group: req.params.groupId })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get a single expense
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid expense ID' });
    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .populate('group', 'name');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update an expense
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid expense ID' });
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const { description, amount, paidBy, splitType, splits: customSplits, category, date, splitAmong } = req.body;

    if (description) expense.description = description;
    if (amount) expense.amount = amount;
    if (paidBy) expense.paidBy = paidBy;
    if (category) expense.category = category;
    if (date) expense.date = date;

    if (splitType && amount) {
      expense.splitType = splitType;
      if (splitType === 'equal') {
        const group = await Group.findById(expense.group);
        const participants = splitAmong && splitAmong.length > 0 
          ? splitAmong 
          : group.members.map(m => m.toString());
        expense.splits = calculateEqualSplit(amount || expense.amount, participants);
      } else if (customSplits) {
        const validation = validateCustomSplit(amount || expense.amount, customSplits);
        if (!validation.valid) {
          return res.status(400).json({ message: validation.message });
        }
        expense.splits = customSplits;
      }
    }

    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .populate('group', 'name');

    // Real-time notification to group members
    req.io.to(`group:${expense.group}`).emit('expense:updated', {
      expense: populated,
      message: `${req.user.name} updated an expense`
    });

    res.json(populated);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid expense ID' });
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const groupId = expense.group;
    await Expense.findByIdAndDelete(req.params.id);

    // Real-time notification to group members
    req.io.to(`group:${groupId}`).emit('expense:deleted', {
      expenseId: req.params.id,
      message: `${req.user.name} deleted an expense`
    });

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
