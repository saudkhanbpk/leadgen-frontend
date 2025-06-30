import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios';

export const exportToCSV = (leads) => {
  const headers = ['Name', 'Phone', 'Email', 'Website'];
  const rows = leads.map(lead => [lead.name, lead.phone, lead.email, lead.website || '']);

  const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, 'leads.csv');
};

export const exportToExcel = (leads) => {
  const worksheet = XLSX.utils.json_to_sheet(leads);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, 'leads.xlsx');
};

export const exportToGoogleSheets = async (leads) => {
  try {
    const response = await axios.post(`${import.meta.env.VITE_API_SERVER_URL}/api/google-sheets/export`, { leads });
    alert(response.data.message || '✅ Leads exported to Google Sheets');
  } catch (err) {
    alert('❌ Failed to export to Google Sheets');
    console.error(err);
  }
};
