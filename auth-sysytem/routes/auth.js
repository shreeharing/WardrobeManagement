const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const User = require('../models/user');
const Inventory = require('../models/Inventory');
const Post = require('../models/Post');
const router = express.Router();
const path = require('path');
const { upload } = require('../config/cloudinary');

// Middleware
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}

// Login/Register routes
router.get("/login", (req, res) => res.render('login'));
router.get("/register", (req, res) => res.render('register'));

// Dashboard
router.get('/dashboard', isLoggedIn, async (req, res) => {
  const { sortBy, category } = req.query;
  let sortOption = {};

  switch (sortBy) {
    case 'category': sortOption = { category: 1 }; break;
    case 'quantity': sortOption = { quantity: -1 }; break;
    case 'date': sortOption = { dateAdded: -1 }; break;
    case 'usageCount': sortOption = { usageCount: -1 }; break;
  }

  const filter = { userId: req.user._id };
  if (category) filter.category = category;

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

// Delete Item
router.post("/delete-item", async (req, res) => {
  const rawItemIds = req.body.itemIds;
  if (!rawItemIds) return res.status(400).send("No items selected for deletion.");

  let itemIds = [];
  try {
    itemIds = JSON.parse(rawItemIds);
  } catch (err) {
    return res.status(400).send("Invalid itemIds JSON.");
  }

  await Inventory.deleteMany({ _id: { $in: itemIds } });
  res.redirect("/auth/dashboard");
});

// Register & Login
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
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  (req, res) => {
    if (!req.user.username) {
      return res.redirect('/auth/choose-username');
    }
    res.redirect('/auth/dashboard');
  }
);

// Username setup
router.get('/choose-username', isLoggedIn, (req, res) => {
  res.render('choose-username');
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

// Increment Usage
router.post('/increment-worn/:id', isLoggedIn, async (req, res) => {
  const itemId = req.params.id;
  const count = parseInt(req.body.incrementValue);

  if (isNaN(count) || count <= 0) return res.redirect('/auth/dashboard');

  try {
    await Inventory.updateOne(
      { _id: itemId, userId: req.user._id },
      { $inc: { usageCount: count } }
    );
    res.redirect('/auth/dashboard');
  } catch (err) {
    console.error("❌ Update failed:", err);
    res.redirect('/auth/dashboard');
  }
});

// Search users
router.get('/user-search', isLoggedIn, (req, res) => {
  res.render('userSearch', { users: null, searched: false });
});

router.get('/search-user', isLoggedIn, async (req, res) => {
  const users = await User.find({
    username: { $regex: req.query.username, $options: 'i' }
  });
  res.render('userSearch', { users, searched: true });
});

// Friends
router.post('/add-friend/:id', isLoggedIn, async (req, res) => {
  try {
    const friendId = req.params.id;
    const user = await User.findById(req.user._id);
    if (!user.friends.includes(friendId)) {
      user.friends.push(friendId);
      await user.save();
    }
    res.redirect(`/auth/users?search=${req.query.search || ''}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding friend');
  }
});

router.post('/remove-friend/:id', isLoggedIn, async (req, res) => {
  try {
    const friendId = req.params.id;
    const user = await User.findById(req.user._id);
    user.friends = user.friends.filter(id => id.toString() !== friendId);
    await user.save();
    res.redirect(`/auth/users?search=${req.query.search || ''}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error removing friend');
  }
});

// User feed page
router.get('/users', isLoggedIn, async (req, res) => {
  const search = req.query.search;
  let users = [];
  if (search) {
    users = await User.find({
      username: { $regex: new RegExp(search, 'i') },
      _id: { $ne: req.user._id }
    });
  }

  const inventory = await Inventory.find({ userId: req.user._id });
  const currentUserId = req.user._id;
  const friendIds = req.user.friends || [];

  const posts = await Post.find({
    user: { $in: [currentUserId, ...friendIds] }
  })
    .populate('user','username')
    .populate('items')
    .populate('comments.user')
    .sort({ createdAt: -1 });

  res.render('userSearch', {
    users,
    inventory,
    posts,
    currentUser: req.user,
    searched: !!search
  });
});

// Create Post
router.post('/create-post', isLoggedIn, async (req, res) => {
  const items = req.body.items || req.body['items[]'];
  const caption = req.body.caption;

  if (!items || (Array.isArray(items) && items.length === 0)) {
    return res.status(400).send("Please select at least one item.");
  }

  try {
    await Post.create({
      user: req.user._id,
      items: Array.isArray(items) ? items : [items],
      caption
    });
    res.redirect('/auth/users');
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).send('Failed to create post');
  }
});

// Profile page
router.get('/user-profile', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends');
    const inventory = await Inventory.find({ userId: req.user._id });

    res.render('userProfile', {
      user,
      inventory
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).send('Server Error');
  }
});

// My Posts
router.get('/my-posts', isLoggedIn, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user._id })
                            .populate('items')
                            .sort({ createdAt: -1 });

    console.log('🧪 Sample Populated Post:', JSON.stringify(posts[0], null, 2)); // ✅ debug log

    const inventory = await Inventory.find({ userId: req.user._id });

    res.render('myPosts.ejs', {
      user: req.user,
      posts,
      inventory
    });
  } catch (err) {
    console.error('❌ Failed to fetch posts', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.post('/edit-post/:postId', isLoggedIn, async (req, res) => {
  console.log('Editing post:', req.params.postId, 'New caption:', req.body.caption);
  try {
    const { caption } = req.body;
    await Post.findOneAndUpdate(
      { _id: req.params.postId, user: req.user._id },
      { caption },
      { new: true }
    );

    const inventory = await Inventory.find({ userId: req.user._id });
    const posts = await Post.find({ user: req.user._id })
                            .populate('items')
                            .sort({ createdAt: -1 });

    res.render('myPosts.ejs', { user: req.user, posts, inventory });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to update post');
  }
});

router.post('/delete-post/:postId', isLoggedIn, async (req, res) => {
  try {
    const deletedPost = await Post.findOneAndDelete({
      _id: req.params.postId,
      user: req.user._id
    });

    if (!deletedPost) return res.status(404).send('Post not found or unauthorized');

    const inventory = await Inventory.find({ userId: req.user._id });
    const posts = await Post.find({ user: req.user._id })
                            .populate('items')
                            .sort({ createdAt: -1 });

    res.render('myPosts.ejs', {
      user: req.user,
      posts,
      inventory
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete post');
  }
});


// Like a post
router.post('/like/:postId', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).send('Post not found');

    const userId = req.user._id;

    if (post.likes.includes(userId)) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    res.redirect(req.get('referer') || '/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error liking post');
  }
});
router.get('/comments/:postId', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('comments.user', 'username');

    if (!post) return res.status(404).json({ error: 'Post not found' });

    const formattedComments = post.comments.map(c => ({
      _id: c._id,
      text: c.text,
      user: c.user && c.user.username ? c.user.username : 'Unknown',
      createdAt: c.createdAt
    }));

    res.json(formattedComments);
  } catch (err) {
    console.error('❌ Error loading comments:', err);
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// Add comment
router.post('/comments/:postId', isLoggedIn, async (req, res) => {
  console.log("💬 POST /comments/:postId hit");
  try {
    const { text } = req.body;
    const postId = req.params.postId;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text cannot be empty' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.comments.push({
      user: req.user._id,
      text: text.trim()
    });

    await post.save();
    console.log('✅ Comment added:', post.comments.at(-1));

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error adding comment:', err);
    res.status(500).json({ error: 'Server error while adding comment' });
  }
});


// Delete comment
router.delete('/comment/delete/:id', isLoggedIn, async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user._id;

  try {
    const post = await Post.findOne({ 'comments._id': commentId });
    if (!post) return res.status(404).json({ error: 'Comment not found' });

    const commentIndex = post.comments.findIndex(
      c => c._id.toString() === commentId && c.user.toString() === userId.toString()
    );

    if (commentIndex === -1) {
      return res.status(403).json({ error: 'Unauthorized or comment not found' });
    }

    post.comments.splice(commentIndex, 1);
    await post.save();

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Server error deleting comment' });
  }
});


module.exports = router;
