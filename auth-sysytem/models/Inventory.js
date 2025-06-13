const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  category: String,
  quantity: Number,
  dateAdded: { type: Date, default: Date.now },
  usageCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Inventory', inventorySchema);
