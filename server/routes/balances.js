const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const { calculateNetBalances, calculateSettlements } = require('../utils/settlementEngine');
const { isValidObjectId } = require('../utils/validators');

// @route   GET /api/balances/:groupId
// @desc    Get net balances for all members in a group
// @access  Private
router.get('/:groupId', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.groupId)) return res.status(400).json({ message: 'Invalid group ID' });
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'name email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.some(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const expenses = await Expense.find({ group: req.params.groupId })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email');

    const balanceMap = calculateNetBalances(expenses, group.members);

    // Attach member info to balances
    const balances = group.members.map(member => ({
      user: member,
      balance: balanceMap[member._id.toString()] || 0
    }));

    res.json({
      group: { _id: group._id, name: group.name },
      balances,
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
      expenseCount: expenses.length
    });
  } catch (error) {
    console.error('Get balances error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/balances/:groupId/settlements
// @desc    Get optimized settlement plan for a group
// @access  Private
router.get('/:groupId/settlements', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.groupId)) return res.status(400).json({ message: 'Invalid group ID' });
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'name email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.some(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const expenses = await Expense.find({ group: req.params.groupId })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email');

    const balanceMap = calculateNetBalances(expenses, group.members);
    const settlements = calculateSettlements(balanceMap);

    // Create a member lookup map
    const memberMap = {};
    group.members.forEach(m => {
      memberMap[m._id.toString()] = m;
    });

    // Attach member info to settlements
    const settlementsWithInfo = settlements.map(s => ({
      from: memberMap[s.from] || { _id: s.from, name: 'Unknown' },
      to: memberMap[s.to] || { _id: s.to, name: 'Unknown' },
      amount: s.amount
    }));

    res.json({
      group: { _id: group._id, name: group.name },
      settlements: settlementsWithInfo
    });
  } catch (error) {
    console.error('Get settlements error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
