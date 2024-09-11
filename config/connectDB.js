const mongoose = require("mongoose");

const connect_db = () => {
//mongodb://127.0.0.1:27017/tweets
   mongoose.connect('', {
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
