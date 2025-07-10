import React from 'react';
import Papa from 'papaparse';

const FileUploader = ({ setLeads }) => {
  const handleFileUpload = (e) => {
    const file = e.target.files[0];

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setLeads(results.data);
      }
    });
  };

  return (
    <div>
      <h3>Upload CSV or Excel File</h3>
      <input type="file" accept='.csv, .xlsx'  onChange={handleFileUpload} />
    </div>
  );
};

export default FileUploader;
