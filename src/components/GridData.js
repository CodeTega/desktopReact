import React, { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Box, Button, Typography } from "@mui/material";

const GridData = ({ emailJobs }) => {
  console.log("GridData");
  const [rowData, setRowData] = useState(emailJobs);
  console.log(rowData, "rowData");
  const CustomButtonComponent = (name, color, params) => {
    console.log(params.data, "here is the params");
    return (
      <Button sx={{ backgroundColor: color, color: "black" }}>{name}</Button>
    );
  };
  const [columnDefs, setColumnDefs] = useState([
    {
      headerName: "Name",
      valueFormatter: (p) => p.data.Job_Name,
      flex: 2,
    },
    {
      field: "Sender",
      valueFormatter: (p) => p.data.SenderEmail,
      flex: 1,
    },
    {
      headerName: "Template",
      valueFormatter: (p) => p.data.Template_Name,
      flex: 1,
    },
    {
      field: "Receivers",
      cellRenderer: (params) =>
        CustomButtonComponent("View", "#008CBA", params),
      flex: 1,
    },
    {
      headerName: "Action",
      // field: "button",
      cellRenderer: (params) => CustomButtonComponent("Run", "#04AA6D", params),
      flex: 1,
    },
  ]);

  console.log("data-------", rowData, columnDefs);

  return (
    <Box
      sx={{
        padding: 3,
        maxWidth: 650,
        margin: "0 auto",
      }}
    >
      <div className="ag-theme-quartz" style={{ height: 300 }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{ flex: 1 }}
        />
      </div>
    </Box>
  );
};

export default GridData;
