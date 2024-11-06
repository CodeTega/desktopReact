import React from "react";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

const AlertBox = ({ text, severity, onClose }) => (
  <Alert
    sx={{ marginTop: 1 }}
    action={
      <IconButton
        aria-label="close"
        color="inherit"
        size="small"
        onClick={onClose} // Calls onClose to remove individual alerts
      >
        <CloseIcon fontSize="inherit" />
      </IconButton>
    }
    severity={severity}
    // Only use dangerouslySetInnerHTML without children
  >
    {text}
  </Alert>
);

export default AlertBox;
