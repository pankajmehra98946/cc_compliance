'use strict'

module.exports = function (app, express) {
    var userCtrl = require('./users.controller');
    var router = express.Router();

    var jwToken = require('../../common/jwToken');

    router.route(`/login`).post(userCtrl.login);
    router.route(`/register`).post(userCtrl.register);
    router.route(`/forgot-password`).post(userCtrl.forgotPassword);
    router.route(`/change-password`).post(jwToken.isAuthorizedToken, userCtrl.changePassword);
    router.route(`/users/get-subscriptions`).get(jwToken.isAuthorizedToken, userCtrl.getUserSubscription2);
    router.route(`/users/get-subscriptions/:id`).get(jwToken.isAuthorizedToken, userCtrl.getUserSubscription2);
    router.route(`/users/get-subscriptions-modules`).post(jwToken.isAuthorizedToken, userCtrl.getUserSubscriptionsModules);
    router.route(`/check-token`).post(userCtrl.checkToken);
    router.route(`/reset-password`).post(userCtrl.resetPassword);
    router.route(`/users/check-multi-factor-authentication`).post(userCtrl.checkMultiFactorAuthentication);
    router.route(`/users/resend-authentication-otp`).post(userCtrl.resendAuthOTP);

    
    router.route(`/users/:id`)
        .get(jwToken.isAuthorizedToken, userCtrl.getUser)
        .put(jwToken.isAuthorizedToken, userCtrl.updateUser)
        .delete(jwToken.isAuthorizedToken, userCtrl.deleteUser);
    
    router.route(`/clinics`)
        .get(jwToken.isAuthorizedToken, userCtrl.getUser)
        .post(jwToken.isAuthorizedToken, userCtrl.updateUser)
        .delete(jwToken.isAuthorizedToken, userCtrl.deleteUser);

    router.route(`/session-timeout`).get(userCtrl.getSessionExpireTime);

    app.use('/auth', router);
};