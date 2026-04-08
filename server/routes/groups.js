const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const { isValidObjectId } = require('../utils/validators');

// @route   POST /api/groups
// @desc    Create a new group
// @access  Private
router.post('/', auth, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Group name must be 2-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('members').isArray().withMessage('Members must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, members } = req.body;

    // Always include the creator as a member
    const memberIds = [...new Set([req.user._id.toString(), ...members])];

    const group = await Group.create({
      name,
      description,
      members: memberIds,
      createdBy: req.user._id
    });

    const populated = await Group.findById(group._id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    // Notify all members about the new group
    memberIds.forEach(memberId => {
      req.io.to(`user:${memberId}`).emit('group:created', {
        group: populated,
        message: `${req.user.name} created a new group "${name}"`
      });
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/groups
// @desc    Get all groups for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Get expense count and total for each group
    const groupsWithStats = await Promise.all(groups.map(async (group) => {
      const expenses = await Expense.find({ group: group._id });
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      return {
        ...group.toObject(),
        expenseCount: expenses.length,
        totalExpenses
      };
    }));

    res.json(groupsWithStats);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/groups/:id
// @desc    Get a single group by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid group ID' });
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is a member
    if (!group.members.some(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view this group' });
    }

    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/groups/:id
// @desc    Update a group
// @access  Private
router.put('/:id', auth, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('members').optional().isArray()
], async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid group ID' });
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group creator can update the group' });
    }

    const { name, description, members } = req.body;

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (members) {
      // Always keep creator in members
      const memberIds = [...new Set([req.user._id.toString(), ...members])];
      group.members = memberIds;
    }

    await group.save();

    const populated = await Group.findById(group._id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    // Notify group members about the update
    req.io.to(`group:${group._id}`).emit('group:updated', {
      group: populated,
      message: `${req.user.name} updated group "${populated.name}"`
    });

    res.json(populated);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/groups/:id
// @desc    Delete a group and its expenses
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid group ID' });
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the group creator can delete the group' });
    }

    // Notify group members about deletion
    group.members.forEach(memberId => {
      req.io.to(`user:${memberId}`).emit('group:deleted', {
        groupId: group._id,
        message: `${req.user.name} deleted group "${group.name}"`
      });
    });

    // Delete all group expenses
    await Expense.deleteMany({ group: group._id });
    await Group.findByIdAndDelete(group._id);

    res.json({ message: 'Group and all associated expenses deleted' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
