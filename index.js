var express = require("express");
var path = require("path");
const bodyParser = require("body-parser");

var indexRouter = require("./routes/index");
const { connect_db } = require("./config/connectDB");

var app = express();

app.use(bodyParser.urlencoded({ exteded: true }));
app.use(bodyParser.json());

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);


connect_db();

module.exports = app;
