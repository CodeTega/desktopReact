import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  Typography,
  FormControl,
  InputLabel,
  Chip,
  OutlinedInput,
  Grid2,
  TextField,
} from "@mui/material";

import GridData from "./GridData.js";
import EmailLogs from "./EmailLogs.js";

const senderst = [
  { id: 1, email: "r.awais@pionlog.com", password: "xlxn nbnc esbc aefn" },
  { id: 2, email: "sender2@example.com", password: "app_password_2" },
];

const recipientst = [
  { id: 1, email: "recipient1@example.com" },
  { id: 2, email: "ranaawais0303gmail.com" },
  { id: 3, email: "ahmadfareed.test@gmail.com" },
  { id: 4, email: "recipient4@example.com" },
];

const templatest = [
  { id: 1, name: "Template 1", body: "This is the content of Template 1." },
  { id: 2, name: "Template 2", body: "Content of Template 2." },
];

const EmailSender = () => {
  const [formData, setFormData] = useState({
    sender: "",
    recipients: [],
    template: "",
    body: "",
  });
  const [senders, setSenders] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    let template;
    async function fetchData() {
      // const fetchRecipients = async () => {
      //   try {
      //     const recipientList = await window.electronAPI.getRecipientsFromDB();
      //     console.log(recipientList, "here is the recipient list");
      //     // setRecipients(recipientList);
      //   } catch (error) {
      //     console.error("Failed to fetch recipients:", error);
      //   }
      // };

      // fetchRecipients();
      const template = await window.electronAPI
        .fetchTemplates()
        .then((data) => data);

      console.log("fetchTemplates returned:", template.recordsets[0][0]);
      setSenders(senderst);
      setRecipients(recipientst);
      setTemplates(templatest);
    }

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "template") {
      const selectedTemplate = templates.find((t) => t.id === value);
      setFormData((prev) => ({ ...prev, body: selectedTemplate?.body || "" }));
    }
  };

  const handleRecipientChange = (event) => {
    const {
      target: { value },
    } = event;
    setFormData({
      ...formData,
      recipients: typeof value === "string" ? value.split(",") : value,
    });
  };

  const handleSend = async () => {
    console.log("Send", formData.recipients);
    // senders, templates, senderId, recipients, templateId;
    const response = await window.electronAPI.sendEmail({
      senders,
      templates,
      recipients: formData.recipients,
      senderId: formData.sender,
      templateId: formData.template,
      // delay: 5000000,
    });

    if (response.success) {
      alert("Email sent successfully!");
    } else {
      alert(`Error: ${response.message}`);
    }
  };

  return (
    <Grid2>
      <Box
        sx={{
          padding: 3,
          maxWidth: 600,
          margin: "0 auto",
          boxShadow: 3,
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" mb={3}>
          Email Sender
        </Typography>
        <form>
          <FormControl fullWidth margin="normal">
            <TextField
              id="outlined-password-input"
              label="Password"
              type="password"
              autoComplete="current-password"
            />
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="sender-label">Sender</InputLabel>
            <Select
              labelId="sender-label"
              name="sender"
              value={formData.sender}
              onChange={handleChange}
              label="Sender"
            >
              {senders.map((sender) => (
                <MenuItem key={sender.id} value={sender.id}>
                  {sender.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel id="recipients-label">Recipients</InputLabel>
            <Select
              labelId="recipients-label"
              multiple
              name="recipients"
              value={formData.recipients}
              onChange={handleRecipientChange}
              input={
                <OutlinedInput id="select-multiple-chip" label="Recipients" />
              }
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {recipients.map((recipient) => (
                <MenuItem key={recipient.id} value={recipient.email}>
                  {recipient.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel id="template-label">Template</InputLabel>
            <Select
              labelId="template-label"
              name="template"
              value={formData.template}
              onChange={handleChange}
              label="Template"
            >
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box mt={3} display="flex" justifyContent="space-between">
            <Button variant="contained" color="primary" onClick={handleSend}>
              save
            </Button>
            <Button variant="contained" color="primary" onClick={handleSend}>
              save & send
            </Button>
          </Box>
        </form>
      </Box>
      <GridData />
      <EmailLogs />
    </Grid2>
  );
};

export default EmailSender;
