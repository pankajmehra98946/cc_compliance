const USERS = require('./users.model');

exports.create = body => new Promise((resolve, reject) => {
  USERS.create(body, (err, data) => {
    if (err) {
      return reject(err);
    } else {
      resolve(data);
    }
  });
});

exports.getOne = (conditions, projection = {}) => new Promise((resolve, reject) => {
  USERS.findOne(conditions, projection, (err, data) => {
    if (err) {
      return reject(err);
    } else {
      resolve(data);
    }
  });
});

exports.update = (conditions = {}, set = {}, options = { new: true }) => new Promise((resolve, reject) => {
  USERS.findOneAndUpdate(conditions, set, options)
    .exec((err, data) => {
      if (err) {
        return reject(err);
      } else {
        resolve(data);
      }
    });
});

exports.get = (aggregate) => new Promise((resolve, reject) => {
  USERS.aggregate(aggregate)
    .exec((err, data) => {
      if (err) {
        return reject(err);
      } else {
        resolve(data);
      }
    });
});

exports.count = (query) => new Promise((resolve, reject) => {
  USERS.countDocuments(query)
    .then(count => {
      resolve(count);
    })
    .catch(err => {
      reject(err);
    })
});

exports.remove = (conditions, projection = {}) => new Promise((resolve, reject) => {
  USERS.findOneAndRemove(conditions, projection, (err, data) => {
    if (err) {
      return reject(err);
    } else {
      resolve(data);
    }
  });
});

exports.findAll = (conditions, projection = {}) => new Promise((resolve, reject) => {
  USERS.find(conditions, projection, (err, data) => {
    if (err) {
      return reject(err);
    } else {
      resolve(data);
    }
  });
});


exports.editProfile = (conditions = {}, set = {}, options = { new: true }, select = {}) => new Promise((resolve, reject) => {
  USERS.findOneAndUpdate(conditions, set, options)
    .lean()
    .exec((err, user) => {
      if (err) {
        return reject(err);
      } else {
        resolve(user);
      }
    });
});


exports.updateMany = (conditions, set, options = {multi: true }) => new Promise((resolve, reject) => {
  USERS.updateMany(conditions, set, options)
    .then(data => {
      resolve(data);
    })
    .catch(err => {
      reject(err);
    })
})