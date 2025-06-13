const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  username: { type: String, unique: true, sparse: true },
  name: String
});

module.exports = mongoose.model("User", userSchema);
