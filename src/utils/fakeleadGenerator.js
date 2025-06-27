const SAMPLE_NAMES = [
  'John Smith', 'Emily Johnson', 'Michael Brown', 'Sarah Davis', 'David Wilson',
  'Lisa Anderson', 'Robert Taylor', 'Jennifer Martinez', 'William Garcia', 'Jessica Rodriguez',
  'James Miller', 'Ashley Jones', 'Christopher Lee', 'Amanda White', 'Daniel Thompson',
  'Stephanie Martinez', 'Matthew Anderson', 'Nicole Thomas', 'Andrew Jackson', 'Samantha Harris',
  'Joshua Martin', 'Elizabeth Clark', 'Ryan Lewis', 'Michelle Robinson', 'Brandon Walker',
  'Heather Hall', 'Justin Allen', 'Rachel Young', 'Kevin King', 'Lauren Wright'
];

const SAMPLE_COMPANIES = [
  'Sunshine Solar Solutions', 'Green Energy Systems', 'Power Plus Solar', 'EcoTech Innovations',
  'Bright Future Energy', 'Solar Dynamics LLC', 'Clean Power Co', 'Renewable Resources Inc',
  'Energy Efficiency Experts', 'Solar Installation Pros', 'GreenTech Solutions', 'Sustainable Power Systems',
  'Solar Innovations Group', 'Eco-Friendly Energy', 'Advanced Solar Technology'
];

const generatePhoneNumber = () => {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const exchange = Math.floor(Math.random() * 900) + 100;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode}) ${exchange}-${number}`;
};

const generateAddress = (location) => {
  const streetNumbers = Math.floor(Math.random() * 9999) + 1;
  const streetNames = [
    'Main St', 'Oak Ave', 'Pine St', 'Maple Dr', 'Cedar Ln', 'Elm St', 'Park Ave',
    'First St', 'Second Ave', 'Third St', 'Washington St', 'Lincoln Ave', 'Jefferson Dr'
  ];

  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  return `${streetNumbers} ${streetName}, ${location}`;
};

const generateEmail = (name, company) => {
  const firstName = name.split(' ')[0].toLowerCase();
  const lastName = name.split(' ')[1]?.toLowerCase() || '';

  if (company && Math.random() > 0.3) {
    const domain = company.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10) + '.com';
    return `${firstName}.${lastName}@${domain}`;
  }

  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${firstName}.${lastName}@${domain}`;
};

const generateWebsite = (company) => {
  const domain = company.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  return `https://www.${domain}.com`;
};

export const parseLeadRequest = (input) => {
  const request = {};
  
  // Extract number of leads
  const numberMatch = input.match(/(\d+)\s*leads?/i);
  if (numberMatch) {
    request.count = parseInt(numberMatch[1]);
  }
  
  // Common niche patterns
  const nichePatterns = [
    /\b(solar|renewable energy|clean energy)\b/i,
    /\b(real estate|realty|property)\b/i,
    /\b(insurance|auto insurance|health insurance)\b/i,
    /\b(fitness|gym|health|wellness)\b/i,
    /\b(restaurant|food|catering)\b/i,
    /\b(construction|contractor|building)\b/i,
    /\b(marketing|advertising|digital marketing)\b/i,
    /\b(healthcare|medical|dental|clinic)\b/i,
    /\b(automotive|car|auto)\b/i,
    /\b(technology|tech|software|IT)\b/i,
  ];
  
  for (const pattern of nichePatterns) {
    const match = input.match(pattern);
    if (match) {
      request.niche = match[1];
      break;
    }
  }
  
  // Extract location - common patterns
  const locationPatterns = [
    /\bin\s+([\w\s,]+)(?:\s|$)/i,
    /\bfrom\s+([\w\s,]+)(?:\s|$)/i,
    /\baround\s+([\w\s,]+)(?:\s|$)/i,
    /\bnear\s+([\w\s,]+)(?:\s|$)/i,
  ];
  
  for (const pattern of locationPatterns) {
    const match = input.match(pattern);
    if (match) {
      let location = match[1].trim();
      // Clean up common trailing words
      location = location.replace(/\s+(for|with|and|or).*$/i, '');
      if (location.length > 2 && location.length < 50) {
        request.location = location;
        break;
      }
    }
  }
  
  return request;
};

export const generateLeads = (request) => {
  const leads = [];
  const { niche, location, count } = request;

  for (let i = 0; i < count; i++) {
    const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
    const company = Math.random() > 0.3 ?
      SAMPLE_COMPANIES[Math.floor(Math.random() * SAMPLE_COMPANIES.length)] :
      undefined;

    const lead = {
      name,
      phone: generatePhoneNumber(),
      address: generateAddress(location),
      email: Math.random() > 0.2 ? generateEmail(name, company) : undefined,
      company,
      website: company && Math.random() > 0.5 ? generateWebsite(company) : undefined,
      notes: `Generated lead for ${niche} industry in ${location}`
    };

    leads.push(lead);
  }

  return leads;
};