import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FaDatabase, FaChevronLeft } from "react-icons/fa";

export default function BulkProcessing() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bulk IP Processing</h1>
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
            <FaDatabase className="text-primary" />
            Bulk Processing Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Auto-Save Functionality</h3>
            <p className="text-muted-foreground">
              Our bulk processing engine automatically saves progress every 100 records, allowing you to resume processing if interrupted.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Large Dataset Support</h3>
            <p className="text-muted-foreground">
              Process CSV files with millions of IP addresses efficiently with our optimized processing engine.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">ISP Filtering</h3>
            <p className="text-muted-foreground">
              Automatically filter out common ISP IP addresses (Telstra, Comcast, Cox, Verizon, BT, etc.) to focus on business and organizational IPs.
            </p>
          </div>
          
          <div className="pt-4">
            <Link href="/">
              <Button>Start Processing Now</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}