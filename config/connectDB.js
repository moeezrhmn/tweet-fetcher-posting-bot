const mongoose = require("mongoose");

const connect_db = () => {

   mongoose.connect('mongodb://127.0.0.1:27017/tweets', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
   });

   const db = mongoose.connection;

   db.on("error", (error) => {
      console.error("Connection error:", error);
   });

   db.once("open", () => {
      console.log("Connected to the database!");
   });
};

module.exports = { connect_db };
