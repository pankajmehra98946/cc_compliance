const commonService = require('../services/common')


module.exports.isSuperAdmin = (req, res, next) => {
    if (req.token && req.token.role && req.token.role.includes("admin") ) {
        return next();
    } else {
        return res.json({ status: "Failure", code: 401, msg: 'Not Authenticated' });
    }
};

module.exports.decrypt = async (req, res, next) => {
    let decryptedData = await commonService.decrypt(req.body.encryptedData)
    req.body = decryptedData
    next()
};