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

//View executed data for specific job

ipcMain.handle("fetchJobHistory", async (event, jobId) => {
  try {
    // Ensure you have a connected pool (using SQL Server connection)
    const pool = await sql.connect(databaseConfig);

    // Execute the query
    const result = await pool.request().input("Email_Job_Id", sql.Int, jobId) // pass jobId as a parameter
      .query(`
        SELECT Executed_Date 
        FROM email_job_history_logs 
        WHERE Email_job_Id = @Email_Job_Id 
        ORDER BY Executed_Date DESC
      `);

    // Return the history data in a structured format
    return { success: true, history: result.recordset };
  } catch (error) {
    console.error("Error fetching job history:", error);
    return { success: false, error: error.message };
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
          templates.Template_Subject,
          recipients.First_Name,
          recipients.Last_Name,
          recipients.Company,
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
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Send emails with delay
    const sendEmailWithDelay = async (recipients) => {
      for (const recipient of recipients) {
        const personalizedBody = templateBody
          .replace(
            "{lead.firstname}",
            `${recipient.First_Name} ${recipient.Last_Name}`
          )
          .replace("{lead.company}", `${recipient.Company}`);

        const mailOptions = {
          from: recipient.SenderEmail,
          to: recipient.RecipientEmail,
          subject: recipient.Template_Subject,
          html: personalizedBody,
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${recipient.RecipientEmail}`);

        // Log email sent to the database
        await pool
          .request()
          .input("Email_Job_Id", sql.Int, recipient.JobID)
          .input("Executed_Date", sql.DateTime, new Date())
          .input(
            "Email_Job_Logs",
            sql.VarChar(sql.MAX),
            JSON.stringify({
              Job_Name: recipient.Job_Name,
              Recipient: recipient.RecipientEmail,
              Status: "Email Sent",
            })
          ).query(`
            INSERT INTO email_job_history_logs (Email_Job_Id, Executed_Date, Email_Job_Logs)
            VALUES (@Email_Job_Id, @Executed_Date, @Email_Job_Logs)
          `);

        // Generate random delay time
        const delayTime = 50000 + Math.floor(Math.random() * 10000);
        // const delayTime = 50000 + (Math.floor(Math.random() * 50) + 1) * 1000;
        console.log(
          `Waiting for ${
            delayTime / 1000
          } seconds before sending to the next recipient...`
        );

        // Wait before sending the next email
        await delay(delayTime);
      }

      console.log("All emails sent.");
    };

    // Start sending emails
    sendEmailWithDelay(jobDetails);
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
