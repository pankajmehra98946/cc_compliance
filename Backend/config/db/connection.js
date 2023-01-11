var mongoose = require('mongoose');
var config = require('../'+process.env.NODE_ENV);

const { AUTH, DATABASE, HOST, USERNAME, PASSWORD, PORT } = config.DB;
const defaultUrl = AUTH
  ? `mongodb://${USERNAME}:${encodeURIComponent(PASSWORD)}@${HOST}:${PORT}/${DATABASE}`
  : `mongodb://${HOST}:${PORT}/${DATABASE}`;

  console.log('DATABASE:',DATABASE);
  console.log('HOST:',HOST);

// Connected Database URI

//Export database connection
exports.connection = async (url = '') => {
  let MONGO_URL = url ? url : defaultUrl;
  console.log(MONGO_URL)
  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      //useCreateIndex: true,
      //useFindAndModify: false,
      autoIndex: false, // Don't build indexes
      //poolSize: 50, // Maintain up to 10 socket connections
      // auto_reconnect: true,
    });
  } catch (err) {
    console.log(`Database not connected!= ${err} `);
  }
};

exports.disconnect = async () => await mongoose.connection.close();
exports.connectDB = async () => await mongoose.connection.db.databaseName;


