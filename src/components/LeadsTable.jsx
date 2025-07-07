// src/components/LeadsTable.jsx
import React from 'react';
import * as XLSX from 'xlsx';

// Helper function to format leads to HubSpot Contacts Template structure
const formatLeadsToHubspotTemplate = (leads) => {
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

const LeadsTable = ({ leads }) => {
  // Ensure leads is always an array before checking length
  const safeLeads = Array.isArray(leads) ? leads : [];
  if (!safeLeads.length) return null;

  const downloadCSV = () => {
    const formattedLeads = formatLeadsToHubspotTemplate(safeLeads);
    const worksheet = XLSX.utils.json_to_sheet(formattedLeads);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HubSpot Leads');
    XLSX.writeFile(workbook, 'hubspot-leads.csv');
  };

  const downloadExcel = () => {
    const formattedLeads = formatLeadsToHubspotTemplate(safeLeads);
    const worksheet = XLSX.utils.json_to_sheet(formattedLeads);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HubSpot Leads');
    XLSX.writeFile(workbook, 'hubspot-leads.xlsx');
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
            {safeLeads.map((lead, index) => (
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
