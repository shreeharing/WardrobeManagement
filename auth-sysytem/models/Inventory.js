// models/Inventory.js
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  itemName: String,
  quantity: Number,
  category: String
});

module.exports = mongoose.model('Inventory', inventorySchema);
