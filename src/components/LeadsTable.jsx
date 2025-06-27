// src/components/LeadsTable.jsx
import React from 'react';
import * as XLSX from 'xlsx';

const LeadsTable = ({ leads }) => {
  if (!leads.length) return null;

  const downloadCSV = () => {
    const worksheet = XLSX.utils.json_to_sheet(leads);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
    XLSX.writeFile(workbook, 'leads.csv');
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(leads);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
    XLSX.writeFile(workbook, 'leads.xlsx');
  };

  return (
    <div>
      <div className="flex justify-end gap-2 mb-2">
        <button onClick={downloadCSV} className="bg-green-500 text-white px-3 py-1 rounded">
          Download CSV
        </button>
        <button onClick={downloadExcel} className="bg-purple-500 text-white px-3 py-1 rounded">
          Download Excel
        </button>
        <button onClick={() => alert('Google Sheets clicked!')} className="bg-blue-500 text-white px-3 py-1 rounded">
          Google Sheets
        </button>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">#</th>
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">Phone</th>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">Website</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, index) => (
              <tr key={index} className="text-center">
                <td className="px-4 py-2 border">{index + 1}</td>
                <td className="px-4 py-2 border">{lead.name}</td>
                <td className="px-4 py-2 border">{lead.phone}</td>
                <td className="px-4 py-2 border">{lead.email}</td>
                <td className="px-4 py-2 border">{lead.website || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadsTable;
