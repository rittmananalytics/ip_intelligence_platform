# IP Enrichment API

This API provides IP address intelligence and enrichment capabilities to help security and network professionals identify potential threats.

## Single IP Lookup API

### Endpoint

```
GET /api/lookup?ip={ip_address}
```

### Parameters

- `ip` (required): The IP address to look up (e.g., 8.8.8.8)

### Response Format

```json
{
  "ip": "8.8.8.8",
  "success": true,
  "country": "United States",
  "city": "Ashburn",
  "region": "Virginia",
  "latitude": 39.03,
  "longitude": -77.5,
  "company": "Google Public DNS",
  "isp": "Google LLC",
  "asn": "AS15169 Google LLC",
  "ispFiltered": false,
  "domain": "dns.google"
}
```

### Error Response

```json
{
  "ip": "invalid",
  "success": false,
  "error": "Invalid IP address format"
}
```

## Integration with BigQuery 

You can use this API with BigQuery User Defined Functions (UDFs) to enrich your log data with IP intelligence directly in your SQL queries.

### Example BigQuery UDF

```sql
CREATE FUNCTION get_ip_intelligence(ip STRING) 
RETURNS STRUCT<
  country STRING,
  city STRING,
  company STRING,
  isp STRING,
  asn STRING,
  is_isp BOOL,
  domain STRING
>
LANGUAGE js AS """
  function get_ip_intelligence(ip) {
    var url = 'https://your-app-url.replit.app/api/lookup?ip=' + ip;
    var response = UrlFetchApp.fetch(url);
    
    // Handle errors
    if (response.getResponseCode() !== 200) {
      return {
        country: null,
        city: null,
        company: null,
        isp: null,
        asn: null,
        is_isp: null,
        domain: null
      };
    }
    
    var data = JSON.parse(response.getContentText());
    
    // Check if the enrichment was successful
    if (!data.success) {
      return {
        country: null,
        city: null,
        company: null,
        isp: null,
        asn: null,
        is_isp: null,
        domain: null
      };
    }
    
    // Return the enriched data
    return {
      country: data.country || null,
      city: data.city || null,
      company: data.company || null,
      isp: data.isp || null,
      asn: data.asn || null,
      is_isp: data.ispFiltered || false,
      domain: data.domain || null
    };
  }
"""
OPTIONS (
  library="gs://google-cloud-libs/url-fetch/v0_1_0"
);
```

### Using the UDF in a Query

```sql
SELECT 
  client_ip,
  get_ip_intelligence(client_ip).country AS ip_country,
  get_ip_intelligence(client_ip).company AS ip_company,
  get_ip_intelligence(client_ip).domain AS ip_domain,
  get_ip_intelligence(client_ip).is_isp AS is_common_isp
FROM 
  `your-project.your-dataset.web_logs`
LIMIT 
  100;
```

## Rate Limits

Please note that the IP intelligence service uses a third-party data provider with rate limits. If you're processing large volumes of data, consider using the batch processing API endpoint instead.

## Batch Processing API

For large-scale IP address processing, use our web interface to upload CSV files containing IP addresses for batch enrichment.