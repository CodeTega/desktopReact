// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
// const { contextBridge, ipcRenderer } = require("electron");

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  fetchTemplates: () => ipcRenderer.invoke("fetch-templates"),
  fetchRecipients: () => ipcRenderer.invoke("fetch-recipients"),
  fetchSenders: () => ipcRenderer.invoke("fetch-senders"),
  fetchEmailJobs: () => ipcRenderer.invoke("fetch-email-jobs"),
  addJob: (jobData) => ipcRenderer.invoke("add-job", jobData),
  addJobLogs: (jobData) => ipcRenderer.invoke("log-job-run", jobData),
  fetchJobRecipients: (jobData) =>
    ipcRenderer.invoke("fetch-job-recipients", jobData),
  fetchJobHistory: (jobData) => ipcRenderer.invoke("fetchJobHistory", jobData),
  getRecipientsFromDB: () => ipcRenderer.invoke("get-recipients-from-db"),
});

console.log("successfullly locaed");
