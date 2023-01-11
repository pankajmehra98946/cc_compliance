'use strict'

module.exports = function (app, express) {

    const faqsCtrl = require('../faqs/faqs.controller');
    const userCtrl = require('../users/users.controller');
    const cmsCtrl = require('../cms/cms.controller');
    const contactusCtrl = require('../contactUs/contactUs.controller');
    const subscriptionsCtrl = require('../subscriptions/subscriptions.controller');
    const statisticsCtrl = require('../statistics/statistics.controller');
    const languagesCtrl = require('../manage-languages/languages.controller');
    const raceCtrl = require('../manage-race/race.controller');
    const ethnicityCtrl = require('../manage-ethnicity/ethnicity.controller');
    const socialMediaCtrl = require('../manage-social-media/social.controller');
    const serveCtrl = require('../who-we-serve/serve.controller');
    const emailTempate = require('../emailTemplates/email.controller');
    const reasearchAndCaseCtrl = require('../research-and-case-studies/rcs.controller');
    const blogsCtrl = require('../manage-blogs/blogs.controller');


    var jwToken = require('../../common/jwToken');
    var middleware = require('../../common/middleware');

    var router = express.Router();

    // Admin
    router.route(`/auth/change-password`).post(jwToken.isAuthorizedToken, userCtrl.changePassword);

    // Admin Dashboard Statistics
    router.get('/get-statistics', jwToken.isAuthorizedToken, statisticsCtrl.getStats);

    // Manage Clinics
    router.post(`/clinics`, userCtrl.getList);
    router.post(`/clinics/update/:id`, jwToken.isAuthorizedToken, userCtrl.updateUser);
    // router.route(`/clinics/assign-subscription/:id`).post(jwToken.isAuthorizedToken, userCtrl.assignSubscription);
    router.route(`/clinics/assign-subscription/:id`).post(jwToken.isAuthorizedToken, userCtrl.assignSubscription2);

    // FAQs Management
    router.route(`/faqs/add`).post(jwToken.isAuthorizedToken,middleware.isSuperAdmin,faqsCtrl.add);
    router.route(`/faqs/update/:id`).post(jwToken.isAuthorizedToken,middleware.isSuperAdmin, faqsCtrl.update);
    router.route(`/faqs`).post(jwToken.isAuthorizedToken,middleware.isSuperAdmin, faqsCtrl.getList);
    router.route(`/faqs/:id`).get(jwToken.isAuthorizedToken,middleware.isSuperAdmin, faqsCtrl.getOne);
    router.route(`/faqs/remove/:id`).delete(jwToken.isAuthorizedToken,middleware.isSuperAdmin,faqsCtrl.remove);
    router.route('/get-faqs').get(faqsCtrl.getFAQs);

    // CMS Route
    router.route(`/cms/add`).post(jwToken.isAuthorizedToken, cmsCtrl.add);
    router.route(`/cms/update/:id`).post(jwToken.isAuthorizedToken, cmsCtrl.update);
    router.route(`/cms`).post(jwToken.isAuthorizedToken, cmsCtrl.getList);
    router.route(`/cms/:id`).get(jwToken.isAuthorizedToken, cmsCtrl.getOne);
    router.route(`/cms/remove/:id`).delete(jwToken.isAuthorizedToken, cmsCtrl.remove);


    // Contacts Management
    router.route(`/contacts/update/:id`).post(jwToken.isAuthorizedToken, contactusCtrl.update);
    router.route(`/contacts`).post(jwToken.isAuthorizedToken, contactusCtrl.getList);
    router.route(`/contacts/:id`).get(jwToken.isAuthorizedToken, contactusCtrl.getOne);
    router.route(`/contacts/remove/:id`).delete(jwToken.isAuthorizedToken, contactusCtrl.remove);
    router.route(`/contacts/sendReply/:id`).post(jwToken.isAuthorizedToken, contactusCtrl.sendReply);


    // Subscriptions Management
    router.route(`/subscriptions/add`).post(jwToken.isAuthorizedToken, subscriptionsCtrl.add);
    router.route(`/subscriptions/update/:id`).post(jwToken.isAuthorizedToken, subscriptionsCtrl.update);
    router.route(`/subscriptions`).post(jwToken.isAuthorizedToken, subscriptionsCtrl.getList);
    router.route(`/subscriptions/:id`).get(jwToken.isAuthorizedToken, subscriptionsCtrl.getOne);
    router.route(`/subscriptions/remove/:id`).delete(jwToken.isAuthorizedToken, subscriptionsCtrl.remove);
    router.route(`/subscriptions/subscription-history`).post(jwToken.isAuthorizedToken, subscriptionsCtrl.addSubscriptionsHistory);
    router.route(`/subscriptions/get-subscription-history`).post(jwToken.isAuthorizedToken, subscriptionsCtrl.getSubcriptionHistoryList);
    router.route(`/subscriptions/remove-subscription-history/:id`).post(jwToken.isAuthorizedToken, subscriptionsCtrl.removeSubscriptionHistory);
    router.route(`/subscriptions/update-subscription-history/:id`).post(jwToken.isAuthorizedToken, subscriptionsCtrl.updateSubscriptionHistory);


    // Manage Languages
    router.route(`/languages`).post(jwToken.isAuthorizedToken, languagesCtrl.getList);
    router.route(`/languages/:id`).get(jwToken.isAuthorizedToken, languagesCtrl.getOne);
    router.route(`/languages/add`).post(jwToken.isAuthorizedToken, languagesCtrl.add);
    router.route(`/languages/update/:id`).post(jwToken.isAuthorizedToken, languagesCtrl.update);
    router.route(`/languages/remove/:id`).delete(jwToken.isAuthorizedToken, languagesCtrl.remove);

    // Manage Race
    router.route(`/race`).post(jwToken.isAuthorizedToken, raceCtrl.getList);
    router.route(`/race/:id`).get(jwToken.isAuthorizedToken, raceCtrl.getOne);
    router.route(`/race/add`).post(jwToken.isAuthorizedToken, raceCtrl.add);
    router.route(`/race/update/:id`).post(jwToken.isAuthorizedToken, raceCtrl.update);
    router.route(`/race/remove/:id`).delete(jwToken.isAuthorizedToken, raceCtrl.remove);

    // Manage Ethnicity
    router.route(`/ethnicity`).post(jwToken.isAuthorizedToken, ethnicityCtrl.getList);
    router.route(`/ethnicity/:id`).get(jwToken.isAuthorizedToken, ethnicityCtrl.getOne);
    router.route(`/ethnicity/add`).post(jwToken.isAuthorizedToken, ethnicityCtrl.add);
    router.route(`/ethnicity/update/:id`).post(jwToken.isAuthorizedToken, ethnicityCtrl.update);
    router.route(`/ethnicity/remove/:id`).delete(jwToken.isAuthorizedToken, ethnicityCtrl.remove);


    // Social Media Management
    router.route(`/social-media/add`).post(jwToken.isAuthorizedToken, socialMediaCtrl.add);
    router.route(`/social-media/update/:id`).post(jwToken.isAuthorizedToken, socialMediaCtrl.update);
    router.route(`/social-media`).post(jwToken.isAuthorizedToken, socialMediaCtrl.getList);
    router.route(`/social-media/:id`).get(jwToken.isAuthorizedToken, socialMediaCtrl.getOne);
    router.route(`/social-media/remove/:id`).delete(jwToken.isAuthorizedToken, socialMediaCtrl.remove);



    // Who we serve Management
    router.route(`/who-we-serve/add`).post(jwToken.isAuthorizedToken, serveCtrl.add);
    router.route(`/who-we-serve/update/:id`).post(jwToken.isAuthorizedToken, serveCtrl.update);
    router.route(`/who-we-serve`).post(jwToken.isAuthorizedToken, serveCtrl.getList);
    router.route(`/who-we-serve/:id`).get(jwToken.isAuthorizedToken, serveCtrl.getOne);
    router.route(`/who-we-serve/remove/:id`).delete(jwToken.isAuthorizedToken, serveCtrl.remove);

     // Email Template Management
     router.route(`/email-template/add`).post(jwToken.isAuthorizedToken, emailTempate.add);
     router.route(`/email-template/update/:id`).post(jwToken.isAuthorizedToken, emailTempate.update);
     router.route(`/email-template`).post(jwToken.isAuthorizedToken, emailTempate.getList);
     router.route(`/email-template/:id`).get(jwToken.isAuthorizedToken, emailTempate.getOne);
     router.route(`/email-template/remove/:id`).delete(jwToken.isAuthorizedToken, emailTempate.remove);


    // R&C Studies Route
    router.route(`/research-and-case-studies/add`).post(jwToken.isAuthorizedToken, reasearchAndCaseCtrl.add);
    router.route(`/research-and-case-studies/update/:id`).post(jwToken.isAuthorizedToken, reasearchAndCaseCtrl.update);
    router.route(`/research-and-case-studies`).post(jwToken.isAuthorizedToken, reasearchAndCaseCtrl.getList);
    router.route(`/research-and-case-studies/:id`).get(jwToken.isAuthorizedToken, reasearchAndCaseCtrl.getOne);
    router.route(`/research-and-case-studies/remove/:id`).delete(jwToken.isAuthorizedToken, reasearchAndCaseCtrl.remove);

    // R&C Studies Route
    router.route(`/blogs/add`).post(jwToken.isAuthorizedToken, blogsCtrl.add);
    router.route(`/blogs/update/:id`).post(jwToken.isAuthorizedToken, blogsCtrl.update);
    router.route(`/blogs`).post(jwToken.isAuthorizedToken, blogsCtrl.getList);
    router.route(`/blogs/:id`).get(jwToken.isAuthorizedToken, blogsCtrl.getOne);
    router.route(`/blogs/remove/:id`).delete(jwToken.isAuthorizedToken, blogsCtrl.remove);
    app.use('/admin', router);
};