require("dotenv").config();
var express = require("express");
var bodyParser = require("body-parser");
var DB = require("./config/db/connection");
const path = require("path");
const cors = require("cors");
var router = express.Router();
var app = express();
const mongoose = require("mongoose");

// mongoose.plugin(require('./common/plugin'))

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.json({ limit: "5000mb" }));
app.use(bodyParser.urlencoded({ limit: "5000mb", extended: true }));

// for parsing application/x-www-form-urlencoded
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use('/', mainRoute);
var port = process.env.PORT || 8024;

// Create MongoDB connection
DB.connection();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("/public/uploads"));

// Crons

// Routes
require("./modules/admin/admin.route")(app, express);
require("./modules/users/users.route")(app, express);
require("./modules/patients/patients.route")(app, express);

// Add headers

// Dist Folders


app.listen(port);

console.log("Server started on: " + port);
console.log(
  "Enviornment :",
  process.env.NODE_ENV ? process.env.NODE_ENV : "Default"
);
