import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { findPossibleIPColumns } from "@/lib/csv-utils";
import { startEnrichmentJob } from "@/lib/ip-service";
import { FileUpload, EnrichmentJob } from "@/types";

interface ConfigSectionProps {
  fileUpload: FileUpload;
  headers: string[];
  onBack: () => void;
  onJobCreated: (job: EnrichmentJob) => void;
}

function ConfigSection({ fileUpload, headers, onBack, onJobCreated }: ConfigSectionProps) {
  const { toast } = useToast();
  const possibleIPColumns = findPossibleIPColumns(headers);
  
  const [ipColumnName, setIpColumnName] = useState<string>(possibleIPColumns[0] || '');
  const [includeGeolocation, setIncludeGeolocation] = useState(true);
  const [includeDomain, setIncludeDomain] = useState(true);
  const [includeCompany, setIncludeCompany] = useState(true);
  const [includeNetwork, setIncludeNetwork] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartProcessing = async () => {
    if (!ipColumnName) {
      toast({
        variant: "destructive",
        title: "Configuration error",
        description: "Please select the column containing IP addresses"
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      const job = await startEnrichmentJob(fileUpload, {
        ipColumnName,
        includeGeolocation: includeGeolocation ? 1 : 0,
        includeDomain: includeDomain ? 1 : 0,
        includeCompany: includeCompany ? 1 : 0,
        includeNetwork: includeNetwork ? 1 : 0
      });
      
      onJobCreated(job);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to start processing",
        description: error.message || "There was an error starting the enrichment job"
      });
      setIsProcessing(false);
    }
  };

  return (
    <Card className="bg-white shadow-sm mb-8">
      <CardContent className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* IP Column Selector */}
          <div>
            <Label htmlFor="ipColumn" className="mb-1">IP Address Column</Label>
            <Select 
              value={ipColumnName} 
              onValueChange={setIpColumnName}
            >
              <SelectTrigger id="ipColumn" className="w-full">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {headers.map(header => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-gray-500">Select which column contains the IP addresses</p>
          </div>
          
          {/* Enrichment Options */}
          <div>
            <Label className="mb-2">Data to Include</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="geolocation" 
                  checked={includeGeolocation}
                  onCheckedChange={(checked) => setIncludeGeolocation(checked === true)}
                />
                <Label htmlFor="geolocation" className="text-sm text-gray-700">
                  Geolocation (Country, City, Region)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="domain" 
                  checked={includeDomain}
                  onCheckedChange={(checked) => setIncludeDomain(checked === true)}
                />
                <Label htmlFor="domain" className="text-sm text-gray-700">
                  Domain Name
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="company" 
                  checked={includeCompany}
                  onCheckedChange={(checked) => setIncludeCompany(checked === true)}
                />
                <Label htmlFor="company" className="text-sm text-gray-700">
                  Company Information
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="network" 
                  checked={includeNetwork}
                  onCheckedChange={(checked) => setIncludeNetwork(checked === true)}
                />
                <Label htmlFor="network" className="text-sm text-gray-700">
                  Network Information (ASN, ISP)
                </Label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="mr-3"
            disabled={isProcessing}
          >
            Back
          </Button>
          <Button 
            onClick={handleStartProcessing}
            disabled={isProcessing || !ipColumnName}
          >
            {isProcessing ? "Starting..." : "Start Processing"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ConfigSection;
