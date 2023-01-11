'use strict';


var { jwtSecretCode, jwt, sign } = require('../../common/jwt');
const userService = require('./users.services');
const categoryService = require('../categories/categories.services');
const subClinicService = require('../sub-clinics/subClinics.services');

const subscriptionService = require('../subscriptions/subscriptions.services');
const responseMessage = require('./users.message');
const mailer = require('../mailer/mailer');
var ObjectId = require('mongoose').Types.ObjectId;
var crypto = require('crypto');
var validator = require("email-validator");
const moment = require('moment');
const CONFIG = require('../../config/' + process.env.NODE_ENV)
const resetPasswordTemplate = require('..//emailTemplates/resetPassword');
const { APIHOST } = CONFIG.APP;
var EmailServices = require('../emailTemplates/email.services');
const SMSService = require('../twilio/twilio.service');

exports.login = async (req, res) => {
    try {
        var data = req.body ? req.body : {};
        data.email = (data.email).toLowerCase().trim();

        if (!data.email || !data.password) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing });
        }

        if (data.email) {
            if (!validator.validate(data.email)) {
                return res.json({ status: "Failure", code: 301, msg: responseMessage.message.valid_email });
            }
        }

        // let checkUser = await userService.getOne({ email: data.email, role: data.role , isDeleted : false });
        let checkUser = await userService.getOne({ email: data.email, role: { $in: data.role }, isDeleted: false });

        if (!checkUser) {
            return res.json({ status: "Failure", code: 404, msg: responseMessage.message.invalid_email, data: null });
        } else {
            var password = crypto.pbkdf2Sync(data.password, checkUser.salt, 1000, 64, 'sha512').toString('hex');
            let logedinUser = await userService.getOne({ email: data.email, password: password, isDeleted: false });
            if (!logedinUser || logedinUser == null) {
                return res.json({ status: "Failure", code: 301, msg: responseMessage.message.wrong_password });
            }

            if (!logedinUser.isActive) {
                return res.json({ status: "Failure", code: 301, msg: responseMessage.message.not_activated });
            }

            // if(logedinUser && logedinUser.subClinicId) {
            //     let checkSubClinic = await  subClinicService.getOne({ _id : ObjectId(logedinUser.subClinicId) , isDeleted : false});
            //     if(!checkSubClinic || checkSubClinic == null ) {
            //         return res.json({ status: "Failure", code: 301, msg: responseMessage.message.clinic_deleted });
            //     }
            // }

            var payLoad = { "email": logedinUser.email, role: logedinUser.role, _id: logedinUser._id };
            var jwtToken = jwt.sign(payLoad, jwtSecretCode.secret);
            let userDetails = {
                loginId: logedinUser._id,
                role: logedinUser.role,
                firstName: logedinUser.firstName,
                profileImage: logedinUser.profileImage,
                lastName: logedinUser.lastName
            }

            if (logedinUser.passwordTimeout) {
                userDetails['changePasswordTimeout'] = moment(moment().toISOString()).isSameOrAfter(logedinUser.passwordTimeout);
            }

            if (logedinUser.subClinicId) {
                userDetails['subClinicId'] = logedinUser.subClinicId;
            }


            // Two Factor Authentication
            // var otp = Math.floor(100000 + Math.random() * 9000);
            let otp = Math.floor(Math.random() * (999 - 100 + 1)) + 999;

            // var userOTPCounts = logedinUser && logedinUser.multiFactorAuth && logedinUser.multiFactorAuth.count ? logedinUser.multiFactorAuth.count : 0;
            var userOTPCounts = 0;

            let updatedUser = await userService.update({ _id: ObjectId(logedinUser._id), isDeleted: false }, {
                $set: {
                    "multiFactorAuth.otp": otp,
                    "multiFactorAuth.count": userOTPCounts + 1,
                    "multiFactorAuth.expiry": Date.now() + 600000
                }
            });
            if (updatedUser) {
                var emailData = await EmailServices.getEmailTemplate('multi-factor-authentication');
                emailData.body = emailData.body.replace('{{SiteLogo}}', `<a href="${CONFIG.WebEndPoint}"><img src="${CONFIG.SiteLogo}"  width='150px' height='150px' style='margin: 0 auto' alt="SiteLogo" /></a>`);
                emailData.body = emailData.body.replace('{{userName}}', logedinUser.firstName);
                emailData.body = emailData.body.replace('{{otp}}', otp);
                mailer.sendMail('', data.email, emailData.subject, emailData.body);
            }

            // Twillio SMS
            if (logedinUser.phone) {
                var smsbody = `Hello ${logedinUser.firstName}. The verfication code is: ${otp}`
                SMSService.sendSMS(`${logedinUser.phone}`, smsbody)
            }

            return res.json({ status: "Success", code: 200, msg: responseMessage.message.login_success, data: jwtToken, userDetails: userDetails });
        }
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
}

exports.register = async (req, res) => {
    try {
        var data = req.body ? req.body : {};

        data.email = (data.email).toLowerCase().trim();

        if (!validator.validate(data.email)) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.valid_email });
        }

        if (!data.email) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing });
        }

        let isUserAlreadyExists = await userService.getOne({ email: data.email, isDeleted: false });

        if (isUserAlreadyExists) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.email_exist });
        }

        var passwordChangeTimeout = CONFIG.PasswordChangeTimeout ? CONFIG.PasswordChangeTimeout : 15
        data['passwordTimeout'] = new Date(moment(moment().toISOString()).add(passwordChangeTimeout, 'days')).toISOString();

        let result = await userService.create(data);

        return res.json({ status: "Success", code: 200, msg: responseMessage.message.added_success, data: result });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
}


exports.changePassword = async (req, res) => {
    try {
        var data = req.body ? req.body : {};
        if (!data.password || !data.confirm_password || !data.current_password) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.update_password_missing });
        }
        if (data.password != data.confirm_password) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.password_not_matched });
        }
        let conditions = { '_id': ObjectId(req.token._id) }

        var userDetails = await userService.getOne(conditions);
        if (userDetails) {
            var password = crypto.pbkdf2Sync(data.current_password, userDetails.salt, 1000, 64, 'sha512').toString('hex');
            var user = await userService.getOne({ '_id': ObjectId(req.token._id), 'password': password });
            if (user != null) {
                password = crypto.pbkdf2Sync(data.password, userDetails.salt, 1000, 64, 'sha512').toString('hex');
                var passwordChangeTimeout = CONFIG.PasswordChangeTimeout ? CONFIG.PasswordChangeTimeout : 15
                var passwordTimeout = new Date(moment(moment().toISOString()).add(passwordChangeTimeout, 'days')).toISOString();
                let updatedUser = await userService.update({ _id: ObjectId(user._id) }, {
                    $set: {
                        "password": password,
                        "passwordTimeout": passwordTimeout
                    }
                });
                return res.json({
                    status: true,
                    code: 200,
                    msg: responseMessage.message.update_password_success
                })
            } else {
                return res.json({ status: "Failure", code: 301, msg: responseMessage.message.invalid_password });
            }
        } else {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.invalid_password });
        }
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        var data = req.body ? req.body : {};
        var requestType = data.requestType ? data.requestType : 'email';
        let matchQuery = {};

        data.email = (data.email).toLowerCase().trim();

        if (!validator.validate(data.email)) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.valid_email });
        }
        if (!data.email) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing });
        }

        matchQuery = { email: data.email, isDeleted: false };

        if (data.role) {
            // matchQuery["role"] = data.role;
            matchQuery["role"] = { $in: data.role };
        }

        var user = await userService.getOne(matchQuery);
        if (user) {
            crypto.randomBytes(20, async function (err, buf) {
                var token = buf.toString('hex');
                var otp = Math.floor(100000 + Math.random() * 900000);
                let updatedUser = await userService.update({ _id: ObjectId(user._id) }, {
                    $set: {
                        "resetPassword.token": token,
                        "resetPassword.otp": otp,
                        "resetPassword.isExpired": false,
                        "resetPassword.expiry": Date.now() + 3600000
                    }
                });

                var refUrl = APIHOST;

                if (user.role.includes("admin")) {
                    refUrl = refUrl + "/admin/reset-password/" + token;
                }
                else if (user.role.includes("clinic")) {
                    refUrl = refUrl + "/reset-password/" + token;
                }
                else {
                    refUrl = refUrl + "/reset-password/" + token;
                }

                if (requestType == 'email') {
                    // let parameters = { refUrl: refUrl, userName: user.firstName }
                    // let emailData = await resetPasswordTemplate.template(parameters);
                    var emailData = await EmailServices.getEmailTemplate('forget-password');
                    emailData.body = emailData.body.replace('{{SiteLogo}}', `<a href="${CONFIG.WebEndPoint}"><img src="${CONFIG.SiteLogo}"  width='150px' height='150px' style='margin: 0 auto' alt="SiteLogo" /></a>`);
                    emailData.body = emailData.body.replace('{{userName}}', user.firstName);
                    emailData.body = emailData.body.replace('{{refUrl}}', refUrl);
                    mailer.sendMail('', data.email, emailData.subject, emailData.body);
                }
                return res.json({ data: user, status: "Success", code: 200, msg: responseMessage.message.reset_link_sent })
            });

        } else {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.invalid_email });
        }
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
}

exports.checkToken = async (req, res) => {
    try {
        if (!req.body.resetToken) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.reset_token_missing });
        }

        let conditions = { 'resetPassword.token': req.body.resetToken }

        let User = await userService.getOne(conditions);

        if (User) {
            if (User.resetPassword.isExpired) {
                return res.json({
                    status: "Success",
                    code: 200,
                    msg: responseMessage.message.reset_link_expired,
                    data: { isExpired: true }
                });
            } else {
                return res.json({
                    status: "Success",
                    code: 200,
                    msg: responseMessage.message.reset_link_valid,
                    data: { isExpired: false }
                });
            }
        } else {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.reset_link_invalid });
        }
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};

exports.resetPassword = async (req, res) => {
    try {
        var data = req.body ? req.body : {};

        if (!data.resetToken) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.reset_token_missing });
        }

        if (!data.password || !data.cpassword) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.password_missing });
        }

        if (data.password != data.cpassword) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.password_not_matched });
        }
        let conditions = { 'resetPassword.token': data.resetToken }
        let user = await userService.getOne(conditions);
        if (user) {
            data.password = crypto.pbkdf2Sync(data.password, user.salt, 1000, 64, 'sha512').toString('hex');
            var passwordChangeTimeout = CONFIG.PasswordChangeTimeout ? CONFIG.PasswordChangeTimeout : 15;
            var passwordTimeout = new Date(moment(moment().toISOString()).add(passwordChangeTimeout, 'days')).toISOString();
            let updatedUser = await userService.update({ _id: ObjectId(user._id) }, {
                $set: {
                    "passwordTimeout": passwordTimeout,
                    "password": data.password,
                    "resetPassword.isExpired": true,
                    "resetPassword.expiry": Date.now()
                }
            });
            return res.json({
                data: user,
                status: "Success",
                code: 200,
                msg: responseMessage.message.reset_password_success
            })
        }
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};

exports.getList = async (req, res) => {
    try {
        let queryObject = req.body ? req.body : {};
        let aggregateQuery = [];
        let query = queryObject.query || {};
        query["isDeleted"] = false;
        if (query._id) {
            query._id = ObjectId(query._id);
        }

        if (queryObject.search) {
            let searchQuery = {
                $or: [{ firstName: { $regex: queryObject.search, $options: "i" } },
                { lastName: { $regex: queryObject.search, $options: "i" } },
                { email: { $regex: queryObject.search, $options: "i" } }
                ]
            };
            query = {
                $and: [query, searchQuery]
            };
        }

        aggregateQuery.push({ $match: query });
        if (queryObject.sortField) {
            let sortOrder = Number(queryObject.sortOrder) ? Number(queryObject.sortOrder) : -1;
            let sortQuery = {};
            sortQuery[queryObject.sortField] = sortOrder;
            aggregateQuery.push({ $sort: sortQuery });
        }
        else {
            let sort = {};
            sort["created_at"] = -1;
            aggregateQuery.push({ $sort: sort });
        }
        if (queryObject.offSet && queryObject.limit) {
            let offSet = Number(queryObject.offSet);
            let limit = Number(queryObject.limit);
            let skip = (Number(offSet) - 1) * queryObject.limit;
            aggregateQuery.push({ $skip: skip });
            aggregateQuery.push({ $limit: limit });
        }
        let count = await userService.count(query);
        let data = await userService.get(aggregateQuery);
        return res.json({
            status: "Success",
            code: 200,
            msg: responseMessage.message.found_success,
            data: data,
            count: count
        });

    }
    catch (err) {
        return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
    }

};

exports.updateUser = async (req, res) => {
    try {
        let id = req.params.id ? req.params.id : req.token._id;
        if (!id) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }
        let data = await userService.update({ _id: ObjectId(id) }, req.body);
        return res.json({ status: "Success", code: 200, msg: responseMessage.message.updated_success, data: data });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};

exports.getUser = async (req, res) => {
    try {
        let userId = req.params.id ? req.params.id : req.token._id;

        let aggregateQuery = [{
            $match: { _id: ObjectId(userId), isDeleted: false }
        }];
        let result = await userService.get(aggregateQuery);
        if (result) {
            result = result[0];
        }
        return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: result });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};

exports.deleteUser = async (req, res) => {
    try {
        let id = req.params.id ? req.params.id : req.token._id;
        let data = await userService.editProfile({ _id: ObjectId(id) }, { $set: { isDeleted: true, isActive: false } });
        return res.json({ status: "Success", code: 200, msg: responseMessage.message.delete_account, data: data });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};

exports.getUserSubscription = async (req, res) => {
    try {
        let userId = req.params.id ? req.params.id : req.token._id;
        if (!userId) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }
        let aggregateQuery = [{
            $match: { _id: ObjectId(userId), isDeleted: false },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "subscriptions",
                foreignField: "_id",
                as: "subscriptionsData"
            }
        },
        { $unwind: "$subscriptionsData" },
        {
            $match: { "subscriptionsData.isActive": true, "subscriptionsData.isDeleted": false }
        },
        {
            $project: {
                "subscriptionsData.modules": 1,
            }
        }
        ];
        let result = await userService.get(aggregateQuery);
        if (result) {
            result = result[0];
        }
        if (result && result.subscriptionsData && result.subscriptionsData.modules && result.subscriptionsData.modules.length) {
            let matchConditions = { _id: { $in: result.subscriptionsData.modules }, isActive: true, isDeleted: false }
            let modules = await categoryService.findAll(matchConditions)
            if (modules) {
                return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: modules });
            }
        }
        return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: [] });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};

exports.getUserSubscription2 = async (req, res) => {
    try {
        let userId = req.params.id ? req.params.id : req.token._id;

        if (req.params.id) {
            let userDetails = await userService.getOne({ _id: ObjectId(userId), isDeleted: false }, { _id: 0, clinicId: 1 })
            userId = userDetails && userDetails.clinicId ? ObjectId(userDetails.clinicId) : ObjectId(req.token._id);
        }

        if (!userId) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }
        let aggregateQuery = [{
            $match: { _id: ObjectId(userId), isActive: true, isDeleted: false },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "assignedSubscriptions.subscriptionId",
                foreignField: "_id",
                as: "subscriptionsData"
            }
        },
        // { $unwind: "$subscriptionsData" },
        {
            $match: { "subscriptionsData.isActive": true, "subscriptionsData.isDeleted": false }
        }
        ];
        let result = await userService.get(aggregateQuery);
        if (!result || !result.length) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.default_error, data: result });
        }
        return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: result[0] });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};


exports.getUserSubscriptionsModules = async (req, res) => {
    try {
        let data = req.body ? req.body : {};
        let userId = req.params.id ? req.params.id : req.token._id;
        let subscriptionId = data.subscriptionId;

        if (!userId) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }

        if (!subscriptionId) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }

        let subscriptions = await subscriptionService.getOne({ _id: ObjectId(subscriptionId), isActive: true, isDeleted: false })

        if (!subscriptions) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.default_error, data: {} });
        }

        let subscribedModules = subscriptions.modules;
        if (subscribedModules && subscribedModules.length) {
            let matchConditions = { _id: { $in: subscribedModules }, isActive: true, isDeleted: false }
            let modules = await categoryService.findAll(matchConditions)
            if (modules) {
                return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: modules });
            }
        }
        return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: [] });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};

exports.assignSubscription = async (req, res) => {
    try {
        let id = req.params.id;
        let data = req.body ? req.body : {};
        if (!id) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }

        let subscription = await subscriptionService.getOne({ _id: ObjectId(data.subscriptions) })

        if (!subscription) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.default_error, data: subscription });
        }

        let subscriptionsDetails = {}
        subscriptionsDetails['subscriptionId'] = ObjectId(data.subscriptions);
        subscriptionsDetails['expiry'] = moment(new Date(), "DD-MM-YYYY").add(subscription.noOfDays, 'days');
        subscriptionsDetails['isExpired'] = false;
        let updateData = {
            subscriptions: data.subscriptions,
            subscriptionsDetails: subscriptionsDetails
        }
        let result = await userService.update({ _id: ObjectId(id) }, updateData);
        return res.json({ status: "Success", code: 200, msg: responseMessage.message.updated_success, data: result });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};


exports.assignSubscription2 = async (req, res) => {
    try {
        let id = req.params.id;
        let data = req.body ? req.body : {};
        if (!id) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }

        // let subscription = await subscriptionService.getOne({ _id: ObjectId(data.subscriptions) })

        let subscription = await subscriptionService.find({ _id: { $in: data.assignSubscriptions } })

        console.log("subscription list", subscription)
        if (!subscription) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.default_error, data: subscription });
        }
        var assignedSubscriptions = [];
        subscription.forEach((element) => {
            assignedSubscriptions.push({
                subscriptionId: ObjectId(element._id),
                expiry: new Date(moment(new Date(), "DD-MM-YYYY").add(element.noOfDays, 'days')).toISOString(),
                isExpired: false
            })
        });
        console.log('assignedSubscriptions', assignedSubscriptions)
        let updateData = {
            subscriptions: data.subscriptions,
            assignedSubscriptions: assignedSubscriptions
        }
        let result = await userService.update({ _id: ObjectId(id) }, updateData);
        return res.json({ status: "Success", code: 200, msg: responseMessage.message.updated_success, data: result });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};

exports.getSessionExpireTime = async (req, res) => {
    try {
        let sessionTime = CONFIG.sessionExpiredTime ? CONFIG.sessionExpiredTime : 600;
        if (!sessionTime) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }
        return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: sessionTime });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};


exports.checkMultiFactorAuthentication = async (req, res) => {
    try {
        var data = req.body ? req.body : {};

        if (!validator.validate(data.email)) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.valid_email });
        }

        if (!data.otp) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.otp_missing });
        }

        if (!data.email) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing });
        }

        if (data.otp && data.otp.length != 4) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.otp_link_invalid });
        }

        let conditions = { "email": data.email, isDeleted: false, "multiFactorAuth.otp": data.otp }

        let user = await userService.getOne(conditions);

        if (!user) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.otp_link_invalid });
        }

        var dif = (new Date() - (new Date(user.multiFactorAuth.expiry) - 600000));
        var hour = (Math.floor(((dif) / 1000) / 3600));
        var minute = Math.abs(Math.floor(((dif) / 1000) / 60));

        if (hour > 1 || minute > 1) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.otp_expired });
        }

        return res.json({ status: "Success", code: 200, msg: responseMessage.message.auth_success, data: { 'authentications': true } });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
}


exports.resendAuthOTP = async (req, res) => {
    try {
        var data = req.body ? req.body : {};

        if (!validator.validate(data.email)) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.valid_email });
        }

        if (!data.email) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing });
        }

        let conditions = { email: data.email, isDeleted: false }

        let logedinUser = await userService.getOne(conditions);

        if (!logedinUser) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.invalid_email });
        }

        var dif = (new Date() - (new Date(logedinUser.multiFactorAuth.expiry) - 600000));
        var hour = (Math.floor(((dif) / 1000) / 3600));
        var minute = Math.abs(Math.floor(((dif) / 1000) / 60));

        if (hour > 1 || minute < 1) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.otp_resend_try });
        }

        let otp = Math.floor(Math.random() * (999 - 100 + 1)) + 999;

        var userOTPCounts = logedinUser && logedinUser.multiFactorAuth && logedinUser.multiFactorAuth.count ? logedinUser.multiFactorAuth.count : 0;


        if (userOTPCounts > 4) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.otp_send_block });
        }

        let updatedUser = await userService.update({ _id: ObjectId(logedinUser._id) }, {
            $set: {
                "multiFactorAuth.otp": otp,
                "multiFactorAuth.count": userOTPCounts + 1,
                "multiFactorAuth.expiry": Date.now() + 600000
            }
        });

        if (updatedUser) {
            console.log(otp)
            var emailData = await EmailServices.getEmailTemplate('multi-factor-authentication');
            emailData.body = emailData.body.replace('{{SiteLogo}}', `<a href="${CONFIG.WebEndPoint}"><img src="${CONFIG.SiteLogo}"  width='150px' height='150px' style='margin: 0 auto' alt="SiteLogo" /></a>`);
            emailData.body = emailData.body.replace('{{userName}}', logedinUser.firstName);
            emailData.body = emailData.body.replace('{{otp}}', otp);
            mailer.sendMail('', data.email, emailData.subject, emailData.body);
            return res.json({ status: "Success", code: 200, msg: responseMessage.message.otp_auth_success })
        }

        return res.json({ status: "Failure", code: 301, msg: responseMessage.message.default_error });

    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
}