import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FaHistory, FaChevronLeft } from "react-icons/fa";

export default function History() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Processing History</h1>
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
            <FaHistory className="text-primary" />
            Recent Enrichment Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-12 text-center">
            You haven't processed any files yet. Start by uploading a CSV file on the home page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}