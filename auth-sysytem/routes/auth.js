const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Inventory = require('../models/Inventory');
const router = express.Router();
const path = require('path');
const { upload } = require('../config/cloudinary');

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
  const { sortBy, category } = req.query;

  let sortOption = {};
  switch (sortBy) {
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

  const filter = { userId: req.user._id };
  if (category) {
    filter.category = category;
  }

  const inventory = await Inventory.find(filter).sort(sortOption);

  res.render('dashboard', {
    user: req.user,
    inventory,
    selectedSort: sortBy || '',
    selectedCategory: category || ''
  });
});






// Add Inventory Item
router.post('/add-item', isLoggedIn, upload.single('image'), async (req, res) => {
   console.log("Received file:", req.file); 
  try {
    const { name, category, quantity, timesWorn } = req.body;

    if (!name || !category || !quantity || !req.file || !req.file.path) {
      return res.status(400).send("All fields including image are required.");
    }

    await Inventory.create({
      userId: req.user._id,
      name,
      category,
      quantity: Number(quantity),
      usageCount: Number(timesWorn) || 0,
      imageUrl: req.file.path,
      dateAdded: new Date()
    });

    res.redirect('/auth/dashboard');
  } catch (err) {
    console.error("Error adding item:", err);
    res.status(500).send("Failed to add item.");
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
router.post('/increment-worn/:id', isLoggedIn, async (req, res) => {
  const itemId = req.params.id;
  const count = parseInt(req.body.incrementValue);

  console.log('Incrementing usage count by:', count);
  console.log('For item ID:', itemId);

  if (isNaN(count) || count <= 0) {
    console.log("❌ Invalid count received");
    return res.redirect('/auth/dashboard');
  }

  try {
    const result = await Inventory.updateOne(
      { _id: itemId, userId: req.user._id },   // ensure it's only the user's item
      { $inc: { usageCount: count } }
    );

    const updatedItem = await Inventory.findById(itemId);
    console.log("Updated item usage count:", updatedItem.usageCount);

    console.log("Update result:", result);
    res.redirect('/auth/dashboard');
  } catch (err) {
    console.error("❌ Update failed:", err);
    res.redirect('/auth/dashboard');
  }
});




module.exports = router;
