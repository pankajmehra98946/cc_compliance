var express = require("express");
var router = express.Router();
var loginController = require('../apis/controllers/loginController');
const loginRoutes = require("./auth");
const categoryRoutes = require("./category");

router.use("/auth", loginRoutes);
router.use("/category", categoryRoutes);

module.exports = router;