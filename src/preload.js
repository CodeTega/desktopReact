// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
// const { contextBridge, ipcRenderer } = require("electron");

// contextBridge.exposeInMainWorld("electronAPI", {
//   sendEmail: (recipientEmail, messageContent) =>
//     ipcRenderer.invoke("send-email", recipientEmail, messageContent),
//   fetchLogs: () => ipcRenderer.invoke("fetch-logs"),
// });

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  fetchTemplates: () => ipcRenderer.invoke("fetch-templates"),
  fetchRecipients: () => ipcRenderer.invoke("fetch-recipients"),
  fetchSenders: () => ipcRenderer.invoke("fetch-senders"),
  addJob: (jobData) => ipcRenderer.invoke("add-job", jobData),
  sendEmail: (data) => ipcRenderer.invoke("send-email", data),
  fetchLogs: () => ipcRenderer.invoke("fetch-logs"),
  uploadCsv: (filePath) => ipcRenderer.invoke("upload-csv", data),
  getRecipientsFromDB: () => ipcRenderer.invoke("get-recipients-from-db"),
});

console.log("successfullly locaed");
