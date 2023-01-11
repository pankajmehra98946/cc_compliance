
var jwt = require('jsonwebtoken');
var {jwtSecretCode} = require('./jwt');

module.exports.issueToken = (payload) => {
  return jwt.sign(
    payload,
    jwtSecretCode.secret, 
    {
      expiresIn: '7d',
    }
  );
};


function verifyToken (token, callback) {
  return jwt.verify(
    token, 
    jwtSecretCode.secret,
    {}, 
    callback 
  );
};

module.exports.isAuthorizedToken = (req, res, next) => {
    var token;
    if (req.headers && req.headers.authorization) {
      token = req.headers.authorization;
      let tokenData = token.split(' ');
      if(tokenData.length !=2 || tokenData[0]!="Bearer"){
        return res.json({ status: "Failure", code: 401, msg: 'Invalid token found' });
      }
      token = tokenData[1];
    }else {
      return res.json({ status: "Failure", code: 401, msg: 'No Authorization header was found' });
    }
   
    verifyToken(token, function (err, token) {
      if (err) {
        return res.json({ status: "Failure", code: 401, msg: 'Invalid Token!' });
      }
      req.token = token;
      next();
    });
};