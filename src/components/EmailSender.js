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
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
} from "@mui/material";

import GridData from "./GridData.js";

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

// const templatest = [
//   { id: 1, name: "Template 1", body: "This is the content of Template 1." },
//   { id: 2, name: "Template 2", body: "Content of Template 2." },
// ];

const EmailSender = () => {
  const [formData, setFormData] = useState({
    sender: "",
    campaign: "",
    recipients: [],
    jobName: "",
    template: "",
    body: "",
  });
  const [senders, setSenders] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [filteredRecipients, setFilteredRecipients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [value, setValue] = useState("");

  const handleRadioChange = (event) => {
    console.log("handleRadioChange", event.target);
    setValue(event.target.value);
  };

  useEffect(() => {
    async function fetchData() {
      const template = await window.electronAPI
        .fetchTemplates()
        .then((data) => data);

      console.log("fetchTemplates returned:", template.recordsets[0][0]);

      const recipient = await window.electronAPI
        .fetchRecipients()
        .then((data) => data);

      console.log("fetchRecipients returned:", recipient.recordsets[0][0]);
      const sender = await window.electronAPI
        .fetchSenders()
        .then((data) => data);

      const campaignTypes = Array.from(
        new Set(recipient.recordsets[0].map((item) => item.Campaign))
      );
      console.log(campaignTypes, "campaign");
      setCampaigns(campaignTypes);

      setSenders(sender.recordsets[0]);
      setRecipients(recipient.recordsets[0]);
      setTemplates(template.recordsets[0]);
    }

    fetchData();
  }, []);

  useEffect(() => {
    const groupedByCampaign = recipients.reduce((acc, item) => {
      const campaign = item.Campaign;
      if (!acc[campaign]) {
        acc[campaign] = [];
      }
      acc[campaign].push(item);
      return acc;
    }, {});
    const rec = groupedByCampaign[formData.campaign];
    if (value === "official") {
      const officialCampaigns = rec?.filter((campaign) => campaign.IsOfficial);
      setFilteredRecipients(officialCampaigns);
    } else if (value === "other") {
      const nonOfficialCampaigns = rec?.filter(
        (campaign) => !campaign.IsOfficial
      );

      setFilteredRecipients(nonOfficialCampaigns);
    } else {
      setFilteredRecipients([]);
    }
  }, [formData.campaign, value]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value, // Updates formData.campaign when a campaign is selected
    }));
    console.log(name, value, "name, value");

    // if (name === "template") {
    //   const selectedTemplate = templates.find((t) => t.id === value);
    //   setFormData((prev) => ({ ...prev, body: selectedTemplate?.body || "" }));
    // }
  };

  const handleRecipientChange = (event) => {
    console.log(event, "event");

    const {
      target: { value },
    } = event;
    setFormData((prev) => ({
      ...prev,
      recipients: typeof value === "string" ? value.split(",") : value,
    }));
  };

  const handleAdd = async () => {
    const response = await window.electronAPI.addJob({
      jobName: formData.jobName,
      emailSenderId: formData.sender,
      emailTemplateId: formData.template,
      recipients: formData.recipients,
    });
    if (response.success) {
      alert("Job added successfully!");
    } else {
      alert(`Error: ${response.message}`);
    }
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
              id="Name"
              label="Name"
              name="jobName"
              type="text"
              value={formData.jobName}
              onChange={handleChange}
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
                <MenuItem key={sender.id} value={sender.Email_Sender_Id}>
                  {sender.Email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel id="compaign-label">Compaign</InputLabel>
            <Select
              labelId="campaign-label"
              name="campaign" // Change "compaign" to "campaign"
              value={formData.campaign} // Ensure this points to the correct state
              onChange={handleChange}
              label="Campaign"
            >
              {campaigns.map((campaign, index) => (
                <MenuItem key={index} value={campaign}>
                  {campaign}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <Grid2 display="flex" justifyContent="center" alignItems="center">
              <FormLabel id="demo-row-radio-buttons-group-label">
                Type
              </FormLabel>
              <RadioGroup
                sx={{ marginLeft: 10 }}
                row
                aria-labelledby="demo-row-radio-buttons-group-label"
                name="row-radio-buttons-group"
                value={value}
                onChange={handleRadioChange}
              >
                <FormControlLabel
                  sx={{ marginRight: 5 }}
                  value="official"
                  control={<Radio />}
                  label="Official"
                />
                <FormControlLabel
                  value="other"
                  control={<Radio />}
                  label="Other"
                />
              </RadioGroup>
            </Grid2>
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
                  {selected.map((id) => {
                    const recipient = filteredRecipients.find(
                      (rec) => rec.Email_Recipient_ID === id
                    );
                    return <Chip key={id} label={recipient?.Email || id} />;
                  })}
                </Box>
              )}
            >
              {filteredRecipients.map((recipient) => (
                <MenuItem
                  key={recipient.Email_Recipient_ID}
                  value={recipient.Email_Recipient_ID}
                >
                  {recipient.Email}
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
                <MenuItem
                  key={template.Email_Template_Id}
                  value={template.Email_Template_Id}
                >
                  {template.Template_Name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box mt={3} display="flex" justifyContent="space-between">
            <Button variant="contained" color="primary" onClick={handleSend}>
              save
            </Button>
            <Button variant="contained" color="primary" onClick={handleAdd}>
              save & send
            </Button>
          </Box>
        </form>
      </Box>
      <GridData />
      {/* <EmailLogs /> */}
    </Grid2>
  );
};

export default EmailSender;
