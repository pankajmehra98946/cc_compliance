'use strict'


module.exports = function (app, express) {


  var patientsCtrl = require('./patients.controller');
  var router = express.Router();
  var jwToken = require('../../common/jwToken');

  var middleware = require('../../common/middleware');

  var multer = require('multer');

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads/csv')
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname )
    }
  })

  const upload = multer({ storage: storage })

  router.route('/').post(jwToken.isAuthorizedToken, patientsCtrl.getList);
  router.route('/register').post(jwToken.isAuthorizedToken,middleware.decrypt,patientsCtrl.add);
  router.route('/:id').get(patientsCtrl.getOne);
  router.route('/remove/:id').get(jwToken.isAuthorizedToken, patientsCtrl.remove);
  router.route('/update/:id').post(jwToken.isAuthorizedToken,middleware.decrypt, patientsCtrl.update);
  // router.route('/update2/:id').post(jwToken.isAuthorizedToken, patientsCtrl.updateUser);

  router.route(`/uploads/upload-csv`).post(upload.single('file'),patientsCtrl.uploadCSV);

  router.route('/send-patient-content').post(jwToken.isAuthorizedToken, patientsCtrl.sendPatientContent);

  router.route('/grouped-Patients').post(jwToken.isAuthorizedToken, patientsCtrl.groupedPatients);

  router.route('/export-patients-csv').post(jwToken.isAuthorizedToken, patientsCtrl.exportPatientsCsv);

  app.use('/patients', router);
};