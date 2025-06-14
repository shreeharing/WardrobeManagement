const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");
const User = require("../models/User");
passport.use(new LocalStrategy({
  usernameField: "email"
}, async (email, password, done) => {
  const user = await User.findOne({ email });

  if (!user) {
    console.log("❌ User not found");
    return done(null, false, { message: "No user found" });
  }

  if (!user.password) {
    console.log("❌ No password stored for this user");
    return done(null, false, { message: "Password missing" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    console.log("❌ Incorrect password");
    return done(null, false, { message: "Incorrect password" });
  }

  console.log("✅ Login successful");
  return done(null, user);
}));



passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:5000/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ googleId: profile.id });
  if (!user) {
    user = await User.create({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value
    });
  }
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
