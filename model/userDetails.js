let mongoose = require("mongoose");

let user_settings = new mongoose.Schema({
   username: String,
   tweet: String,
   image_url: String,
   tweet_id: String
});

module.exports = mongoose.model("user_settings", user_settings);
