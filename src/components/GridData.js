import React, { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Box, Button, Typography, Modal } from "@mui/material";

const GridData = ({ emailJobs }) => {
  const [rowData, setRowData] = useState(emailJobs);
  const [selectedJobRecipients, setSelectedJobRecipients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Function to fetch recipients for the selected job ID
  const fetchRecipientsForJob = async (jobId) => {
    console.log("job id ", jobId);
    try {
      // Assuming the backend is set up to fetch recipients by job ID
      const response = await window.electronAPI.fetchJobRecipients(jobId);
      setSelectedJobRecipients(response);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching recipients:", error);
    }
  };

  const runJob = async (jobId) => {
    const response = await window.electronAPI.addJobLogs(jobId);
    if (response.success) {
      console.log("Job run logged:", response.message);
    } else {
      console.error("Failed to log job run:", response.error);
    }
  };

  // Custom button component to trigger recipient fetching
  const CustomButtonComponent = (name, color, params, onClick) => (
    <Button
      sx={{ backgroundColor: color, color: "black" }}
      onClick={() => onClick(params.data)}
    >
      {name}
    </Button>
  );

  // Column definitions including "View" button for recipients
  const [columnDefs] = useState([
    { headerName: "Name", valueFormatter: (p) => p.data.Job_Name, flex: 2 },
    { field: "Sender", valueFormatter: (p) => p.data.SenderEmail, flex: 1 },
    {
      headerName: "Template",
      valueFormatter: (p) => p.data.Template_Name,
      flex: 1,
    },
    {
      field: "Receivers",
      cellRenderer: (params) =>
        CustomButtonComponent("View", "#008CBA", params, (data) =>
          fetchRecipientsForJob(data.ID)
        ),
      flex: 1,
    },
    {
      headerName: "Action",
      cellRenderer: (params) =>
        CustomButtonComponent("Run", "#04AA6D", params, () =>
          runJob(params.data.ID)
        ),
      flex: 1,
    },
  ]);

  return (
    <Box sx={{ padding: 3, maxWidth: 650, margin: "0 auto" }}>
      <div className="ag-theme-quartz" style={{ height: 300 }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{ flex: 1 }}
        />
      </div>

      {/* Modal to display recipient emails */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <Box
          sx={{
            padding: 3,
            backgroundColor: "white",
            margin: "10% auto",
            maxWidth: 500,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Recipients for Job
          </Typography>
          {selectedJobRecipients.length ? (
            <ul>
              {selectedJobRecipients.map((recipient, index) => (
                <li key={index}>{recipient.Email}</li>
              ))}
            </ul>
          ) : (
            <Typography>No recipients found.</Typography>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default GridData;
