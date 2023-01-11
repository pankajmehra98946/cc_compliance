var CryptoJS = require("crypto-js");
var ObjectId = require('mongoose').Types.ObjectId;
const CONFIG = require('../config/'+process.env.NODE_ENV);

var encrypt = (data) => new Promise(async (resolve, reject) => {
    password = CONFIG.dataEncryptionKey;
    if (!data) reject(false);
    var iv = CryptoJS.lib.WordArray.random(128 / 8);
    var salt = CryptoJS.lib.WordArray.random(128 / 8);
    var encryptedData = CryptoJS.AES.encrypt(JSON.stringify(data), password);
    var transitmessage = salt.toString() + iv.toString() + encryptedData.toString();
    return resolve(transitmessage);
});

var decrypt = async (data) => new Promise(async (resolve, reject) => {
    if (!data) reject(false);
    var encrypted = data.substring(64);
    var decrypted = CryptoJS.AES.decrypt(encrypted, CONFIG.dataEncryptionKey)
    decrypted = decrypted.toString(CryptoJS.enc.Utf8)
    res = JSON.parse(decrypted);
    return resolve(res);;

});

var encryptUser = async (user) => new Promise(async (resolve, reject) => {
    let personalInfo = {
        name: user.name,
        email: user.email,
        ssn: user.ssn,
        recordNumber: user.recordNumber,
        pcp: user.pcp,
        age: user.age,
        dob: user.dob,
        gender: user.gender
    };
    user.personalInfo = await encrypt(personalInfo);
    user = deletePersonalInfo(user);
    resolve(user);
});

const deletePersonalInfo = (profile) => {
    delete profile.name;
    delete profile.email;
    delete profile.ssn;
    delete profile.recordNumber;
    delete profile.pcp;
    delete profile.gender;
    delete profile.age;
    delete profile.dob;
    return profile;
}

const encryptPersonalInfo = (data) => new Promise(async (resolve, reject) => {
    if (!data) {
        if (data.length) {
            await data.forEach(async (profile, i) => {
                if (profile) { await encryptUser(profile); }
            });
            return resolve(data);
        } else {
            if (data) {
                await encryptUser(data);
            }
            return resolve(data);
        }
    } else {
        resolve(data);
    }
});

exports.bindQuery = function bindQuery(queryObject, defultSortBy = '_id') {
    let aggregateQuery = [];
    let query = queryObject.query || {};
    query["isDeleted"] = false;
    if (query._id) {
        query._id = ObjectId(query._id);
    }
    aggregateQuery.push({ $match: query });
    if (queryObject.sortField) {
        let sortField = "$" + queryObject.sortField;
        aggregateQuery.push({ $addFields: { sortField: { $toLower: sortField } } });
        let sortOrder = queryObject.sortOrder ? Number(queryObject.sortOrder) : -1;
        aggregateQuery.push({ $sort: { sortField: sortOrder } });
    }
    else {
        let sort = {};
        sort[defultSortBy] = 1;
        aggregateQuery.push({ $sort: sort });
    }
    if (queryObject.offSet && queryObject.limit) {
        let offSet = Number(queryObject.offSet);
        let limit = Number(queryObject.limit);
        let skip = (Number(offSet) - 1) * queryObject.limit;
        aggregateQuery.push({ $skip: skip });
        aggregateQuery.push({ $limit: limit });
    }

    return aggregateQuery;
}

exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.encryptPersonalInfo = encryptPersonalInfo;
exports.encryptUser = encryptUser;
