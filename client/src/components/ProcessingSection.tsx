import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getJobStatus, getRecentResults, RecentResultsResponse } from "@/lib/ip-service";
import { EnrichmentJob, IPEnrichmentResult, IPEnrichmentData } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProcessingSectionProps {
  job: EnrichmentJob;
  onProcessingComplete: (job: EnrichmentJob) => void;
}

function ProcessingSection({ job, onProcessingComplete }: ProcessingSectionProps) {
  const { toast } = useToast();
  const [currentJob, setCurrentJob] = useState<EnrichmentJob>(job);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCanceling, setIsCanceling] = useState(false);
  const [recentResults, setRecentResults] = useState<IPEnrichmentResult[]>([]);
  const [nextResultIndex, setNextResultIndex] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Poll job status
  useEffect(() => {
    if (currentJob.status === 'completed' || currentJob.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const updatedJob = await getJobStatus(currentJob.id);
        setCurrentJob(updatedJob);
        
        if (updatedJob.status === 'completed') {
          onProcessingComplete(updatedJob);
          clearInterval(pollInterval);
        } else if (updatedJob.status === 'failed') {
          toast({
            variant: "destructive",
            title: "Processing failed",
            description: updatedJob.error || "There was an error processing your file"
          });
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Error polling job status:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentJob.id, currentJob.status]);

  // Track elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  
  // Fetch recent results for real-time display
  useEffect(() => {
    if (currentJob.status !== 'processing') {
      return;
    }
    
    const fetchResults = async () => {
      try {
        const response = await getRecentResults(currentJob.id, nextResultIndex);
        
        if (response.results.length > 0) {
          // Append new results
          setRecentResults(prev => [...prev, ...response.results]);
          setNextResultIndex(response.nextIndex);
          
          // Auto-scroll to bottom
          setTimeout(() => {
            if (scrollAreaRef.current) {
              const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
              if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
              }
            }
          }, 100);
        }
      } catch (error) {
        console.error("Error fetching recent results:", error);
      }
    };
    
    // Initial fetch
    fetchResults();
    
    // Set up polling interval
    const pollInterval = setInterval(fetchResults, 2000);
    
    return () => clearInterval(pollInterval);
  }, [currentJob.id, currentJob.status, nextResultIndex]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate estimated time remaining
  const calculateTimeRemaining = () => {
    if (currentJob.processedIPs === 0 || currentJob.totalIPs === 0) {
      return "Calculating...";
    }

    const processedPercentage = currentJob.processedIPs / currentJob.totalIPs;
    if (processedPercentage === 0) return "Calculating...";

    const totalEstimatedTime = elapsedTime / processedPercentage;
    const remaining = Math.max(0, totalEstimatedTime - elapsedTime);
    
    return formatTime(Math.round(remaining));
  };

  // Calculate progress percentage
  const progressPercentage = currentJob.totalIPs > 0 
    ? Math.round((currentJob.processedIPs / currentJob.totalIPs) * 100) 
    : 0;

  // Helper to determine result status color
  const getStatusColor = (result: IPEnrichmentResult) => {
    if (!result.success) return "text-red-600";
    
    // Check enrichment data for completeness
    if (result.enrichmentData && typeof result.enrichmentData === 'object') {
      const data = result.enrichmentData as IPEnrichmentData;
      if (data.domain && data.company) return "text-green-600";
    }
    
    return "text-yellow-500"; // Partial success
  };

  return (
    <Card className="bg-white shadow-sm mb-8">
      <CardContent className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Processing IP Addresses</h3>
        
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-gray-700">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-primary h-4 rounded-full progress-bar-animated" 
              style={{ width: `${progressPercentage}%` }} 
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Processed {currentJob.processedIPs} of {currentJob.totalIPs || '?'} IP addresses...
          </p>
        </div>
        
        <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Processing Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">File Name:</p>
              <p className="font-medium text-gray-800">{currentJob.originalFileName}</p>
            </div>
            <div>
              <p className="text-gray-600">Total IPs:</p>
              <p className="font-medium text-gray-800">{currentJob.totalIPs || 'Calculating...'}</p>
            </div>
            <div>
              <p className="text-gray-600">Successful Lookups:</p>
              <p className="font-medium text-green-600">{currentJob.successfulIPs}</p>
            </div>
            <div>
              <p className="text-gray-600">Failed Lookups:</p>
              <p className="font-medium text-red-600">{currentJob.failedIPs}</p>
            </div>
            <div>
              <p className="text-gray-600">Time Elapsed:</p>
              <p className="font-medium text-gray-800">{formatTime(elapsedTime)}</p>
            </div>
            <div>
              <p className="text-gray-600">Est. Time Remaining:</p>
              <p className="font-medium text-gray-800">{calculateTimeRemaining()}</p>
            </div>
          </div>
        </div>
        
        {/* Real-time results scrolling window */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Live Enrichment Results</h4>
          <div className="border border-gray-200 rounded-md bg-gray-50 overflow-hidden">
            <ScrollArea ref={scrollAreaRef} className="h-[250px] p-2 font-mono text-xs">
              {recentResults.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Waiting for results...
                </div>
              ) : (
                <div className="space-y-1 p-1">
                  {/* Header row */}
                  <div className="grid grid-cols-12 gap-2 w-full text-xs text-gray-500 font-semibold mb-2 border-b pb-1">
                    <span className="col-span-2">IP ADDRESS</span>
                    <span className="col-span-2">DOMAIN</span>
                    <span className="col-span-2">COMPANY</span>
                    <span className="col-span-2">LOCATION</span>
                    <span className="col-span-2">INDUSTRY</span>
                    <span className="col-span-2">ORG TYPE</span>
                  </div>
                  {recentResults.map((result, index) => (
                    <div 
                      key={`result-${index}-${result.id || result.rowIndex}`} 
                      className={`p-1.5 rounded result-item-new ${result.success ? 'bg-gray-100' : 'bg-red-50'}`}
                    >
                      <div className="grid grid-cols-12 gap-2 w-full">
                        {/* IP Column (2/12) */}
                        <span className={`col-span-2 font-medium ${getStatusColor(result)}`}>
                          {result.originalData && typeof result.originalData === 'object' && 'ip' in result.originalData 
                            ? result.originalData.ip 
                            : (result.enrichmentData && typeof result.enrichmentData === 'object' && 'ip' in result.enrichmentData 
                              ? result.enrichmentData.ip 
                              : 'Unknown IP')}
                        </span>
                        
                        {result.success ? (
                          <>
                            {/* Domain Column (2/12) */}
                            <span className="col-span-2 text-blue-600 truncate">
                              {result.enrichmentData && typeof result.enrichmentData === 'object' && 'domain' in result.enrichmentData ? 
                                result.enrichmentData.domain : '—'}
                            </span>
                            
                            {/* Company Column (2/12) */}
                            <span className="col-span-2 truncate">
                              {result.enrichmentData && typeof result.enrichmentData === 'object' && 'company' in result.enrichmentData ? 
                                result.enrichmentData.company : '—'}
                            </span>
                            
                            {/* Location Column (3/12) */}
                            <span className="col-span-3 text-gray-600 truncate">
                              {result.enrichmentData && typeof result.enrichmentData === 'object' ?
                                [
                                  'city' in result.enrichmentData ? result.enrichmentData.city : null, 
                                  'country' in result.enrichmentData ? result.enrichmentData.country : null
                                ].filter(Boolean).join(", ") : '—'}
                            </span>
                            
                            {/* ISP Column (3/12) */}
                            <span className="col-span-3 truncate">
                              {result.enrichmentData && typeof result.enrichmentData === 'object' && 'isp' in result.enrichmentData ? 
                                result.enrichmentData.isp : '—'}
                            </span>
                          </>
                        ) : (
                          <span className="col-span-10 text-red-600">
                            {result.error || "Lookup failed"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Showing {recentResults.length} most recent results
          </p>
        </div>
        
        <div className="flex justify-center">
          <Button 
            variant="secondary" 
            onClick={() => setIsCanceling(true)}
            disabled={isCanceling || currentJob.status === 'completed'}
          >
            {isCanceling ? "Canceling..." : "Cancel Processing"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProcessingSection;
