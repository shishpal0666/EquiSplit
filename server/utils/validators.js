const mongoose = require('mongoose');

/**
 * Validate if a string is a valid MongoDB ObjectId  
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

module.exports = { isValidObjectId };
