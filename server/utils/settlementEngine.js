/**
 * Settlement Engine
 * Calculates net balances and optimized settlement plan (minimum transactions)
 */

/**
 * Calculate net balances for all members in a group
 * @param {Array} expenses - Array of expense documents with populated paidBy and splits
 * @param {Array} members - Array of member objects with _id
 * @returns {Object} Map of user ID -> total balance (positive = gets money back, negative = owes money)
 */
const computeUserNetTotals = (expenses, members) => {
  const totals = {};

  members.forEach(m => {
    const stringId = m._id ? m._id.toString() : m.toString();
    totals[stringId] = 0;
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

      if (userId !== payerId) {
        totals[payerId] = parseFloat((totals[payerId] + split.amount).toFixed(2));
        totals[userId] = parseFloat((totals[userId] - split.amount).toFixed(2));
      }
    });
  });

  return totals;
};

/**
 * Calculate optimized settlement plan using greedy algorithm
 * Minimizes the number of transactions needed to settle all debts
 * @param {Object} inputTotals - Map of userId -> net balance
 * @returns {Array<{from: string, to: string, amount: number}>} Minimized transfers
 */
const optimizeDebtTransfers = (inputTotals) => {
  const transfers = [];

  // Group by who owes and who gets paid
  const payers = [];
  const receivers = [];

  Object.entries(inputTotals).forEach(([uid, val]) => {
    if (val < -0.01) {
      payers.push({ uid, amt: Math.abs(val) });
    } else if (val > 0.01) {
      receivers.push({ uid, amt: val });
    }
  });

  payers.sort((a, b) => b.amt - a.amt);
  receivers.sort((a, b) => b.amt - a.amt);

  let pIndex = 0, rIndex = 0;

  while (pIndex < payers.length && rIndex < receivers.length) {
    const chunk = Math.min(payers[pIndex].amt, receivers[rIndex].amt);
    const finalChunk = parseFloat(chunk.toFixed(2));

    if (finalChunk > 0.01) {
      transfers.push({
        from: payers[pIndex].uid,
        to: receivers[rIndex].uid,
        amount: finalChunk
      });
    }

    payers[pIndex].amt = parseFloat((payers[pIndex].amt - chunk).toFixed(2));
    receivers[rIndex].amt = parseFloat((receivers[rIndex].amt - chunk).toFixed(2));

    if (payers[pIndex].amt < 0.01) pIndex++;
    if (receivers[rIndex].amt < 0.01) rIndex++;
  }

  return transfers;
};

module.exports = { computeUserNetTotals, optimizeDebtTransfers };
