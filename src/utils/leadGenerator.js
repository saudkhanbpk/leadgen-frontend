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
      return await scrapeLeadsWithSelenium(prompt); // ✅ Already returns deduplicated leads
    default:
      throw new Error('Unknown lead source');
  }
};