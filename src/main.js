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

// Fetch campaigns

ipcMain.handle("fetch-campaigns", async () => {
  try {
    const pool = await sql.connect(databaseConfig);
    const result = await pool
      .request()
      .query(`SELECT distinct campaign  FROM email_recipients`);
    return result;
  } catch (error) {
    console.error("Error fetching data:", error);
    return error;
  }
});
// Recipients from the given campaign and isOfficial value
ipcMain.handle("fetch-filtered-recipients", async (event, data) => {
  const { campaign, isOfficial } = data;
  const official = isOfficial === "official" ? true : false;
  try {
    const pool = await sql.connect(databaseConfig);
    const result = await pool
      .request()
      .input("campaign", sql.VarChar, campaign) // Set parameter for campaign
      .input("official", sql.Bit, official) // Set parameter for official status
      .query(
        `SELECT Email_Recipient_ID, Email FROM email_recipients WHERE Campaign = @campaign AND IsOfficial = @official;`
      );
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
    email_templates AS templates ON jobs.Email_Template_Id = templates.Email_Template_Id
    ORDER BY 
    jobs.ID DESC;

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
    return { success: false, error: error };
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

    // Insert initial log with the execution date
    const executedDate = new Date();
    await pool
      .request()
      .input("Email_Job_Id", sql.Int, jobId)
      .input("Executed_Date", sql.DateTime, executedDate)
      .input("Email_Job_Logs", sql.VarChar(sql.MAX), JSON.stringify([])).query(`
        INSERT INTO email_job_history_logs (Email_Job_Id, Executed_Date, Email_Job_Logs)
        VALUES (@Email_Job_Id, @Executed_Date, @Email_Job_Logs)
      `);

    // Fetch job details
    const jobResult = await pool.request().input("Job_Id", sql.Int, jobId)
      .query(`
        SELECT 
          jobs.ID AS JobID,
          jobs.Job_Name,
          senders.Email AS SenderEmail,
          senders.Sender_Password AS SenderPassword,
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
    const emailLog = []; // Collect log data for each recipient

    // Setup transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: jobDetails[0].SenderEmail,
        pass: jobDetails[0].SenderPassword,
      },
    });

    const delay = (func) => new Promise(func);

    // Send emails with delay and log success/failure
    const sendEmailWithDelay = async (recipients) => {
      let counter = 0;
      for (const recipient of recipients) {
        counter++;
        const personalizedBody = templateBody
          .replace("{lead.firstname}", `${recipient.First_Name}`)
          .replace("{lead.company}", `${recipient.Company}`);

        const mailOptions = {
          from: recipient.SenderEmail,
          to: recipient.RecipientEmail,
          subject: recipient.Template_Subject,
          html: personalizedBody,
        };

        try {
          // Attempt to send email
          await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${recipient.RecipientEmail}`);

          // Log success for this recipient
          emailLog.push({
            Recipient: recipient.RecipientEmail,
            Status: "Success",
            Message: "Email Sent",
            Date: new Date().toLocaleString(),
          });
        } catch (err) {
          console.error(
            `Failed to send email to ${recipient.RecipientEmail}`,
            err
          );

          // Log failure with reason for this recipient
          emailLog.push({
            Recipient: recipient.RecipientEmail,
            Status: "Failed",
            Message: err.message,
            Date: new Date().toLocaleString(),
          });
        }

        // Generate a random delay between 50 and 100 seconds

        if (recipients.length != counter) {
          const delayTime = 50000 + (Math.floor(Math.random() * 50) + 1) * 1000;
          console.log(
            `Waiting for ${
              delayTime / 1000
            } seconds before sending to the next recipient...`
          );
          console.log("delayed");
          await delay((resolve) => setTimeout(resolve, delayTime));
        }
      }
    };

    // Start sending emails
    await sendEmailWithDelay(jobDetails);

    // After all emails are processed, update the log entry with email results
    await pool
      .request()
      .input("Email_Job_Id", sql.Int, jobId)
      .input("Executed_Date", sql.DateTime, executedDate) // Add Executed_Date input here
      .input("Email_Job_Logs", sql.VarChar(sql.MAX), JSON.stringify(emailLog))
      .query(`
    UPDATE email_job_history_logs
    SET Email_Job_Logs = @Email_Job_Logs
    WHERE Email_Job_Id = @Email_Job_Id AND Executed_Date = @Executed_Date
  `);

    console.log("Emails sent and logs updated successfully");
    return { success: true, log: emailLog, jobName: jobDetails[0].Job_Name };
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
