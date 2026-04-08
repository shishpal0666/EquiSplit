/**
 * Settlement Engine
 * Calculates net balances and optimized settlement plan (minimum transactions)
 */

/**
 * Calculate net balances for all members in a group
 * @param {Array} expenses - Array of expense documents with populated paidBy and splits
 * @param {Array} members - Array of member objects with _id
 * @returns {Object} Map of userId -> net balance (positive = owed money, negative = owes money)
 */
const calculateNetBalances = (expenses, members) => {
  const balances = {};

  // Initialize all members with 0 balance
  members.forEach(member => {
    const id = member._id ? member._id.toString() : member.toString();
    balances[id] = 0;
  });

  // Process each expense
  expenses.forEach(expense => {
    const payerId = expense.paidBy._id 
      ? expense.paidBy._id.toString() 
      : expense.paidBy.toString();

    // The payer is owed money by everyone in the split
    expense.splits.forEach(split => {
      const userId = split.user._id 
        ? split.user._id.toString() 
        : split.user.toString();

      if (userId === payerId) {
        // The payer's own share — they don't owe themselves
        return;
      }

      // The payer is owed this amount
      balances[payerId] = Math.round((balances[payerId] + split.amount) * 100) / 100;
      // This user owes this amount
      balances[userId] = Math.round((balances[userId] - split.amount) * 100) / 100;
    });
  });

  return balances;
};

/**
 * Calculate optimized settlement plan using greedy algorithm
 * Minimizes the number of transactions needed to settle all debts
 * @param {Object} balances - Map of userId -> net balance
 * @returns {Array<{from: string, to: string, amount: number}>} Settlement transactions
 */
const calculateSettlements = (balances) => {
  const settlements = [];

  // Separate into debtors and creditors
  const debtors = []; // People who owe money (negative balance)
  const creditors = []; // People who are owed money (positive balance)

  Object.entries(balances).forEach(([userId, balance]) => {
    if (balance < -0.01) {
      debtors.push({ userId, amount: Math.abs(balance) });
    } else if (balance > 0.01) {
      creditors.push({ userId, amount: balance });
    }
  });

  // Sort by amount descending for greedy matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const settleAmount = Math.min(debtors[i].amount, creditors[j].amount);
    const roundedAmount = Math.round(settleAmount * 100) / 100;

    if (roundedAmount > 0.01) {
      settlements.push({
        from: debtors[i].userId,
        to: creditors[j].userId,
        amount: roundedAmount
      });
    }

    debtors[i].amount = Math.round((debtors[i].amount - settleAmount) * 100) / 100;
    creditors[j].amount = Math.round((creditors[j].amount - settleAmount) * 100) / 100;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
};

module.exports = { calculateNetBalances, calculateSettlements };
