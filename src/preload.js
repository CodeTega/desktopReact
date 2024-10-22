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
  getSenders: () => ipcRenderer.invoke("get-senders"),
  getRecipients: () => ipcRenderer.invoke("get-recipients"),
  getTemplates: () => ipcRenderer.invoke("get-templates"),
  sendEmail: (data) => ipcRenderer.invoke("send-email", data),
  fetchLogs: () => ipcRenderer.invoke("fetch-logs"),
});

console.log("successfullly locaed");
