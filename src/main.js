const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();
const nodemailer = require("nodemailer");
const fs = require("fs");
const databaseConfig = require("./database.js");
const sql = require("mssql");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Set up the SQLite database
// const dbPath = path.join(__dirname, "database.sqlite");
// const db = new sqlite3.Database(dbPath, (err) => {
//   if (err) {
//     console.error("Error opening database:", err);
//   } else {
//     console.log("Database connected.");
//     // Create tables for recipients and logs
//     db.run(`
//       CREATE TABLE IF NOT EXISTS recipients (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         email TEXT
//       )
//     `);

//     db.run(`
//       CREATE TABLE IF NOT EXISTS logs (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         recipient_id INTEGER,
//         status TEXT,
//         message TEXT,
//         timestamp TEXT,
//         FOREIGN KEY (recipient_id) REFERENCES recipients(id)
//       )
//     `);
//   }
// });

// Create an email transporter (for example, using Gmail SMTP)

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "r.awais@pionlog.com",
    pass: "xlxn nbnc esbc aefn",
  },
});

//Fetch Templates
ipcMain.handle("fetch-templates", async () => {
  try {
    const pool = await sql.connect(databaseConfig);
    const result = await pool.request().query(`SELECT * FROM email_templates`);
    return result;
  } catch (error) {
    console.error("Error fetching data:", error);
    return error;
  }
});

//Fetch Recipients
ipcMain.handle("fetch-recipients", async () => {
  try {
    const pool = await sql.connect(databaseConfig);
    const result = await pool.request().query(`SELECT * FROM email_recipients`);
    return result;
  } catch (error) {
    console.error("Error fetching data:", error);
    return error;
  }
});

//fetch senders
ipcMain.handle("fetch-senders", async () => {
  try {
    const pool = await sql.connect(databaseConfig);
    const result = await pool.request().query(`SELECT * FROM email_senders`);
    return result;
  } catch (error) {
    console.error("Error fetching data:", error);
    return error;
  }
});

//Fetch email jobs
//fetch senders
ipcMain.handle("fetch-email-jobs", async () => {
  try {
    const pool = await sql.connect(databaseConfig);
    const result = await pool.request().query(`  
SELECT 
    jobs.ID,  
    jobs.Job_Name,
    
    -- Sender details
    senders.Email_Sender_Id AS SenderID,
    senders.Email AS SenderEmail,
    senders.FirstName AS SenderName,
    
    -- Template details
    templates.Email_Template_Id AS TemplateID,
    templates.Template_Name,
    templates.Template_Body,
    
    -- Job additional columns
    jobs.Add_Who,
    jobs.Add_Date,
    jobs.Edit_Who,
    jobs.Edit_Date,
    jobs.active
FROM 
    email_jobs AS jobs
LEFT JOIN 
    email_senders AS senders ON jobs.Email_Sender_Id = senders.Email_Sender_Id
LEFT JOIN 
    email_templates AS templates ON jobs.Email_Template_Id = templates.Email_Template_Id;
`);

    console.log("Fetched jobs with details:", result.recordset);
    return result;
  } catch (error) {
    console.error("Error fetching jobs with details:", error);
    return { success: false, error: error.message };
  }
});

// Add Jobs
ipcMain.handle("add-job", async (event, jobData) => {
  const { jobName, emailSenderId, emailTemplateId, recipients } = jobData;
  console.log(jobData, "job Data ");

  try {
    const pool = await sql.connect(databaseConfig);
    // Start a transaction for consistency
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Step 1: Insert job and retrieve job ID
    const jobResult = await transaction
      .request()
      .input("Job_Name", sql.VarChar(100), jobName)
      .input("Email_Sender_Id", sql.Int, emailSenderId)
      .input("Email_Template_Id", sql.Int, emailTemplateId).query(`
        INSERT INTO email_jobs (Job_Name, Email_Sender_Id, Email_Template_Id)
        VALUES (@Job_Name, @Email_Sender_Id, @Email_Template_Id);

        SELECT SCOPE_IDENTITY() AS ID;
      `);

    const jobId = jobResult.recordset[0].ID; // Job ID from the insertion

    // Step 2: Insert recipients into job_recipients table using the job ID
    for (const recipientId of recipients) {
      await transaction
        .request()
        .input("Email_Job_ID", sql.Int, jobId)
        .input("Recipient_ID", sql.Int, recipientId).query(`
          INSERT INTO job_recipients (Email_Job_ID, Recipient_ID)
          VALUES (@Email_Job_ID, @Recipient_ID);
        `);
    }

    // Commit the transaction after successful inserts
    await transaction.commit();

    console.log("Job and recipients added successfully.");
    return { jobId, success: true };
  } catch (error) {
    console.error("Error adding job and recipients:", error);
    return { success: false, error: error.message };
  }
});

//View job recipients
ipcMain.handle("fetch-job-recipients", async (event, jobId) => {
  try {
    console.log("Received jobId:", jobId); // Log jobId to check what is being passed

    // Validate and parse jobId
    if (!jobId || isNaN(jobId)) {
      throw new Error(`Invalid jobId: not a number. Received: ${jobId}`);
    }

    const parsedJobId = parseInt(jobId, 10);
    const pool = await sql.connect(databaseConfig);

    const result = await pool
      .request()
      .input("Email_Job_Id", sql.Int, parsedJobId).query(`
        SELECT 
          recipients.Email_Recipient_ID,
          recipients.Email,
          recipients.First_Name,
          recipients.Last_Name
        FROM 
          job_recipients AS job_rec
        JOIN 
          email_recipients AS recipients 
          ON job_rec.Recipient_Id = recipients.Email_Recipient_ID
        WHERE 
          job_rec.Email_Job_Id = @Email_Job_Id;
      `);

    return result.recordset; // Returns an array of recipients
  } catch (error) {
    console.error("Error fetching job recipients:", error);
    return { success: false, message: error.message }; // Improved error handling
  }
});

//ADD Job Logs in to history table

ipcMain.handle("log-job-run", async (event, jobId) => {
  try {
    const pool = await sql.connect(databaseConfig);

    // Fetch job details
    const jobResult = await pool.request().input("Job_Id", sql.Int, jobId)
      .query(`
        SELECT 
          jobs.ID AS JobID,
          jobs.Job_Name,
          senders.Email AS SenderEmail,
          templates.Template_Body,
          recipients.First_Name,
          recipients.Last_Name,
          recipients.Email AS RecipientEmail
        FROM 
          email_jobs AS jobs
        JOIN 
          email_senders AS senders ON jobs.Email_Sender_Id = senders.Email_Sender_Id
        JOIN 
          email_templates AS templates ON jobs.Email_Template_Id = templates.Email_Template_Id
        JOIN 
          job_recipients AS job_rec ON jobs.ID = job_rec.Email_Job_Id
        JOIN 
          email_recipients AS recipients ON job_rec.Recipient_Id = recipients.Email_Recipient_ID
        WHERE 
          jobs.ID = @Job_Id
      `);

    if (jobResult.recordset.length === 0) {
      throw new Error("Job not found");
    }

    const jobDetails = jobResult.recordset;
    const templateBody = jobDetails[0].Template_Body;

    // Loop through each recipient and send an email
    for (const recipient of jobDetails) {
      const personalizedBody = templateBody.replace(
        /{recipient_name}|{lead.company}/g,
        (matched) => {
          // console.log.apply(recipient, "company is here");
          if (matched === "{recipient_name}")
            return `${recipient.First_Name} ${recipient.Last_Name}`;
          if (matched === "{lead.company}") return `${recipient.Company}`;
          return matched; // In case there are other unmatched placeholders
        }
      ); // Replace with actual recipient name
      const mailOptions = {
        from: jobDetails[0].SenderEmail,
        to: recipient.RecipientEmail,
        subject: jobDetails[0].Job_Name,
        text: personalizedBody,
      };

      await transporter.sendMail(mailOptions);

      // Insert log entry for each recipient
      await pool
        .request()
        .input("Email_Job_Id", sql.Int, jobDetails[0].JobID)
        .input("Executed_Date", sql.DateTime, new Date())
        .input(
          "Email_Job_Logs",
          sql.VarChar(sql.MAX),
          JSON.stringify({
            Job_Name: jobDetails[0].Job_Name,
            Recipient: recipient.Email,
            Status: "Email Sent",
          })
        ).query(`
          INSERT INTO email_job_history_logs (Email_Job_Id, Executed_Date, Email_Job_Logs)
          VALUES (@Email_Job_Id, @Executed_Date, @Email_Job_Logs)
        `);
    }

    console.log("Emails sent and logs added successfully");
    return { success: true };
  } catch (error) {
    console.error("Error running job:", error);
    return { success: false, error: error.message };
  }
});

// Fetch logs from the database

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
    },
    autoHideMenuBar: false,
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

////////////////////////////////////////////////

// const { app, BrowserWindow, ipcMain } = require("electron");
// const path = require("node:path");
// const sqlite3 = require("sqlite3").verbose();
// const nodemailer = require("nodemailer");

// // Database setup
// const dbPath = path.join(__dirname, "emailLogs.db");
// const db = new sqlite3.Database(dbPath, (err) => {
//   if (err) {
//     console.error("Database error:", err);
//   } else {
//     console.log("Connected to SQLite database");
//     db.run(
//       `CREATE TABLE IF NOT EXISTS email_logs (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         sender TEXT,
//         recipients TEXT,
//         template TEXT,
//         timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
//       )`
//     );
//   }
// });

// // Email senders and recipients (predefined)
// const senders = [
//   { id: 1, email: "r.awais@pionlog.com", password: "xlxn nbnc esbc aefn" },
//   { id: 2, email: "sender2@example.com", password: "app_password_2" },
// ];

// const recipients = [
//   { id: 1, email: "recipient1@example.com" },
//   { id: 2, email: "recipient2@example.com" },
//   { id: 3, email: "recipient3@example.com" },
//   { id: 4, email: "recipient4@example.com" },
//   // Add more recipients as needed (up to 10)
// ];

// const templates = [
//   { id: 1, name: "Template 1", body: "This is the content of Template 1." },
//   { id: 2, name: "Template 2", body: "Content of Template 2." },
//   { id: 3, name: "Template 3", body: "Follow-up content in Template 3." },
//   { id: 4, name: "Template 4", body: "Last template's content." },
// ];

// // Create the main window
// const createWindow = () => {
//   const mainWindow = new BrowserWindow({
//     width: 800,
//     height: 600,
//     webPreferences: {
//       preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
//       nodeIntegration: true,
//       contextIsolation: false,
//     },
//     autoHideMenuBar: true,
//   });

//   mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
// };

// app.whenReady().then(() => {
//   createWindow();

//   app.on("activate", () => {
//     if (BrowserWindow.getAllWindows().length === 0) {
//       createWindow();
//     }
//   });
// });

// app.on("window-all-closed", () => {
//   if (process.platform !== "darwin") {
//     app.quit();
//   }
// });

// // IPC Handlers for fetching data
// ipcMain.handle("get-senders", async () => senders);
// ipcMain.handle("get-recipients", async () => recipients);
// ipcMain.handle("get-templates", async () => templates);

// // IPC Handler for sending email
// ipcMain.handle(
//   "send-email",
//   async (event, { senderId, recipients, templateId }) => {
//     const sender = senders.find((s) => s.id === senderId);
//     const template = templates.find((t) => t.id === templateId);

//     if (!sender || !template || recipients.length === 0) {
//       return {
//         success: false,
//         message: "Invalid sender, recipients, or template.",
//       };
//     }

//     try {
//       let transporter = nodemailer.createTransport({
//         service: "gmail",
//         auth: {
//           user: sender.email,
//           pass: sender.password, // Use app-specific passwords
//         },
//       });

//       let info = await transporter.sendMail({
//         from: sender.email,
//         to: recipients.join(", "),
//         subject: "Email from Template",
//         text: template.body,
//       });

//       // Log the email to the database
//       db.run(
//         `INSERT INTO email_logs (sender, recipients, template) VALUES (?, ?, ?)`,
//         [sender.email, recipients.join(", "), template.name],
//         function (err) {
//           if (err) {
//             console.error("Failed to log email:", err);
//           }
//         }
//       );

//       return { success: true, message: "Email sent successfully!" };
//     } catch (error) {
//       console.error("Failed to send email:", error);
//       return { success: false, message: error.message };
//     }
//   }
// );

////////////////////////////////////////////////////////////////////////
// const { app, BrowserWindow, ipcMain } = require("electron");
// const path = require("path");
// const sqlite3 = require("sqlite3").verbose();
// const nodemailer = require("nodemailer");
// const csvParser = require("csv-parser");
// const fs = require("fs");

// // Database setup
// const dbPath = path.join(__dirname, "emailLogs.db");
// const db = new sqlite3.Database(dbPath, (err) => {
//   if (err) {
//     console.error("Database error:", err);
//   } else {
//     console.log("Connected to SQLite database");
//     db.run(
//       `CREATE TABLE IF NOT EXISTS email_logs (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         sender TEXT,
//         recipients TEXT,
//         template TEXT,
//         timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
//       )`
//     );
//     db.run(
//       `CREATE TABLE IF NOT EXISTS recipients (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         first_name TEXT,
//         last_name TEXT,
//         email TEXT,
//         document_name TEXT
//       )`,
//       (err) => {
//         if (err) {
//           console.error("Error creating recipients table:", err);
//         } else {
//           console.log("Recipients table is ready.");
//         }
//       }
//     );
//   }
// });

// // Email senders and recipients (predefined)

// // Create the main window
// const createWindow = () => {
//   const mainWindow = new BrowserWindow({
//     width: 800,
//     height: 600,
//     webPreferences: {
//       preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY, // Ensure correct preload path
//       nodeIntegration: true,
//       // contextIsolation: true,
//     },
//     // autoHideMenuBar: true,
//   });

//   mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
// };

// app.whenReady().then(() => {
//   createWindow();

//   app.on("activate", () => {
//     if (BrowserWindow.getAllWindows().length === 0) {
//       createWindow();
//     }
//   });
// });

// app.on("window-all-closed", () => {
//   if (process.platform !== "darwin") {
//     app.quit();
//   }
// });

//upload csv
// ipcMain.handle(
//   "upload-csv",
//   async (event, { first_name, last_name, email, document_name }) => {
//     try {
//       const recipients = [];

//       await csvParser(csvData, { columns: true })
//         .on("data", (row) => {
//           recipients.push(row);
//         })
//         .on("end", async () => {
//           await insertRecipients(recipients);
//           return "CSV processed and data inserted into database";
//         })
//         .on("error", (err) => {
//           console.error("Error parsing CSV:", err);
//           // Handle errors appropriately
//         });
//     } catch (err) {
//       console.error("Error handling CSV upload:", err);
//       // Handle general errors
//     }
//   }
// );

// async function insertRecipients(recipients) {
//   console.log("Inserting recipients", recipients);
//   for (const recipient of recipients) {
//     db.run(
//       `INSERT INTO recipients (first_name, last_name, email, document_name) VALUES (?, ?, ?, ?)`,
//       [
//         recipient.first_name,
//         recipient.last_name,
//         recipient.email,
//         recipient.document_name,
//       ],
//       (err) => {
//         if (err) {
//           console.error("Error inserting recipient data:", err);
//         }
//       }
//     );
//   }
// }

//Email send
// ipcMain.handle(
//   "send-email",
//   async (event, { senders, templates, recipients, senderId, templateId }) => {
//     const sender = senders.find((s) => s.id === senderId);

//     const template = templates.find((t) => t.id === templateId);

//     if (!sender || !template || recipients.length === 0) {
//       return {
//         success: false,
//         message: "Invalid sender, recipients, or template.",
//       };
//     }

//     try {
//       let transporter = nodemailer.createTransport({
//         service: "gmail",
//         auth: {
//           user: sender.email,
//           pass: sender.password,
//         },
//       });
//       // Add delay between sends

//       let info = await transporter.sendMail({
//         from: sender.email,
//         to: recipients.join(", "), // Send to one recipient at a time
//         subject: "Email from Template",
//         text: template.body,
//       });

//       // Log the email to the database
//       db.run(
//         `INSERT INTO email_logs (sender, recipients, template) VALUES (?, ?, ?)`,
//         [sender.email, recipients.join(", "), template.name],
//         function (err) {
//           if (err) {
//             console.error("Failed to log email:", err);
//           }
//         }
//       );

//       return { success: true, message: "Email sent successfully!" };
//     } catch (error) {
//       console.error("Failed to send email:", error);
//       return { success: false, message: error.message };
//     }
//   }
// );

// ipcMain.handle(
//   "send-email",
//   async ({ senders, templates, recipients, senderId, templateId }) => {
//     const sender = senders.find((s) => s.id === senderId);
//     const template = templates.find((t) => t.id === templateId);

//     if (!sender || !template || recipients.length === 0) {
//       return {
//         success: false,
//         message: "Invalid sender, recipients, or template.",
//       };
//     }

//     try {
//       let transporter = nodemailer.createTransport({
//         service: "gmail",
//         auth: {
//           user: sender.email,
//           pass: sender.password, // Use app-specific passwords
//         },
//       });

//       let info = await transporter.sendMail({
//         from: sender.email,
//         to: recipients.join(", "),
//         subject: "Email from Template",
//         text: template.body,
//       });

//       // Log the email to the database
//       db.run(
//         `INSERT INTO email_logs (sender, recipients, template) VALUES (?, ?, ?)`,
//         [sender.email, recipients.join(", "), template.name],
//         function (err) {
//           if (err) {
//             console.error("Failed to log email:", err);
//           }
//         }
//       );

//       return { success: true, message: "Email sent successfully!" };
//     } catch (error) {
//       console.error("Failed to send email:", error);
//       return { success: false, message: error.message };
//     }
//   }
// );

//for file uploader
// Parse CSV and insert into database

//get recipients information
// ipcMain.handle("get-recipients-from-db", async () => {
//   console.log("recipients information");
//   return new Promise((resolve, reject) => {
//     db.all(`SELECT * FROM recipients`, (err, rows) => {
//       console.log("recipients information", rows);
//       if (err) {
//         reject("Error fetching recipients");
//       } else {
//         resolve(rows); // Return the rows containing recipient data
//       }
//     });
//   });
// });
