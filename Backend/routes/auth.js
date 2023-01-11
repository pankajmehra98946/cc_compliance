// 'use strict';
var express = require("express");
var router = express.Router();
//let { checkAuth } = require('../common/middleware')
var loginController = require('../apis/controllers/loginController');



router.post('/login', loginController.adminLogin);
router.post('/adduser' ,loginController.addUser);
router.post('/verifyuser', loginController.dashboard);

module.exports = router;