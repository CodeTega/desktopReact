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
import Loader from "./UI/Loader.js";
import AlertBox from "./UI/AlertBox.js";

const initialState = {
  sender: "",
  campaign: "",
  recipients: [],
  jobName: "",
  template: "",
  body: "",
};

const EmailSender = () => {
  const [formData, setFormData] = useState(initialState);
  const [senders, setSenders] = useState([]);
  const [isFormSubmit, setIsFormSubmit] = useState(false);
  const [filteredRecipients, setFilteredRecipients] = useState([]);
  const [emailJobs, setEmailJobs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [value, setValue] = useState("");
  const [showLoader, setShowLoader] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertText, setAlertText] = useState("");
  const [severity, setSeverity] = useState("");

  const [alerts, setAlerts] = useState([]);

  // Function to add a new alert
  const addAlert = (text, severity) => {
    setAlerts((prevAlerts) => [
      ...prevAlerts,
      { id: Date.now(), text, severity },
    ]);
  };

  // Function to remove an alert
  const removeAlert = (id) => {
    setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== id));
  };

  //radio button value setting
  const handleRadioChange = (event) => {
    setFormData({ ...formData, recipients: [] });
    setValue(event.target.value);
  };

  //fetch initial data for dropdowns and for grid
  useEffect(() => {
    async function fetchData() {
      setShowLoader(true);
      const template = await window.electronAPI
        .fetchTemplates()
        .then((data) => data);

      const campaign = await window.electronAPI
        .fetchCampaigns()
        .then((data) => data);

      const sender = await window.electronAPI
        .fetchSenders()
        .then((data) => data);

      const jobs = await window.electronAPI
        .fetchEmailJobs()
        .then((data) => data);

      setShowLoader(false);
      //campaign names array
      setCampaigns(campaign?.recordsets[0]);
      setSenders(sender?.recordsets[0]);
      setTemplates(template?.recordsets[0]);
      setEmailJobs(jobs?.recordsets[0]);
    }

    fetchData();
  }, [isFormSubmit]);

  //handler for filtered recipients
  const fetchRecipientsData = async (campaign, isOfficial) => {
    const recipientg = await window.electronAPI.filteredRecipients({
      campaign: campaign,
      isOfficial: isOfficial,
    });

    setFilteredRecipients(recipientg?.recordsets[0]);
  };

  //for set recipients via some filteration
  useEffect(() => {
    if (value && formData.campaign) {
      if (value === "official") {
        fetchRecipientsData(formData?.campaign, value);
      } else if (value === "other") {
        fetchRecipientsData(formData.campaign, value);
      }
    } else {
      setFilteredRecipients([]);
    }
  }, [formData.campaign, value]);

  const handleTextField = (e) => {
    setFormData({ ...formData, jobName: e.target.value });
  };

  //handle change for single select and text fields
  const handleChange = (e) => {
    console.log(e.target, "here it the target");
    const { name, value } = e.target;
    if (name === "campaign") {
      setFormData({ ...formData, recipients: [] });
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value, // Updates formData.campaign when a campaign is selected
    }));
  };

  //Handle reccipients all select single select
  // deselect
  const handleRecipientChange = (event) => {
    const { value } = event.target;
    const isSelectAllClicked = value.includes("all");

    // Check if all recipients are currently selected
    const allSelected =
      formData.recipients.length === filteredRecipients.length;

    if (isSelectAllClicked) {
      // Toggle all selections if "Select All" is clicked
      if (allSelected) {
        setFormData({ ...formData, recipients: [] }); // Deselect all
      } else {
        setFormData({
          ...formData,
          recipients: filteredRecipients.map((rec) => rec.Email_Recipient_ID),
        }); // Select all
      }
    } else {
      // Individual selection
      setFormData({
        ...formData,
        recipients: value.filter((val) => val !== "all"),
      });
    }
  };

  ///
  const handleAdd = async (job) => {
    setIsFormSubmit(false);
    setShowLoader(true);
    const response = await window.electronAPI.addJob({
      jobName: formData.jobName,
      emailSenderId: formData.sender,
      emailTemplateId: formData.template,
      recipients: formData.recipients,
    });

    if (response.success) {
      setShowAlert(true);
      setFormData(initialState);
      addAlert("Job added successfully!", "success");
      setValue("");

      // Update emailJobs to trigger re-render in GridData
      const jobs = await window.electronAPI.fetchEmailJobs();
      setEmailJobs(jobs?.recordsets[0]);

      if (job) {
        setShowLoader(true);
        const resp = await window.electronAPI.addJobLogs(response.jobId);

        const result = resp?.log?.reduce(
          (counts, log) => {
            if (log.Status === "Success") {
              counts.success += 1;
            } else if (log.Status === "Failed") {
              counts.failed += 1;
            }
            return counts;
          },
          { success: 0, failed: 0 }
        );

        if (resp.success) {
          setShowAlert(true);

          addAlert(
            <p>
              The "${resp?.jobName}" completed successfully. <br />
              <strong>Emails sent:</strong> ${result?.success} <br />
              <strong>Failed:</strong> ${result.failed}
            </p>,
            "success"
          );
        } else {
          setShowAlert(true);
          addAlert(resp.error?.message || resp.error.toString(), "error");
        }
        setShowLoader(false);
      }
    } else {
      setShowAlert(true);
      addAlert(response.error?.message || response.error.toString(), "error");
    }
    !job && setShowLoader(false);
    window.scrollTo(0, 0);
  };

  const handleAddAndSend = async () => {
    await handleAdd(true);
    setShowLoader(false);
  };

  return (
    <Grid2>
      <Box
        sx={{
          padding: 3,
          maxWidth: 700,
          margin: "0 auto",
          boxShadow: 3,
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" mb={3}>
          Email Sender
        </Typography>
        {showAlert &&
          alerts.map((alert) => (
            <AlertBox
              key={alert.id}
              severity={alert.severity}
              text={alert.text}
              onClose={() => removeAlert(alert.id)} // Remove only the specific alert
            />
          ))}
        {showLoader && <Loader open={showLoader} />}
        <form>
          <FormControl fullWidth margin="normal">
            <TextField
              id="JobName"
              label="JobName"
              name="jobName"
              type="text"
              // inputProps={{ maxLength: 99 }}
              value={formData.jobName}
              onChange={handleTextField}
              sx={{
                "& .MuiInputLabel-root": {
                  backgroundColor: "white",
                  width: "80px",
                  marginLeft: "-3px",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  // Extra layer to avoid label getting cut
                },
              }}
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
              {senders?.map((sender) => (
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
              {campaigns?.map((campaign, index) => {
                return (
                  <MenuItem key={index} value={campaign.campaign}>
                    {campaign.campaign}
                  </MenuItem>
                );
              })}
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

          {/*  */}
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
                    const recipient = filteredRecipients?.find(
                      (rec) => rec.Email_Recipient_ID === id
                    );
                    return <Chip key={id} label={recipient?.Email || id} />;
                  })}
                </Box>
              )}
            >
              {/* Select All option */}
              <MenuItem value="all">
                <em>
                  {formData.recipients?.length === filteredRecipients?.length
                    ? "Deselect All"
                    : "Select All"}
                </em>
              </MenuItem>

              {/* Individual recipient options */}
              {filteredRecipients?.map((recipient) => (
                <MenuItem
                  key={recipient.Email_Recipient_ID}
                  value={recipient.Email_Recipient_ID}
                >
                  {recipient.Email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/*  */}

          <FormControl fullWidth margin="normal">
            <InputLabel id="template-label">Template</InputLabel>
            <Select
              labelId="template-label"
              name="template"
              value={formData.template}
              onChange={handleChange}
              label="Template"
            >
              {templates?.map((template) => (
                <MenuItem
                  key={template.Email_Template_Id}
                  value={template.Email_Template_Id}
                >
                  {template.Template_Name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleAdd(false)}
              disabled={
                !formData.jobName ||
                !formData.sender ||
                !formData.campaign ||
                !formData.template ||
                !formData.recipients.length
              }
              sx={{ mr: 1 }}
            >
              save
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddAndSend}
              disabled={
                !formData.jobName ||
                !formData.sender ||
                !formData.campaign ||
                !formData.template ||
                !formData.recipients.length
              }
            >
              save & send
            </Button>
          </Box>
        </form>
      </Box>
      {emailJobs?.length > 0 && (
        <GridData
          emailJobs={emailJobs}
          setShowAlert={setShowAlert}
          addAlert={addAlert}
          // setSeverity={setSeverity}
          // setAlertText={setAlertText}
        />
      )}
      {/* <EmailLogs /> */}
    </Grid2>
  );
};

export default EmailSender;
