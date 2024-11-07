const sql = require("mssql");

const config = {
  user: "sa",
  password: "magnus00", // Replace with your actual password
  server: "localhost",
  port: 1433,
  database: "PLCampaign",
  authentication: "integrated",
  rejectUnauthorized: false,
  encrypt: false,
};

module.exports = config;
