const MODEL = require('./patients.model');

exports.create = body => new Promise((resolve, reject) => {
  MODEL.create(body, (err, data) => {
    if (err) {
      return reject(err);
    } else {
      resolve(data);
    }
  });
});
exports.getOne = (conditions, projection = {}) => new Promise((resolve, reject) => {
  MODEL.findOne(conditions, projection, (err, data) => {
    if (err) {
      return reject(err);
    } else {
      resolve(data);
    }
  });
});

exports.update = (conditions = {}, set = {}, options = { new: true }) => new Promise((resolve, reject) => {
  MODEL.findOneAndUpdate(conditions, set, options)
    .exec((err, data) => {
      if (err) {
        return reject(err);
      } else {
        resolve(data);
      }
    });
});


exports.get = (aggregate) => new Promise((resolve, reject) => {
  MODEL.aggregate(aggregate)
    .exec((err, data) => {
      if (err) {
        return reject(err);
      } else {
        resolve(data);
      }
    });
});
exports.count = (query) => new Promise((resolve, reject) => {
  MODEL.countDocuments(query)
    .then(count => {
      resolve(count);
    })
    .catch(err => {
      reject(err);
    })
});

exports.remove = (conditions, projection = {}) => new Promise((resolve, reject) => {
  MODEL.findOneAndRemove(conditions, projection, (err, data) => {
    if (err) {
      return reject(err);
    } else {
      resolve(data);
    }
  });
});



exports.find = (conditions, projection = {}) => new Promise((resolve, reject) => {
  MODEL.find(conditions, projection)
    .exec((err, data) => {
      if (err) {
        return reject(err);
      } else {
        resolve(data);
      }
    });
});


exports.updateWithLogs = ( USER ) => new Promise((resolve, reject) => {
  USER.save()
    .exec((err, data) => {
      if (err) {
        return reject(err);
      } else {
        resolve(data);
      }
    });
});
