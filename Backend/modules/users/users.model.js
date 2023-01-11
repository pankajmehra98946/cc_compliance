'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var crypto = require('crypto');

var UserSchema = new Schema({
  firstName: {
    type: String,
    required: 'Please enter first name.'
  },
  lastName: {
    type: String,
    required: 'Please enter last name '
  },
  email: {
    type: String,
    required: 'Please enter email'
  },
  profileImage: { type: String, default: "" },
  profileLogo: { type: String },
  salt: { type: String },
  phone: {
    type: String,
    required: 'Please enter phone number '
  },
  password: {
    type: String,
    required: 'Please enter password'
  },
  resetPassword: {
    token: { type: String, default: "" },
    expiry: { type: Date },
    otp: { type: Number },
    isExpired: { type: Boolean, default: false }
  },
  role: {
    type: [{
      type: String,
      enum: ['admin', 'clinic' , 'sub-clinic']
    }],
    default: ['clinic']
  },
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  subClinicId: { type: mongoose.Schema.Types.ObjectId, ref: "sub-clinics" },
  subscriptions: { type: mongoose.Schema.Types.ObjectId, ref: "subscriptions" },
  subscriptionsDetails: {
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "subscriptions" },
    expiry: { type: Date },
    isExpired: { type: Boolean, default: false }
  },
  multiFactorAuth:{
    otp: { type: String },
    expiry: { type: Date },
    count: { type: Number, default: 0 }
},
  assignedSubscriptions: [""],
  passwordTimeout: { type: Date },
  isActive: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
},
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

UserSchema.pre('save', function (next) {
  var user = this;
  user.salt = crypto.randomBytes(16).toString('hex');
  if (user.password != null) {
    user.password = crypto.pbkdf2Sync(user.password, this.salt, 1000, 64, 'sha512').toString('hex');
  }
  next();
});

UserSchema.index({ email: 1, role: 1 });
module.exports = mongoose.model('users', UserSchema);