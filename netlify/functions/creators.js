// netlify/functions/creators.js
// Proxies Airtable API calls so the token stays server-side.
// Set these environment variables in Netlify Dashboard → Site Settings → Environment Variables:
//   AIRTABLE_TOKEN = your personal access token
//   AIRTABLE_BASE_ID = appou6G2o6e6xTq2D
//   AIRTABLE_TABLE_ID = tbl4eJgMitA33TuRl

exports.handler = async (event) => {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableId = process.env.AIRTABLE_TABLE_ID;

  if (!token || !baseId || !tableId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing Airtable configuration" })
    };
  }

  // Airtable paginates at 100 records. Fetch all pages.
  let allRecords = [];
  let offset = null;

  do {
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}` +
      (offset ? `?offset=${offset}` : '');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Airtable API error", details: errText })
      };
    }

    const data = await response.json();
    allRecords = allRecords.concat(data.records);
    offset = data.offset || null;
  } while (offset);

  // Transform Airtable records into the shape the frontend expects
  const creators = allRecords.map(r => {
    const f = r.fields;
    return {
      name: f.name || "",
      aliases: f.aliases ? f.aliases.split(",").map(a => a.trim()).filter(Boolean) : [],
      type: f.type || "",
      verification: f.verification || "Unverified",
      orientation: f.orientation || "Unknown",
      ethnicity: f.ethnicity || "",
      nationality: f.nationality || "",
      location: f.location || "",
      age: f.age || null,
      build: f.build || "",
      height_inches: f.height_inches || null,
      body_hair: f.body_hair || "",
      tattoos: f.tattoos || "",
      foot_size: f.foot_size || null,
      purpose: f.purpose || [],
      kinks: f.kinks || [],
      bio: f.bio || "",
      photo_url: f.photo_url || "",
      socials: parseSocials(f.socials),
      wordpress_profile_url: f.wordpress_profile_url || "",
      wordpress_tag_url: f.wordpress_tag_url || ""
    };
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      // Cache for 5 minutes so it doesn't hit Airtable on every page load
      'Cache-Control': 'public, max-age=300'
    },
    body: JSON.stringify(creators)
  };
};

function parseSocials(raw) {
  if (!raw) return {};
  // Supports JSON string or simple "Platform: URL" lines
  try {
    return JSON.parse(raw);
  } catch {
    const result = {};
    raw.split("\n").forEach(line => {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        const val = line.substring(idx + 1).trim();
        if (key && val) result[key] = val;
      }
    });
    return result;
  }
}
