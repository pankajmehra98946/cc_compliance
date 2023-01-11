const mongoose = require('mongoose');
const shortId = require('shortid')

var shortUrlSchema = new mongoose.Schema({
    
    // clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    // subClinicId: { type: mongoose.Schema.Types.ObjectId, ref: "sub-clinics" },
    // patientId: { type: mongoose.Schema.Types.ObjectId, ref: "patients" },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: "patient-contents" },
    fullUrl: { type: String, required: true },
    shortUrl: { type: String, required: true  , default : shortId.generate },
    clicks: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
},
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('ShortUrl', shortUrlSchema);