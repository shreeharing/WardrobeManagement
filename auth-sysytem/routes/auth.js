const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Inventory = require('../models/Inventory');
const router = express.Router();

const path = require("path");

router.get("/login", (req, res) => {
  res.render('login');
});

router.get("/register", (req, res) => 
  res.render('register')
);

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}

// Dashboard Route
router.get('/dashboard', isLoggedIn, async (req, res) => {
  let sortOption = {};
  switch (req.query.sortBy) {
    case 'category':
      sortOption = { category: 1 };
      break;
    case 'quantity':
      sortOption = { quantity: -1 };
      break;
    case 'date':
      sortOption = { dateAdded: -1 };
      break;
    case 'usageCount':
      sortOption = { usageCount: -1 };
      break;
  }
  const inventory = await Inventory.find({ userId: req.user._id }).sort(sortOption);
  res.render('dashboard', { user: req.user, inventory });
});

// Add Inventory Item
router.post('/add-item', isLoggedIn, async (req, res) => {
  try {
    const { name, category, quantity, timesWorn } = req.body;

    await Inventory.create({
      userId: req.user._id,
      name,
      category,
      quantity: Number(quantity),
      usageCount: Number(timesWorn),
      dateAdded: new Date()
    });

    res.redirect('/auth/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to add item");
  }
});
router.post("/delete-item", async (req, res) => {
  const rawItemIds = req.body.itemIds;

  console.log("Raw itemIds from form:", rawItemIds);

  if (!rawItemIds) {
    return res.status(400).send("No items selected for deletion.");
  }

  let itemIds = [];
  try {
    itemIds = JSON.parse(rawItemIds);
  } catch (err) {
    console.error("JSON Parse error:", err.message);
    return res.status(400).send("Invalid itemIds JSON.");
  }

  // ✅ Use the correct model name
  await Inventory.deleteMany({ _id: { $in: itemIds } });

  res.redirect("/auth/dashboard");
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
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  (req, res) => {
    if (!req.user.username) {
      return res.redirect('/auth/choose-username');
    }
    res.redirect('/auth/dashboard');
  }
);

router.get('/choose-username', isLoggedIn, (req, res) => {
  res.render('choose-username'); // Renders choose-username.ejs
});

router.post("/set-username", isLoggedIn, async (req, res) => {
  const { username } = req.body;

  const existing = await User.findOne({ username });
  if (existing) {
    return res.render("choose-username", { error: "Username already taken" });
  }

  req.user.username = username;
  await req.user.save();

  res.redirect("/auth/dashboard");
});


module.exports = router;
