import React, { useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Box, Button, Typography } from "@mui/material";

const GridData = () => {
  console.log("GridData");
  const [rowData, setRowData] = useState([
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Ford", model: "F-Series", price: 33850, electric: false },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false },
    { make: "Mercedes", model: "EQA", price: 48890, electric: true },
    { make: "Fiat", model: "500", price: 15774, electric: false },
    { make: "Nissan", model: "Juke", price: 20675, electric: false },
  ]);
  const CustomButtonComponent = (props) => {
    return (
      <button
        style={{ color: "blue", background: "red" }}
        onClick={() => window.alert("clicked")}
      >
        {props}
      </button>
    );
  };
  const [columnDefs, setColumnDefs] = useState([
    {
      headerName: "Name",
      field: "make",
      flex: 2,
    },
    {
      field: "Sender",
      valueFormatter: (p) => p.data.price,
      flex: 1,
    },
    { headerName: "Template", field: "model", flex: 1 },
    {
      field: "Receivers",
      cellRenderer: () => CustomButtonComponent("RUN"),
      flex: 1,
    },
    {
      headerName: "Action",
      field: "button",
      cellRenderer: () => CustomButtonComponent("View"),
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
