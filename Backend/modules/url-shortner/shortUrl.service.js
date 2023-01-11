
const Model = require('./shortUrl.js');

exports.create = body => new Promise((resolve, reject) => {
    Model.create(body, (err, data) => {
      if (err) {
        return reject(err);
      } else {
        resolve(data);
      }
    });
  });
  
  exports.getOne = (conditions, projection = {}) => new Promise((resolve, reject) => {
    Model.findOne(conditions, projection, (err, data) => {
      if (err) {
        return reject(err);
      } else {
        resolve(data);
      }
    });
  });