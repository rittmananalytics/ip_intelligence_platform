import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FaCode, FaChevronLeft, FaExternalLinkAlt } from "react-icons/fa";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ApiDocs() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">API Documentation</h1>
        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2">
            <FaChevronLeft size={14} />
            Back to Home
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaCode className="text-primary" />
            IP Enrichment API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This API provides IP address intelligence and enrichment capabilities to help security and network professionals identify potential threats.
          </p>
          
          <Tabs defaultValue="single">
            <TabsList className="mb-4">
              <TabsTrigger value="single">Single IP Lookup</TabsTrigger>
              <TabsTrigger value="bigquery">BigQuery Integration</TabsTrigger>
              <TabsTrigger value="batch">Batch Processing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Endpoint</h3>
                <div className="bg-muted p-3 rounded-md font-mono text-sm my-2">
                  GET /api/lookup?ip=&#123;ip_address&#125;
                </div>
                
                <h3 className="font-semibold text-lg mt-4">Parameters</h3>
                <p className="my-2"><code className="bg-muted px-1 py-0.5 rounded">ip</code> (required): The IP address to look up (e.g., 8.8.8.8)</p>
                
                <h3 className="font-semibold text-lg mt-4">Response Format</h3>
                <pre className="bg-muted p-3 rounded-md text-sm my-2 overflow-x-auto">
{`{
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
}`}
                </pre>
                
                <h3 className="font-semibold text-lg mt-4">Error Response</h3>
                <pre className="bg-muted p-3 rounded-md text-sm my-2 overflow-x-auto">
{`{
  "ip": "invalid",
  "success": false,
  "error": "Invalid IP address format"
}`}
                </pre>
                
                <h3 className="font-semibold text-lg mt-4">Example Usage with cURL</h3>
                <pre className="bg-muted p-3 rounded-md text-sm my-2 overflow-x-auto">
{`curl -X GET "https://ip-enrich.rittmananalytics.com/api/lookup?ip=8.8.8.8"`}
                </pre>
              </div>
            </TabsContent>
            
            <TabsContent value="bigquery" className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Integration with BigQuery</h3>
                <p className="my-2">
                  You can use this API with BigQuery Remote Functions to enrich your log data with IP intelligence directly in your SQL queries.
                </p>
                
                <h4 className="font-semibold mt-4">Using BigQuery Connection</h4>
                <p className="my-2">
                  To integrate with external APIs in BigQuery, you need to use the BigQuery Connection feature.
                  This approach requires setting up a connection resource but provides proper API access:
                </p>
                <ol className="list-decimal list-inside space-y-2 my-2 ml-4">
                  <li>Create a BigQuery connection to Cloud Resource (requires BigQuery Admin permissions)</li>
                  <li>Use the connection in your remote function definition</li>
                  <li>Call the remote function in your SQL queries</li>
                </ol>
                
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-4">
                  <p className="text-amber-700">
                    <strong>Important Note:</strong> JavaScript UDFs in BigQuery cannot make external network requests due to sandbox restrictions.
                    The BigQuery Connection approach is the only supported method for calling external APIs.
                  </p>
                </div>
                
                <pre className="bg-muted p-3 rounded-md text-sm my-2 overflow-x-auto">
{`-- Step 1: Create a connection (one-time setup, do this in the BigQuery UI or with this SQL)
CREATE OR REPLACE CONNECTION \`your_project.your_region.your_connection\`
OPTIONS(
  location = 'your_region',
  connection_type = 'CLOUD_RESOURCE'
);

-- Step 2: Create the remote function using the connection
CREATE OR REPLACE FUNCTION \`your_project.your_dataset.get_ip_intelligence\`(ip STRING)
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
REMOTE WITH CONNECTION \`your_project.your_region.your_connection\`
OPTIONS(
  endpoint = 'https://ip-enrich.rittmananalytics.com/api/lookup',
  user_defined_context = [("ip", ip)],
  max_batching_rows = 50
);`}
                </pre>
                
                <h3 className="font-semibold text-lg mt-4">Using the UDF in a Query</h3>
                <pre className="bg-muted p-3 rounded-md text-sm my-2 overflow-x-auto">
{`SELECT 
  client_ip,
  get_ip_intelligence(client_ip).country AS ip_country,
  get_ip_intelligence(client_ip).company AS ip_company,
  get_ip_intelligence(client_ip).domain AS ip_domain,
  get_ip_intelligence(client_ip).ispFiltered AS is_common_isp
FROM 
  \`your-project.your-dataset.web_logs\`
LIMIT 
  100;`}
                </pre>
                
                <h3 className="font-semibold text-lg mt-4">Optimized Query Example</h3>
                <p className="my-2">For better performance when using the UDF with multiple columns in the same row, you can call it once and store the result:</p>
                <pre className="bg-muted p-3 rounded-md text-sm my-2 overflow-x-auto">
{`SELECT 
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
    \`your-project.your-dataset.web_logs\`
)
WHERE 
  ip_info.success = true
LIMIT 
  100;`}
                </pre>
              </div>
            </TabsContent>
            
            <TabsContent value="batch" className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Batch Processing</h3>
                <p className="my-2">
                  For large-scale IP address processing, use our web interface to upload CSV files containing IP addresses for batch enrichment. 
                  The batch processing functionality is available as part of the standard application and supports:
                </p>
                
                <ul className="list-disc list-inside space-y-2 my-2">
                  <li>Auto-saving every 100 records for reliability</li>
                  <li>ISP filtering to focus on business and organizational IPs</li>
                  <li>Detailed processing status and progress tracking</li>
                  <li>Enriched CSV download with all original data plus intelligence</li>
                </ul>
                
                <div className="mt-4">
                  <Link href="/">
                    <Button className="flex items-center gap-2">
                      Start Batch Processing
                      <FaExternalLinkAlt size={12} />
                    </Button>
                  </Link>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Please note that the IP intelligence service uses a third-party data provider with rate limits. 
            If you're processing large volumes of data, consider using the batch processing functionality.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}