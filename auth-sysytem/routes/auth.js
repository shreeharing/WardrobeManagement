const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const router = express.Router();

const path = require("path");

router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/login.html"));
});

router.get("/register", (req, res) => 
  res.sendFile(path.join(__dirname, "../views/register.html"))
);

router.get("/dashboard", (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`<h1>Welcome, ${req.user.name}!</h1>`);
  } else {
    res.send(`<h1>Welcome, ${req.user.name}!</h1>`);
  }
});

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ email, password: hashed });
  res.redirect("/auth/login");
});



router.post("/login", passport.authenticate("local", {
  successRedirect: "/auth/dashboard",
  failureRedirect: "/auth/login"
}));

router.get("/logout", (req, res) => {
  req.logout(() => res.redirect("/"));
});

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport.authenticate("google", {
  failureRedirect: "/auth/login",
  successRedirect: "/auth/dashboard"
}));


module.exports = router;
