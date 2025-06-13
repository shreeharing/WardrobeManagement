const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Inventory = require('../models/Inventory');
const router = express.Router();

const path = require("path");

router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/login.html"));
});

router.get("/register", (req, res) => 
  res.sendFile(path.join(__dirname, "../views/register.html"))
);

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}

// Dashboard Route
router.get('/dashboard', isLoggedIn, async (req, res) => {
  const inventory = await Inventory.find({ userId: req.user._id });
  res.render('dashboard', { user: req.user, inventory });
});

// Add Inventory Item
router.post('/add-item', isLoggedIn, async (req, res) => {
  const { itemName, quantity, category } = req.body;
  await new Inventory({
    userId: req.user._id,
    itemName,
    quantity,
    category
  }).save();
  res.redirect('/auth/dashboard');
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
