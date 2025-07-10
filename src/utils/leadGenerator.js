// const actorId = 'timely_pioneer~my-actor';
// const token = import.meta.env.VITE_APIFY_TOKEN;

// export async function generateLeads(query: string = 'dentists in New York') {
//   try {
//     const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;
    
//     const input = {
//       searchStringsArray: [query],
//       maxCrawledPlacesPerSearch: 50,
//       includeHistogram: false,
//       includeOpeningHours: false
//     };

//     const response = await fetch(url, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({ input })
//     });

//     if (!response.ok) throw new Error('Failed to fetch leads from Apify');

//     const leads = await response.json();
//     return leads;

//   } catch (error) {
//     console.error('Error fetching leads:', error);
//     return [];
//   }
// }

import { fetchLeadsFromApify } from './apifyLeadFetcher';
import { fetchLeadsFromApollo } from './apolloLeadFetcher';
import { scrapeLeadsWithSelenium } from './scraper';

export const generateLeads = async (
  source,
  prompt,
  maxResults
) => {
  switch (source) {
    case 'apify':
      return await fetchLeadsFromApify(prompt, maxResults);
    case 'apollo':
      return await fetchLeadsFromApollo(prompt, maxResults);
    case 'scraper':
      return await scrapeLeadsWithSelenium(prompt); 
    default:
      throw new Error('Unknown lead source');
  }
};