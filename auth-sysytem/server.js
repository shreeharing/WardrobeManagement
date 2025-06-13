const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");

dotenv.config();
require("./config/passport");

const app = express();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB Atlas"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(express.urlencoded({ extended: false }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session()); 

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send(`<h1>Welcome ${req.user ? req.user.name : "Guest"}</h1>
    <a href="/auth/login">Login</a> |
    <a href="/auth/register">Register</a> |
    <a href="/auth/google">Login with Google</a> |
    <a href="/auth/logout">Logout</a>
  `);
});

app.listen(process.env.PORT, () => 
    console.log("Server running on port", process.env.PORT)
);
