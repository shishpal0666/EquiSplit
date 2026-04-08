/**
 * Split Calculator Utility
 * Handles equal and custom expense splitting logic
 */

/**
 * Calculate equal splits among participants
 * @param {number} amount - Total expense amount
 * @param {string[]} participantIds - Array of user IDs to split among
 * @returns {Array<{user: string, amount: number}>} Split amounts
 */
const calculateEqualSplit = (amount, participantIds) => {
  const perPerson = Math.round((amount / participantIds.length) * 100) / 100;

  // Handle rounding — give the remainder to the first person
  const splits = participantIds.map((userId, index) => ({
    user: userId,
    amount: perPerson,
  }));

  // Fix rounding errors
  const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
  const diff = Math.round((amount - totalSplit) * 100) / 100;
  if (diff !== 0) {
    splits[0].amount = Math.round((splits[0].amount + diff) * 100) / 100;
  }

  return splits;
};

/**
 * Validate custom splits
 * @param {number} amount - Total expense amount
 * @param {Array<{user: string, amount: number}>} splits - Custom split amounts
 * @returns {{valid: boolean, message?: string}} Validation result
 */
const validateCustomSplit = (amount, splits) => {
  if (!splits || splits.length === 0) {
    return { valid: false, message: "At least one split is required" };
  }

  const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
  const roundedTotal = Math.round(totalSplit * 100) / 100;
  const roundedAmount = Math.round(amount * 100) / 100;

  if (Math.abs(roundedTotal - roundedAmount) > 0.01) {
    return {
      valid: false,
      message: `Split amounts (${roundedTotal}) must equal the total expense (${roundedAmount})`,
    };
  }

  // Check for negative amounts
  if (splits.some((s) => s.amount < 0)) {
    return { valid: false, message: "Split amounts cannot be negative" };
  }

  return { valid: true };
};

module.exports = { calculateEqualSplit, validateCustomSplit };
