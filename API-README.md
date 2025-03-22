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
CREATE FUNCTION `your_project.your_dataset.get_ip_intelligence`(ip STRING) 
RETURNS STRUCT<
  country STRING,
  city STRING,
  region STRING,
  latitude FLOAT64,
  longitude FLOAT64,
  company STRING,
  isp STRING,
  asn STRING,
  ispFiltered BOOL,
  domain STRING,
  success BOOL
>
LANGUAGE js AS """
  function get_ip_intelligence(ip) {
    // Using the deployed application URL
    var url = 'https://ip-enrich.rittmananalytics.com/api/lookup?ip=' + ip;
    
    try {
      var response = UrlFetchApp.fetch(url);
      
      // Handle errors
      if (response.getResponseCode() !== 200) {
        return {
          country: null,
          city: null,
          region: null,
          latitude: null,
          longitude: null,
          company: null,
          isp: null,
          asn: null,
          ispFiltered: null,
          domain: null,
          success: false
        };
      }
      
      var data = JSON.parse(response.getContentText());
      
      // Return the enriched data
      return {
        country: data.country || null,
        city: data.city || null,
        region: data.region || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        company: data.company || null,
        isp: data.isp || null,
        asn: data.asn || null,
        ispFiltered: data.ispFiltered || false,
        domain: data.domain || null,
        success: data.success || false
      };
    } catch (e) {
      // Handle any exceptions
      return {
        country: null,
        city: null,
        region: null,
        latitude: null,
        longitude: null,
        company: null,
        isp: null,
        asn: null,
        ispFiltered: null,
        domain: null,
        success: false
      };
    }
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
  get_ip_intelligence(client_ip).ispFiltered AS is_common_isp
FROM 
  `your-project.your-dataset.web_logs`
LIMIT 
  100;
```

For better performance when using the UDF with multiple columns in the same row, you can call it once and store the result:

```sql
SELECT 
  client_ip,
  ip_info.country AS ip_country,
  ip_info.city AS ip_city,
  ip_info.company AS ip_company,
  ip_info.domain AS ip_domain,
  ip_info.ispFiltered AS is_common_isp
FROM (
  SELECT 
    client_ip,
    get_ip_intelligence(client_ip) AS ip_info
  FROM 
    `your-project.your-dataset.web_logs`
)
WHERE 
  ip_info.success = true
LIMIT 
  100;
```

## Rate Limits

Please note that the IP intelligence service uses a third-party data provider with rate limits. If you're processing large volumes of data, consider using the batch processing functionality.

## Batch Processing 

For large-scale IP address processing, use our web interface to upload CSV files containing IP addresses for batch enrichment. The batch processing functionality is available as part of the standard application and supports auto-saving, handling thousands of IP addresses efficiently.