import React, { useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Select,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Chip,
  OutlinedInput,
  Card,
  CardContent,
  Divider,
} from "@mui/material";

const EmailForm = () => {
  const [formData, setFormData] = useState({
    template: "",
    sender: "",
    recipients: [],
    body: "",
  });
  const [showPreview, setShowPreview] = useState(false);

  const emailOptions = [
    "recipient1@example.com",
    "recipient2@example.com",
    "recipient3@example.com",
    "recipient4@example.com",
  ];

  const templateData = {
    Template1:
      "This is the body for Template 1. It includes some introductory text and details.",
    Template2:
      "Template 2 content goes here. It has a different structure and information.",
    Template3:
      "The third template body is displayed here. It could be used for follow-ups.",
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "template") {
      setFormData({
        ...formData,
        template: value,
        body: templateData[value] || "",
      });
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

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleSend = () => {
    // Handle the send logic (e.g., send the email)
    alert("Email sent!");
    console.log("Form Data:", formData);
  };

  return (
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
        Email Form
      </Typography>
      <form>
        <FormControl fullWidth margin="normal">
          <InputLabel id="template-label">Template</InputLabel>
          <Select
            labelId="template-label"
            name="template"
            value={formData.template}
            onChange={handleChange}
            label="Template"
          >
            <MenuItem value="">Select a template</MenuItem>
            <MenuItem value="Template1">Template 1</MenuItem>
            <MenuItem value="Template2">Template 2</MenuItem>
            <MenuItem value="Template3">Template 3</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          margin="normal"
          label="Sender"
          name="sender"
          type="email"
          value={formData.sender}
          onChange={handleChange}
          placeholder="Enter sender's email"
        />

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
            {emailOptions.map((email) => (
              <MenuItem key={email} value={email}>
                {email}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box mt={3} display="flex" justifyContent="space-between">
          <Button variant="contained" color="primary" onClick={handlePreview}>
            Preview
          </Button>
          <Button variant="contained" color="secondary" onClick={handleSend}>
            Send
          </Button>
        </Box>
      </form>

      {showPreview && (
        <Card sx={{ mt: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Email Preview
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1">
              <strong>Sender:</strong> {formData.sender || "N/A"}
            </Typography>
            <Typography variant="body1">
              <strong>Recipients:</strong>{" "}
              {formData.recipients.join(", ") || "N/A"}
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              <strong>Body:</strong>
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 1 }}>
              {formData.body || "N/A"}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default EmailForm;
