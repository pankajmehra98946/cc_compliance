'use strict';
let { checkAuth } = require('../common/middleware');
var categoryController = require('../apis/controllers/categoriesController');
var express = require("express");
var router = express.Router();

router.get('/list',checkAuth ,categoryController.categoriesList);
router.post('/add',checkAuth  ,categoryController.categoriesAdd);

module.exports = router;