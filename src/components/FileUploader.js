import React, { useState } from "react";
import Papa from "papaparse";

const FileUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      console.log(`Selected file: ${file}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }

    // Use PapaParse to parse the CSV file
    Papa.parse(selectedFile, {
      header: true, // Automatically infer header from the first row
      skipEmptyLines: true, // Skip empty lines
      complete: (result) => {
        setCsvData(result.data); // Set the parsed data
        console.log("Parsed Data:", result.data); // You can see the result in the console
      },
      error: (error) => {
        console.error("Error parsing CSV file:", error);
      },
    });
    // if (selectedFile) {
    //   const reader = new FileReader();
    //   reader.onload = async (event) => {
    //     console.log("uploading ", event.target.result);
    //     const csvData = event.target.result;
    //     // Now you can send this data to the Electron main process
    //     const result = await window.electronAPI.uploadCsv(csvData);
    //     console.log(result); // Shows success or error message
    //   };
    //   reader.readAsText(selectedFile); // Read the file content as text (assuming CSV)
    // }
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      {selectedFile && <p>Selected CSV: {selectedFile.name}</p>}

      <button onClick={handleUpload}>Upload CSV and Insert Data</button>
    </div>
  );
};

export default FileUploader;
