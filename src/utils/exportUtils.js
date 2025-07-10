import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios';

// Helper function to format leads to HubSpot Contacts Template structure
export const formatLeadsToHubspotTemplate = (leads) => {
  return leads.map(lead => {
    // Split name into first and last name
    const nameParts = (lead.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Extract city from address or location
    let city = '';
    if (lead.address) {
      // Try to extract city from address (usually after comma)
      const addressParts = lead.address.split(',');
      city = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : lead.address.trim();
    } else if (lead.location) {
      city = lead.location;
    }

    return {
      'First Name': firstName,
      'Last Name': lastName,
      'Email Address': lead.email || '',
      'Phone Number': lead.phone || '',
      'City': city
      // 'Lifecycle Stage': 'Lead',
      // 'Contact Owner': '',
      // 'Favorite Ice Cream Flavor': ''
    };
  });
};

export const exportToCSV = (leads) => {
  const formattedLeads = formatLeadsToHubspotTemplate(leads);
  const headers = ['First Name', 'Last Name', 'Email Address', 'Phone Number', 'City']; //'Lifecycle Stage', 'Contact Owner', 'Favorite Ice Cream Flavor
  const rows = formattedLeads.map(lead => [
    lead['First Name'],
    lead['Last Name'],
    lead['Email Address'],
    lead['Phone Number'],
    lead['City']
    // lead['Lifecycle Stage'],
    // lead['Contact Owner'],
    // lead['Favorite Ice Cream Flavor']
  ]);

  const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, 'hubspot-leads.csv');
};

export const exportToExcel = (leads) => {
  const formattedLeads = formatLeadsToHubspotTemplate(leads);
  const worksheet = XLSX.utils.json_to_sheet(formattedLeads);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'HubSpot Leads');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, 'hubspot-leads.xlsx');
};

export const exportToGoogleSheets = async (leads) => {
  try {
    const formattedLeads = formatLeadsToHubspotTemplate(leads);
    const response = await axios.post(`${import.meta.env.VITE_API_SERVER_URL}/api/google-sheets/export`, { leads: formattedLeads });
    alert(response.data.message || '✅ Leads exported to Google Sheets');
  } catch (err) {
    alert('❌ Failed to export to Google Sheets');
    console.error(err);
  }
};
