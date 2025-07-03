export const fetchLeads = async (prompt, source) => {
  console.log(`📤 Sending API request to backend:`);
  console.log(`   URL: ${import.meta.env.VITE_API_SERVER_URL}/api/leads`);
  console.log(`   Source: ${source}`);
  console.log(`   Prompt: ${prompt}`);

  const requestBody = { source, prompt, maxResults: 50 };

  const response = await fetch(`${import.meta.env.VITE_API_SERVER_URL}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API Error: ${response.status} ${response.statusText}`);
    console.error(`   Response: ${errorText}`);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`📥 API Response received:`, data);

  // Validate the response structure
  if (data && typeof data === 'object') {
    // Ensure leads is always an array
    if (data.leads && !Array.isArray(data.leads)) {
      console.error('❌ API Error: data.leads is not an array:', data.leads);
      data.leads = [];
    }

    // If no leads property but data is an array, assume it's the leads array
    if (!data.leads && Array.isArray(data)) {
      return data;
    }
  }

  // Return the full response so we can access both leads and meta information
  return data;
};
