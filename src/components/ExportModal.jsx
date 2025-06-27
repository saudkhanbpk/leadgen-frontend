import React from 'react';
import { exportToCSV, exportToExcel, exportToGoogleSheets } from '../utils/exportUtils';

const ExportModal = ({ leads, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleExport = async (type) => {
    if (type === 'csv') exportToCSV(leads);
    else if (type === 'excel') exportToExcel(leads);
    else await exportToGoogleSheets(leads);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-lg font-bold mb-4">Export Leads</h2>
        <button className="btn btn-blue w-full mb-2" onClick={() => handleExport('csv')}>Export to CSV</button>
        <button className="btn btn-green w-full mb-2" onClick={() => handleExport('excel')}>Export to Excel</button>
        <button className="btn btn-yellow w-full" onClick={() => handleExport('google')}>Export to Google Sheets</button>
        <button className="btn btn-gray mt-4 w-full" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ExportModal;
