import React, { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Box, Button, Typography, Modal } from "@mui/material";
import Loader from "./UI/Loader";

const GridData = ({ emailJobs, setShowAlert, addAlert, setAlerts }) => {
  const [rowData, setRowData] = useState(emailJobs);
  const [selectedJobRecipients, setSelectedJobRecipients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    setRowData(emailJobs);
  }, [emailJobs]);

  // Function to fetch recipients for the selected job ID
  const fetchRecipientsForJob = async (jobId) => {
    console.log("job id ", jobId);
    try {
      // Assuming the backend is set up to fetch recipients by job ID
      const response = await window.electronAPI.fetchJobRecipients(jobId);
      setSelectedJobRecipients(response);
      console.log("view recipients", response);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching recipients:", error);
    }
  };

  //View job history dates

  const handleViewHistory = async (jobId) => {
    try {
      // Call the Electron API to fetch job history
      const response = await window.electronAPI.fetchJobHistory(jobId);

      if (response.success) {
        setHistoryData(response.history); // Store the fetched history
        setIsHistoryModalOpen(true); // Open the modal to show history
      } else {
        console.error("Failed to fetch job history:", response.error);
      }
    } catch (error) {
      console.error("Error fetching job history:", error);
    }
  };

  const runJob = async (jobId) => {
    setShowLoader(true);
    setShowAlert(false);
    setAlerts([]);
    const response = await window.electronAPI.addJobLogs(jobId);

    const result = response?.log?.reduce(
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

    if (response.success) {
      setShowAlert(true);

      addAlert(
        <p>
          The "{response.jobName}" completed successfully. <br />
          <strong>Emails sent:</strong> {result?.success} <br />
          <strong>Failed:</strong> {result.failed}
        </p>,
        "success"
      );
    } else {
      setShowAlert(true);
      addAlert(response.error?.message || response.error.toString(), "error");
    }
    setShowLoader(false);
    window.scrollTo(0, 0);
  };

  // Custom button component to trigger recipient fetching
  const CustomButtonComponent = (name, color, params, onClick) => (
    <Button
      sx={{ backgroundColor: color, color: "white" }}
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
    {
      headerName: "History",
      cellRenderer: (params) =>
        CustomButtonComponent("History", "#FFA500", params, () =>
          handleViewHistory(params.data.ID)
        ),
      flex: 1,
    },
  ]);

  return (
    <Box sx={{ padding: 3, maxWidth: 750, margin: "0 auto" }}>
      {showLoader && <Loader open={showLoader} />}
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
            Recipients
          </Typography>
          {selectedJobRecipients?.length ? (
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

      <Modal
        open={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      >
        <Box
          sx={{
            padding: 3,
            backgroundColor: "white",
            margin: "10% auto",
            maxWidth: 500,
            maxHeight: 300, // Set a maximum height for the box
            overflowY: "auto", // Enable scroll only when content exceeds maxHeight
          }}
        >
          <Typography variant="h6" gutterBottom>
            Executed At
          </Typography>
          {historyData.length ? (
            <ul>
              {historyData.map((entry, index) => (
                <li key={index}>
                  {new Date(entry.Executed_Date).toLocaleString()}
                </li>
              ))}
            </ul>
          ) : (
            <Typography>Data not found.</Typography>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default GridData;
