const winston = require("winston");
const path = require("path");

// Ensure logs directory exists or let winston handle it (winston file transport handles it usually if dir exists, 
// but good practice to ensure. Here we just rely on the transport)

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: path.join(__dirname, "../logs/app.log") }),
  ],
});

module.exports = logger;
