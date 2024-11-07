const { app, BrowserWindow, ipcMain } = require("electron");
const nodemailer = require("nodemailer");
const databaseConfig = require("./database.js");
const sql = require("mssql");
const path = require("path");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

//Fetch Templates
ipcMain.handle("fetch-templates", async () => {
  try {
    const pool = await sql.connect(databaseConfig);
    const result = await pool.request().query(`SELECT 
      Email_Template_Id,
      Template_Name
      FROM email_templates`);
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

//fetch senders
ipcMain.handle("fetch-senders", async () => {
  try {
    const pool = await sql.connect(databaseConfig);
    const result = await pool.request().query(`SELECT 
      Email_Sender_Id,
      Email
      FROM email_senders`);
    return result;
  } catch (error) {
    console.error("Error fetching data:", error);
    return error;
  }
});

//Fetch email jobs
ipcMain.handle("fetch-email-jobs", async () => {
  //in select use only the main field which you wan to show
  // not add the extra id in select query
  try {
    const pool = await sql.connect(databaseConfig);
    const result = await pool.request().query(`  
SELECT 
    jobs.ID,  
    jobs.Job_Name,
    senders.Email AS SenderEmail,
    senders.FirstName AS SenderName,
    templates.Template_Name
FROM 
    email_jobs AS jobs
JOIN 
    email_senders AS senders ON jobs.Email_Sender_Id = senders.Email_Sender_Id
JOIN 
    email_templates AS templates ON jobs.Email_Template_Id = templates.Email_Template_Id
    ORDER BY 
    jobs.Add_Date DESC;

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
    const trimmedJobName = jobName.trim().toLowerCase();

    const pool = await sql.connect(databaseConfig);

    // Step 1: Check for duplicate job name in the database
    const duplicateCheckResult = await pool
      .request()
      .input("JobName", sql.VarChar(100), trimmedJobName).query(`
        SELECT COUNT(*) AS matchCount
        FROM email_jobs
        WHERE LOWER(RTRIM(LTRIM(Job_Name))) = @JobName
      `);

    const matchCount = duplicateCheckResult.recordset[0].matchCount;

    // If there are matches, return with a message and skip the insertion
    if (matchCount > 0) {
      console.log(`Duplicate job name found: ${matchCount} match(es)`);
      return {
        success: false,
        message: `"${jobName}" is already taken. Try using a unique name.`,
      };
    }

    // Start a transaction for consistency
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Step 2: Insert job and retrieve job ID
    const jobResult = await transaction
      .request()
      .input("Job_Name", sql.VarChar(100), jobName)
      .input("Email_Sender_Id", sql.Int, emailSenderId)
      .input("Add_Date", sql.DateTime, new Date())
      .input("active", sql.Bit, true)
      .input("Email_Template_Id", sql.Int, emailTemplateId).query(`
        INSERT INTO email_jobs (Job_Name, Email_Sender_Id, Email_Template_Id, Add_Date, active)
        VALUES (@Job_Name, @Email_Sender_Id, @Email_Template_Id, @Add_Date, @active);

        SELECT SCOPE_IDENTITY() AS ID;
      `);

    const jobId = jobResult.recordset[0].ID; // Job ID from the insertion

    // Step 3: Insert recipients into job_recipients table using the job ID
    for (const recipientId of recipients) {
      await transaction
        .request()
        .input("Email_Job_ID", sql.Int, jobId)
        .input("Add_Date", sql.DateTime, new Date())
        .input("Active", sql.Bit, true)
        .input("Recipient_ID", sql.Int, recipientId).query(`
          INSERT INTO job_recipients (Email_Job_ID, Recipient_ID, Add_Date, Active)
          VALUES (@Email_Job_ID, @Recipient_ID, @Add_Date, @Active);
        `);
    }

    // Commit the transaction after successful inserts
    await transaction.commit();

    console.log("Job and recipients added successfully.");
    return { jobId, success: true };
  } catch (error) {
    console.error("Error adding job and recipients:", error.message);
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
          recipients.Email
         
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
    const insertResult = await pool
      .request()
      .input("Email_Job_Id", sql.Int, jobId)
      .input("Executed_Date", sql.DateTime, executedDate)
      .input("Add_Date", sql.DateTime, executedDate)
      .input("active", sql.Bit, true)
      .input("Email_Job_Logs", sql.VarChar(sql.MAX), JSON.stringify([])).query(`
        INSERT INTO email_job_history_logs (Email_Job_Id, Executed_Date, Email_Job_Logs, Add_Date, active)
        VALUES (@Email_Job_Id, @Executed_Date, @Email_Job_Logs, @Add_Date, @active);

         SELECT SCOPE_IDENTITY() AS ID;
      `);
    const jobLogsId = insertResult.recordset[0].ID;

    // Fetch job details
    const jobResult = await pool.request().input("Job_Id", sql.Int, jobId)
      .query(`
        SELECT 
          jobs.ID AS JobID,
          jobs.Job_Name,
          senders.Email AS SenderEmail,
          senders.Sender_Password AS SenderPassword,
          senders.Email_Port as Port,
          senders.Email_Host as Host,
          templates.Template_Body,
          templates.Template_Subject
        FROM 
          email_jobs AS jobs
        JOIN 
          email_senders AS senders ON jobs.Email_Sender_Id = senders.Email_Sender_Id
        JOIN 
          email_templates AS templates ON jobs.Email_Template_Id = templates.Email_Template_Id
        WHERE 
          jobs.ID = @Job_Id
      `);

    ////////////////////////// Recipients //////////////////////////
    const recipients = await pool.request().input("Job_Id", sql.Int, jobId)
      .query(`
        SELECT 
          recipients.First_Name,
          recipients.Last_Name,
          recipients.Company,
          recipients.Email AS RecipientEmail
        FROM 
          email_jobs AS jobs
        JOIN 
          job_recipients AS job_rec ON jobs.ID = job_rec.Email_Job_Id
        JOIN 
          email_recipients AS recipients ON job_rec.Recipient_Id = recipients.Email_Recipient_ID
        WHERE 
          jobs.ID = @Job_Id
      `);

    if (jobResult.recordset.length === 0 || recipients.recordset.length === 0) {
      throw new Error("Job not found");
    }

    const recipientsDetails = recipients.recordset;
    //job details with all records except recipient records
    const jobDetails = jobResult.recordset;
    const templateBody = jobDetails[0].Template_Body;
    const emailLog = []; // Collect log data for each recipient

    //credentials for set domain and port
    const senderEmail = jobDetails[0].SenderEmail;
    const senderPassword = jobDetails[0].SenderPassword;

    // Setup transporter
    const transporter = nodemailer.createTransport({
      host: `smtp.${jobDetails[0].Host}`,
      port: jobDetails[0].Port,
      auth: {
        user: senderEmail,
        pass: senderPassword,
      },
    });

    const delay = (func) => new Promise(func);

    const templateSubject = jobDetails[0].Template_Subject;

    // replace placeholders

    // Send emails with delay and log success/failure
    const sendEmailWithDelay = async (recipients) => {
      let counter = 0;
      for (const recipient of recipients) {
        const personalizedBody = templateBody
          .replace("{lead.firstname}", `${recipient.First_Name}`)
          .replace("{lead.company}", `${recipient.Company}`);
        counter++;

        const mailOptions = {
          from: senderEmail,
          to: recipient.RecipientEmail,
          subject: templateSubject,
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
    await sendEmailWithDelay(recipientsDetails);

    // After all emails are processed, update the log entry with email results\
    // primary key email_job_history_logs?
    await pool
      .request()
      .input("Email_Job_Id", sql.Int, jobId)
      .input("Executed_Date", sql.DateTime, executedDate) // Add Executed_Date input here
      .input("Edit_Date", sql.DateTime, new Date())
      .input("Email_Job_Logs", sql.VarChar(sql.MAX), JSON.stringify(emailLog))
      .query(`
    UPDATE email_job_history_logs
    SET Email_Job_Logs = @Email_Job_Logs, Edit_Date = @Edit_Date
    WHERE ID = ${jobLogsId}
  `);

    console.log(jobLogsId, "job logs id");

    console.log("Emails sent and logs updated successfully");
    return { success: true, log: emailLog, jobName: jobDetails[0].Job_Name };
  } catch (error) {
    console.error("Error running job:", error);
    return { success: false, error: error.message };
  }
});

// Fetch logs from the database

const createWindow = () => {
  //to show the icon at the title bar in exe use
  // icon: icon: __dirname + "/SmartReach_Logo.ico" here
  //and use this into the forge.config file
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    icon: __dirname + "/SmartReach_Log.ico",
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
    },
    //want to hide the dev tools then true else false
    autoHideMenuBar: true,
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
