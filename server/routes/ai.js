const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// @route   POST /api/ai/categorize
// @desc    AI-powered expense categorization
// @access  Private
router.post('/categorize', auth, async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const genAI = getGenAI();
    
    if (!genAI) {
      // Fallback: keyword-based categorization
      const category = keywordCategorize(description);
      return res.json({ category, method: 'keyword' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Categorize the following expense description into exactly ONE of these categories: Food, Travel, Rent, Entertainment, Utilities, Shopping, Healthcare, Other.

Expense description: "${description}"

Respond with ONLY the category name, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    const validCategories = ['Food', 'Travel', 'Rent', 'Entertainment', 'Utilities', 'Shopping', 'Healthcare', 'Other'];
    const category = validCategories.find(c => c.toLowerCase() === response.toLowerCase()) || 'Other';

    res.json({ category, method: 'ai' });
  } catch (error) {
    console.log('AI categorize fallback — ', error.status || error.message || 'unknown error');
    // Fallback to keyword
    const category = keywordCategorize(req.body.description || '');
    res.json({ category, method: 'keyword-fallback' });
  }
});

// @route   POST /api/ai/insights/:groupId
// @desc    AI-powered spending insights for a group
// @access  Private
router.post('/insights/:groupId', auth, async (req, res) => {
  try {
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
      .sort({ date: -1 });

    if (expenses.length === 0) {
      return res.json({ 
        insights: ['No expenses found in this group yet. Add some expenses to get AI-powered insights!'],
        stats: {}
      });
    }

    // Calculate statistics
    const stats = calculateStats(expenses, group.members);

    const genAI = getGenAI();

    if (!genAI) {
      // Generate basic insights without AI
      const insights = generateBasicInsights(stats, group.name);
      return res.json({ insights, stats, method: 'basic' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const expenseSummary = JSON.stringify({
      groupName: group.name,
      totalExpenses: stats.totalAmount,
      expenseCount: expenses.length,
      categoryBreakdown: stats.categoryBreakdown,
      memberSpending: stats.memberSpending,
      recentExpenses: expenses.slice(0, 10).map(e => ({
        description: e.description,
        amount: e.amount,
        category: e.category,
        date: e.date
      }))
    });

    const prompt = `You are a financial insights assistant. Analyze this group expense data and provide 4-5 concise, actionable spending insights. Be specific with numbers and percentages.

Data: ${expenseSummary}

Format each insight as a short paragraph. Focus on:
1. Spending patterns and trends
2. Category-wise analysis (e.g., "You spent 30% more on food this week")
3. Member contributions and balance
4. Suggestions for optimizing shared expenses

Respond with a JSON array of insight strings. Example: ["insight1", "insight2"]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    let insights;
    try {
      // Try to parse JSON response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      insights = jsonMatch ? JSON.parse(jsonMatch[0]) : [responseText];
    } catch {
      insights = [responseText];
    }

    res.json({ insights, stats, method: 'ai' });
  } catch (error) {
    console.log('AI insights fallback — ', error.status || error.message || 'unknown error');
    // Fallback: try to return basic insights instead of crashing
    try {
      const group = await Group.findById(req.params.groupId).populate('members', 'name email');
      const expenses = await Expense.find({ group: req.params.groupId }).populate('paidBy', 'name email').sort({ date: -1 });
      if (expenses.length > 0) {
        const stats = calculateStats(expenses, group.members);
        const insights = generateBasicInsights(stats, group.name);
        return res.json({ insights, stats, method: 'basic-fallback' });
      }
    } catch {}
    res.json({ insights: ['AI insights are temporarily unavailable. Add more expenses and try again later.'], stats: {}, method: 'fallback' });
  }
});

// Keyword-based categorization fallback
function keywordCategorize(description) {
  const lower = description.toLowerCase();
  
  const categories = {
    Food: ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'pizza', 'burger', 'coffee', 'tea', 'snack', 'grocery', 'groceries', 'meal', 'eat', 'drink', 'bar', 'cafe', 'bakery', 'sushi', 'chicken', 'rice', 'noodles', 'beer', 'wine'],
    Travel: ['travel', 'uber', 'lyft', 'taxi', 'cab', 'flight', 'train', 'bus', 'gas', 'petrol', 'fuel', 'parking', 'toll', 'metro', 'subway', 'ticket', 'airfare', 'hotel', 'airbnb'],
    Rent: ['rent', 'lease', 'mortgage', 'housing', 'apartment', 'deposit'],
    Entertainment: ['movie', 'netflix', 'spotify', 'game', 'concert', 'show', 'ticket', 'party', 'club', 'bowling', 'karaoke', 'cinema', 'theater', 'museum', 'amusement'],
    Utilities: ['electricity', 'water', 'internet', 'wifi', 'phone', 'bill', 'utility', 'gas bill', 'power', 'heating', 'cable'],
    Shopping: ['shopping', 'clothes', 'shoes', 'amazon', 'online', 'mall', 'store', 'buy', 'purchase', 'electronics', 'gift'],
    Healthcare: ['doctor', 'hospital', 'medicine', 'pharmacy', 'medical', 'health', 'dental', 'clinic', 'prescription']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category;
    }
  }

  return 'Other';
}

// Calculate expense statistics
function calculateStats(expenses, members) {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown
  const categoryBreakdown = {};
  expenses.forEach(e => {
    categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
  });

  // Member spending
  const memberSpending = {};
  members.forEach(m => {
    memberSpending[m.name] = 0;
  });
  expenses.forEach(e => {
    const payerName = e.paidBy?.name || 'Unknown';
    memberSpending[payerName] = (memberSpending[payerName] || 0) + e.amount;
  });

  // Average expense
  const avgExpense = totalAmount / expenses.length;

  // Highest single expense
  const highestExpense = expenses.reduce((max, e) => e.amount > max.amount ? e : max, expenses[0]);

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    avgExpense: Math.round(avgExpense * 100) / 100,
    categoryBreakdown,
    memberSpending,
    highestExpense: {
      description: highestExpense.description,
      amount: highestExpense.amount
    },
    expenseCount: expenses.length
  };
}

// Generate basic insights without AI
function generateBasicInsights(stats, groupName) {
  const insights = [];

  insights.push(`📊 Your group "${groupName}" has a total of ${stats.expenseCount} expenses totaling ₹${stats.totalAmount.toLocaleString()}.`);

  // Category insight
  const topCategory = Object.entries(stats.categoryBreakdown)
    .sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    const percentage = Math.round((topCategory[1] / stats.totalAmount) * 100);
    insights.push(`🏷️ ${topCategory[0]} is your highest spending category at ₹${topCategory[1].toLocaleString()} (${percentage}% of total).`);
  }

  // Top spender
  const topSpender = Object.entries(stats.memberSpending)
    .sort((a, b) => b[1] - a[1])[0];
  if (topSpender) {
    insights.push(`💰 ${topSpender[0]} has paid the most, contributing ₹${topSpender[1].toLocaleString()} to the group.`);
  }

  // Average
  insights.push(`📈 Average expense amount is ₹${stats.avgExpense.toLocaleString()}. Your highest single expense was "${stats.highestExpense.description}" at ₹${stats.highestExpense.amount.toLocaleString()}.`);

  return insights;
}

module.exports = router;
