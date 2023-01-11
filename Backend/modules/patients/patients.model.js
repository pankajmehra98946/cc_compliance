var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const LogSchema = require('../../modules/audit-logs/logs')

var Patientschema = new Schema({
    subClinicId: { type: mongoose.Schema.Types.ObjectId, ref: "sub-clinics" },
    name: { type: String, required: "Name is required" },
    email: { type: String, required: "Email is required" },
    phone: { type: String, required: "Phone is required"  },
    ssn: { type: String },
    recordNumber: { type: String, required: "Record number is required" },
    pcp: { type: mongoose.Schema.Types.ObjectId, ref: "pcps" },
    textComplianceMethod: { type: String , default : 'both'},
    // pcp: { type: String },
    age: { type: Number, required: "Age is required" },
    dob: { type: String, required: "Dob is required" },
    gender: { type: String },
    primaryLanguage: { type: String, required: "Primary language is required" },
    ethnicity: { type: String, required: "Ethnicity is required" },
    race: { type: String, required: "Race is required" },
    lastPatientEncounterDate: { type: Date },
    recordsRequestPending: { type: Boolean, default: false },
    lastPatientVisitDate: { type: Date },
    location: { type: String },
    patientDiagnosis: { type: String },
    overDueVaccinations: { type: Boolean, default: false },
    LastMedicationOrderRenewalDate: { type: Date },
    // modulesSubscribed: { type: String },
    patientScheduledAppointment: { type: Boolean, default: false },
    openReferrals: { type: Boolean, default: false },
    openVaccinations: { type: Boolean, default: false },
    psychographicSegmentation: { type: Boolean, default: false },
    address: { type: String, required: "Address is required" },
    formattedAddress: { type: String },
    optionalAddress: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

Patientschema.methods.log = function (data)  {
    return LogSchema.create(data)
  }

Patientschema.index({ email: 1 });
module.exports = mongoose.model('patients', Patientschema);




