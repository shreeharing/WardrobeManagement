const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  category: String,
  quantity: Number,
  imageUrl: String,
  dateAdded: { type: Date, default: Date.now },
  usageCount: { type: Number, default: 1 }
});

module.exports = mongoose.model('Inventory', inventorySchema);
