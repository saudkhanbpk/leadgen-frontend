// import axios from "axios";

// const RAPIDAPI_KEY = "0221ca216dmshf6b85c324a3d882p16eb12jsnc8f9e1f91587";
// const RAPIDAPI_HOST = "apollo-io-leads-scraper.p.rapidapi.com";

// export async function fetchApolloLeads(query: string) {
//   try {
//     const response = await axios.request({
//       method: "POST",
//       url: "https://apollo-io-leads-scraper.p.rapidapi.com/leads", // Replace with actual endpoint for leads
//       params: { query }, // Adjust params as needed for the real endpoint
//       headers: {
//         "X-RapidAPI-Key": "0221ca216dmshf6b85c324a3d882p16eb12jsnc8f9e1f91587",
//         "X-RapidAPI-Host": "default-application_10672710",
//       },
//     });
//     // Adjust this according to the actual response structure
//     return response.data.leads || [];
//   } catch (error) {
//     console.error("Apollo API error:", error);
//     return [];
//   }
// }

import axios from "axios";

export async function fetchApolloLeads(searchUrl) {
  const options = {
    method: "POST",
    url: "https://apollo-io-leads-scraper.p.rapidapi.com/leads",
    headers: {
      "x-rapidapi-key": "0221ca216dmshf6b85c324a3d882p16eb12jsnc8f9e1f91587",
      "x-rapidapi-host": "apollo-io-leads-scraper.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    data: {
      searchUrl: searchUrl,
    },
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error("Apollo API error:", error);
    return [];
  }
}