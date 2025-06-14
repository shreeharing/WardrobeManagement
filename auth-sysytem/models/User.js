const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  username: { type: String, unique: true, sparse: true },
  name: String,
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model("User", userSchema);
//ok