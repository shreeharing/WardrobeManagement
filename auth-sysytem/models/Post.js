const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  items: [{ type: Schema.Types.ObjectId, ref: 'Inventory' }],
  caption: String,
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
