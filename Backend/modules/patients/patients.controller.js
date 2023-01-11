'use strict'
var ObjectId = require('mongoose').Types.ObjectId;
const patientsService = require('./patients.services');
const assignedPatientsService = require('../assign-patient-group/assignPatient.services');
const patientContentService = require('../patients-contents/patient-content.services');
const clinicService = require('../sub-clinics/subClinics.services');
const packageService = require('../packages/packages.services');
const userService = require('../users/users.services');
const categoryService = require('../categories/categories.services');
const pcpService = require('../pcp/pcp.services');
const mailer = require('../mailer/mailer');
var CONFIG = require('../../config/' + process.env.NODE_ENV);
var responseMessage = require('./patients.message');
var csvtojson = require('csvtojson');
var Patient = require('./patients.model');
var moment = require('moment')
var async = require('async');
var EmailServices = require('../emailTemplates/email.services');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const CommonService = require('../../services/common');
const SMSService = require('../twilio/twilio.service');
const ShortUrlService = require('..//url-shortner/shortUrl.service');


exports.getList = async (req, res) => {
    try {
        let queryObject = req.body ? req.body : {};
        let aggregateQuery = [];
        let query = queryObject.query || {};
        query["isDeleted"] = false;
        if (query._id) {
            query._id = ObjectId(query._id);
        }

        if (query.subClinicId) {
            query.subClinicId = ObjectId(query.subClinicId);
        } else {
            let clinicAggregateQuery = [];
            let clinicQueryObject = {};
            clinicQueryObject["isDeleted"] = false;
            clinicQueryObject["clinicId"] = ObjectId(req.token._id);
            clinicAggregateQuery.push({ $match: clinicQueryObject });
            clinicAggregateQuery.push({
                $project: {
                    "_id": 1,
                }
            })
            let getAllClinicsIds = await clinicService.get(clinicAggregateQuery);
            let subClinicIds = [];
            getAllClinicsIds.forEach(element => {
                subClinicIds.push(element._id)
            });
            query.subClinicId = { $in: subClinicIds }
        }

        if (queryObject.search) {
            let searchQuery = {
                $or: [
                    { name: { $regex: queryObject.search, $options: "i" } }
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
        let count = await patientsService.count(query);

        // aggregateQuery.push(
        //     { $lookup: { "from": "pcps", "localField": "pcp", "foreignField": "_id", "as": "pcpDetails" } },
        //         {
        //         $unwind: {
        //             path: '$pcpDetails'
        //         }
        //     },
        //     {
        //         $match: {
        //             'pcpDetails.isDeleted': false
        //         }
        //     }
        // );

        let data = await patientsService.get(aggregateQuery);

        // let encryptData = await CommonService.encrypt(data);

        return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: data, count: count });

    }
    catch (err) {
        return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
    }

};


exports.update = async (req, res) => {
    try {
        let id = req.params.id;
        if (!id) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }

        let conditions = { _id: ObjectId(id) }

        let patientDetails = await patientsService.getOne(conditions);

        if (!patientDetails) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.default_error, data: {} });
        }

        if (patientDetails.ssn != req.body.ssn) {
            let duplicateSSN = await patientsService.getOne({ subClinicId: req.body.subClinicId, ssn: req.body.ssn, isDeleted: false })
            if (duplicateSSN) {
                return res.json({ status: "Failure", code: 301, msg: responseMessage.message.already_exist, data: {} });
            }
        }

        if (patientDetails.recordNumber != req.body.recordNumber) {
            let duplicateMRN = await patientsService.getOne({ subClinicId: req.body.subClinicId, recordNumber: req.body.recordNumber, isDeleted: false })

            if (duplicateMRN) {
                return res.json({ status: "Failure", code: 301, msg: responseMessage.message.already_exist, data: {} });
            }
        }

        let data = await patientsService.update({ _id: id }, req.body);

        if (data && typeof data.log === 'function') {
            let logsData = {}
            if (data.isDeleted) {
                logsData = {
                    action: 'delete-patient',
                    createdBy: ObjectId(req.token._id),
                    message: 'Delete patient Data',
                    diff: {
                        before: patientDetails,
                        after: data,
                    }
                }
            } else {
                logsData = {
                    action: 'update-patient',
                    createdBy: ObjectId(req.token._id),
                    message: 'Updated patient Data',
                    diff: {
                        before: patientDetails,
                        after: data,
                    }
                }
            }
            data.log(logsData)
        }
        return res.json({ status: "Success", code: 200, msg: responseMessage.message.updated_success, data: data });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};


exports.add = async (req, res) => {
    try {
        var data = req.body ? req.body : {};

        console.log("data data data", data)
        let duplicateSSN = await patientsService.getOne({ subClinicId: req.body.subClinicId, ssn: req.body.ssn, isDeleted: false })

        if (duplicateSSN) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.already_exist, data: {} });
        }

        let duplicateMRN = await patientsService.getOne({ subClinicId: req.body.subClinicId, recordNumber: req.body.recordNumber, isDeleted: false })

        if (duplicateMRN) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.already_exist, data: {} });
        }

        let result = await patientsService.create(data)
        if (result && typeof result.log === 'function') {
            const logData = {
                action: 'add-patient',
                createdBy: ObjectId(req.token._id),
                message: 'Add patient Data',
                diff: {
                    before: null,
                    after: data
                }
            }
            result.log(logData)
        }
        return res.json({ status: "Success", code: 200, msg: responseMessage.message.added_success, data: result });

    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
}

exports.remove = async (req, res) => {
    try {
        let id = req.params.id;
        if (!id) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }
        let conditions = { _id: ObjectId(id) }
        let result = await patientsService.remove(conditions);
        if (result != null) {
            return res.json({ status: "Success", code: 200, msg: responseMessage.message.deleted_success, data: result });
        }
        return res.json({ status: "Failure", code: 301, msg: responseMessage.message.default_error, error: result });
    } catch (err) {
        return res.json({ status: "Failure", code: 301, msg: err.message });
    }
}

exports.getOne = async (req, res) => {
    try {
        let id = req.params.id;
        if (!id) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }
        let conditions = { _id: ObjectId(id), isDeleted: false }
        let result = await patientsService.getOne(conditions);

        let aggregate = [];
        let queryObj = { isDeleted: false }
        aggregate.push({ $match: queryObj });

        let patientGroup = await assignedPatientsService.get([
            { $match: { isDeleted: false, patientId: ObjectId(result._id) } },
            { $lookup: { "from": "patient-groups", "localField": "groupId", "foreignField": "_id", "as": "groupDetails" } },
            {
                $unwind: {
                    path: '$groupDetails'
                }
            },
            {
                $match: {
                    'groupDetails.isDeleted': false
                }
            },
            {
                $project: {
                    "_id": 0,
                    "groupDetails": '$groupDetails.groupName'
                }
            }
        ]);

        let pcpDetails = result && result.pcp ? await pcpService.getOne({ isDeleted: false, isActive: true, _id: ObjectId(result.pcp) }, { firstName: 1, lastName: 1 }) : null;

        if (result != null) {
            let patientDetails = JSON.parse(JSON.stringify(result));
            patientDetails.patientGroup = patientGroup;
            patientDetails.pcpDetails = pcpDetails;
            let encryptData = await CommonService.encrypt(patientDetails);
            // return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: patientDetails, patientGroup: patientGroup, pcpDetails: pcpDetails });
            return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: encryptData });
        }
        return res.json({ status: "Failure", code: 301, msg: responseMessage.message.default_error, error: result });
    } catch (err) {
        return res.json({ status: "Failure", code: 301, msg: err.message });
    }
}


exports.uploadCSV = async (req, res) => {
    try {

        let data = { ...req.body }

        if (!data.subClinicId) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.param_missing, data: {} });
        }

        let filePath = req.file.path
        var patientList = [];
        csvtojson().fromFile(filePath).then(async (source) => {
            for (var i = 0; i < source.length; i++) {

                var patientDetails = {
                    subClinicId: data.subClinicId,
                    name: source[i]['Name'],
                    email: source[i]['Email'],
                    phone: source[i]['Phone'],
                    ssn: parseInt(source[i]['SSN']),
                    recordNumber: source[i]['MRN'],
                    dob: moment(new Date(source[i]['DOB'])).format('MM/DD/YYYY'),
                    age: source[i]['Age'] ? source[i]['Age'] : moment().diff(new Date(source[i]['DOB']), 'years'),
                    gender: source[i]['Gender'] && source[i]['Gender'] == 'M' ? 'Male' : source[i]['Gender'] == 'F' ? 'Female' : '',
                    // pcp: source[i]['PCP'],
                    primaryLanguage: source[i]['Primary Language'],
                    race: source[i]['Race'],
                    ethnicity: source[i]['Ethnicity'],
                    lastPatientEncounterDate: source[i]['Last Patient Encounter Date'],
                    recordsRequestPending: source[i]['Records Request Pending'] && source[i]['Records Request Pending'] == 'Y' ? true : false,
                    lastPatientVisitDate: source[i]['Last Patient Visit Date'],
                    patientDiagnosis: source[i]['Chief Patient Diagnosis'],
                    overDueVaccinations: source[i]['Overdue Vaccinations'] && source[i]['Overdue Vaccinations'] == 'Y' || source[i]['Overdue Vaccinations'] == 'Yes' ? true : false,
                    LastMedicationOrderRenewalDate: source[i]['Last Medication Order/Renewal Date'],
                    // modulesSubscribed: source[i]['Modules Subscribed'],
                    patientScheduledAppointment: source[i]['Patient Scheduled Appointment through ACE'] && source[i]['Patient Scheduled Appointment through ACE'] == 'Y' ? true : false,
                    openReferrals: source[i]['Open Referrals'] && source[i]['Open Referrals'] == 'Y' ? true : false,
                    openVaccinations: source[i]['Open Vaccinations'] && source[i]['Open Vaccinations'] == 'Y' ? true : false,
                    psychographicSegmentation: source[i]['Psychographic Segmentation'] && source[i]['Psychographic Segmentation'] == 'Y' || source[i]['Psychographic Segmentation'] == 'Yes' ? true : false,
                    address: source[i]['Location'],
                    formattedAddress: source[i]['Location'],
                    optionalAddress: source[i]['optionalAddress'] ? source[i]['optionalAddress'] : '',
                    city: source[i]['City'],
                    state: source[i]['State'],
                    zipCode: source[i]['Zip Code'],
                    country: source[i]['Country']
                };

                // let checkDuplicateSSN = await patientsService.getOne({ subClinicId: ObjectId(data.subClinicId), ssn: patientDetails.ssn })
                let checkDuplicateMRN = await patientsService.getOne({ subClinicId: ObjectId(data.subClinicId), recordNumber: patientDetails.recordNumber, isDeleted: false })

                // if (!checkDuplicateSSN) {
                //     patientList.push(patientDetails);
                // }

                if (!checkDuplicateMRN) {
                    patientList.push(patientDetails);
                }
            }

            if (!patientList.length) {
                return res.json({ status: "Failure", code: 301, msg: responseMessage.message.duplicate_csv });
            }
            await Patient.insertMany(patientList, (err, result) => {
                if (err) {
                    return res.json({ status: "Failure", code: 301, msg: responseMessage.message.default_error, err: err });
                } else {
                    return res.json({ status: "Success", code: 200, msg: responseMessage.message.upload_success, data: result });
                }
            });
        });
    } catch (err) {
        if (err) {
            return res.json({ status: "Failure", code: 301, msg: err.message, err: err });
        }
    }
};


exports.sendPatientContent = async (req, res) => {
    try {
        var data = req.body ? req.body : {};
        var senderId = req.params.id ? req.params.id : req.token._id;

        if (data.subClinicUser) {
            let getClinicAdmin = await clinicService.getOne({ _id: ObjectId(data.subClinicUser), isDeleted: false }, { clinicId: 1 })
            senderId = getClinicAdmin ? getClinicAdmin.clinicId : req.token._id;
        }

        let patientArrayList = [];

        let categoryDetails = await categoryService.getOne({ _id: ObjectId(data.categoryId), isActive: true, isDeleted: false })

        let getPackageContent = await packageService.getOneWithPopulate({ _id: ObjectId(data.packageId), isActive: true, isDeleted: false })

        // Selected Patients
        if (data.patients && data.patients.length) {
            patientArrayList = [...data.patients]
        }

        // Patients From Group
        if (data.patientGroups && data.patientGroups.length) {
            let objectIdArray = data.patientGroups.map(e => ObjectId(e));
            let matchConditions = {
                groupId: { $in: objectIdArray }
            }
            let getGroupPatientsList = await assignedPatientsService.findWithPopulate(matchConditions)
            if (getGroupPatientsList && getGroupPatientsList.length) {
                getGroupPatientsList.forEach(element => {
                    if (element.patientId) {
                        patientArrayList.push(element.patientId)
                    }
                });
            }
        }

        // Remove Duplicate Function Using MRN
        let uniquePatients = [];
        patientArrayList.map(x => uniquePatients.filter(a => a.recordNumber == x.recordNumber).length > 0 ? null : uniquePatients.push(x));

        if (uniquePatients && !uniquePatients.length) {
            return res.json({ status: "Failure", code: 301, msg: responseMessage.message.default_error });
        }

        let clinicDetails = await userService.getOne({ _id: ObjectId(senderId) }, { profileLogo: 1, firstName: 1, lastName: 1 })

        async.eachSeries(uniquePatients, async function (element, outCb) {
            try {
                if (element.email) {
                
                    let savePatientContent = {
                        senderId: ObjectId(senderId),
                        patientId: ObjectId(element._id),
                        subClinicId: ObjectId(data.subClinicId),
                        packageId: ObjectId(data.packageId),
                        categoryId: ObjectId(data.categoryId),
                        reminder_at: new Date(moment(new Date(), "DD-MM-YYYY").add(7, 'days')).toISOString(),
                        expiryDetails: {
                            expiry: new Date(moment(new Date(), "DD-MM-YYYY").add(30, 'days')).toISOString()
                        },
                        content: {
                            details: getPackageContent.contents
                        }
                    }

                    if (getPackageContent && getPackageContent.contents && getPackageContent.contents.length && getPackageContent.contents.some((ele) => ele.contentType == "Pdf")) {
                        savePatientContent['isFotonovelAccessed'] = false;
                    }

                    if (getPackageContent && getPackageContent.contents && getPackageContent.contents.length && getPackageContent.contents.some((ele) => ele.contentType == "Video")) {
                        savePatientContent['isVideoAccessed'] = false;
                    }

                    if (getPackageContent && getPackageContent.contents && getPackageContent.contents.length && getPackageContent.contents.some((ele) => ele.contentType == "Survey")) {
                        savePatientContent['isSurveyAccessed'] = false;
                    }

                    let savedContentData = await patientContentService.create(savePatientContent)

                    if (savedContentData && savedContentData._id) {

                        var refUrl = CONFIG.PatientContentURL + `${element._id}/${data.packageId}/${savedContentData._id}`;

                        // Sending Email
                        if (element.textComplianceMethod == 'email' || element.textComplianceMethod == 'both' || !element.textComplianceMethod) {
                            var emailData = await EmailServices.getEmailTemplate('subscribe-content');
                            emailData.body = emailData.body.replace('{{Logo}}', `<a href="${CONFIG.WebEndPoint}"><img src="${CONFIG.WebEndPoint}/uploads/files/Image/${clinicDetails.profileLogo}"  width='150px' height='150px' style='margin: 0 auto' alt="Logo" /></a>`);
                            emailData.body = emailData.body.replace(new RegExp('{{clinicName}}', 'g'), `${clinicDetails.firstName} ${clinicDetails.lastName}`);
                            emailData.body = emailData.body.replace('{{contentName}}', `${categoryDetails.categoryName}`);
                            emailData.body = emailData.body.replace('{{patientName}}', element.name);
                            emailData.body = emailData.body.replace('{{refUrl}}', refUrl);
                            mailer.sendMail('', element.email, emailData.subject, emailData.body);
                        }

                        // Send SMS Via Twillio
                        if (element.phone ) {
                            var shortedUrl = await ShortUrlService.create({ fullUrl: `/patient-content/view/${element._id}/${data.packageId}/${savedContentData._id}`, contentId: ObjectId(savedContentData._id) });
                            var smsbody = `Hello this is ${clinicDetails.firstName} ${clinicDetails.lastName} clinic reaching out to you with ${categoryDetails.categoryName} material ${CONFIG.WebEndPoint}/mepa/${shortedUrl.shortUrl}`
                            if(element.textComplianceMethod == 'sms' || element.textComplianceMethod == 'both' || !element.textComplianceMethod ) {
                                SMSService.sendSMS(`${element.phone}`, smsbody)
                            }
                        }

                    }
                }
            } catch (err) {
                outCb(null);
            }
        }, function (err, results) {
            return res.json({ status: "Success", code: 200, msg: responseMessage.message.content_sent_success, data: data });
        });
    }
    catch (err) {
        return res.json({ status: "Failure", code: 301, msg: err.message });
    }
}


exports.groupedPatients = async (req, res) => {
    try {
        var data = req.body ? req.body : {};

        let patientArrayList = [];

        if (data.patientGroups && data.patientGroups.length) {
            let objectIdArray = data.patientGroups.map(e => ObjectId(e));
            let matchConditions = {
                groupId: { $in: objectIdArray }
            }
            let getGroupPatientsList = await assignedPatientsService.getAllWithPopulate(matchConditions)
            patientArrayList = getGroupPatientsList
        }

        return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: patientArrayList });

    }
    catch (err) {
        return res.json({ status: "Failure", code: 301, msg: err.message });
    }
}


exports.exportPatientsCsv = async (req, res) => {
    try {
        var data = req.body ? req.body : {};
        let filePath = "uploads/patients.csv";
        const csvWriter = createCsvWriter({
            path: `public/${filePath}`,
            header: [
                { id: 'recordNumber', title: 'MRN' },
                { id: 'ssn', title: 'SSN' },
                { id: 'name', title: 'Name' },
                { id: 'dob', title: 'DOB' },
                { id: 'email', title: 'Email' },
                { id: 'phone', title: 'Phone' },
                { id: 'age', title: 'Age' },
                { id: 'gender', title: 'Gender' },
                { id: 'address', title: 'Location' },
                { id: 'city', title: 'City' },
                { id: 'state', title: 'State' },
                { id: 'country', title: 'Country' },
                { id: 'zipCode', title: 'ZipCode' },
                { id: 'primaryLanguage', title: 'Primary Language' },
                { id: 'race', title: 'Race' },
                { id: 'ethnicity', title: 'Ethnicity' }
            ]
        });

        csvWriter.writeRecords(data)
            .then(() => {
                return res.json({ status: "Success", code: 200, msg: responseMessage.message.found_success, data: filePath });
            });
    }
    catch (err) {
        return res.json({ status: "Failure", code: 301, msg: err.message });
    }
}
