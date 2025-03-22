import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { 
  RiDownloadLine, 
  RiFileExcelLine, 
  RiCheckboxCircleLine, 
  RiRefreshLine 
} from "react-icons/ri";
import { getDownloadUrl, getResultsPreview } from "@/lib/ip-service";
import { ResultsPreview } from "@/types";

interface ResultsSectionProps {
  jobId: number;
  onStartNew: () => void;
}

function ResultsSection({ jobId, onStartNew }: ResultsSectionProps) {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Fetch job results preview with pagination
  const { data, isLoading, error } = useQuery<ResultsPreview>({
    queryKey: [`/api/jobs/${jobId}/preview`, currentPage, pageSize],
    queryFn: () => getResultsPreview(jobId, currentPage, pageSize),
    retry: 3
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading results",
        description: error instanceof Error ? error.message : "Failed to load results preview"
      });
    }
  }, [error]);

  // Handle download
  const handleDownload = () => {
    window.location.href = getDownloadUrl(jobId);
  };

  // Handle Excel export
  const handleExcelExport = () => {
    toast({
      title: "Export to Excel",
      description: "Excel export functionality would be implemented here"
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm mb-8">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Loading Results...</h3>
          </div>
          <div className="h-60 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-white shadow-sm mb-8">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Results Unavailable</h3>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
            <p className="text-red-800">Unable to load results. Please try again later.</p>
          </div>
          <Button onClick={onStartNew}>
            <RiRefreshLine className="mr-2" />
            Process Another File
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { job, preview, totalResults, totalPages = 1, currentPage: dataCurrentPage = 1 } = data;
  
  // Pagination handlers
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <Card className="bg-white shadow-sm mb-8">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Enrichment Results</h3>
          
          <div className="flex space-x-2">
            <Button onClick={handleDownload}>
              <RiDownloadLine className="mr-2" />
              Download CSV
            </Button>
            <Button variant="outline" onClick={handleExcelExport}>
              <RiFileExcelLine className="mr-2" />
              Export Excel
            </Button>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <RiCheckboxCircleLine className="text-green-500 text-xl mr-2" />
            <div>
              <p className="text-green-800 font-medium">Processing complete!</p>
              <p className="text-green-700 text-sm">
                Successfully processed {job.successfulIPs} of {job.totalIPs} IP addresses
              </p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
              <p className="text-xs text-blue-500 font-medium">Total IPs</p>
              <p className="text-xl font-semibold text-blue-800">{job.totalIPs}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-md p-3">
              <p className="text-xs text-green-500 font-medium">Successful</p>
              <p className="text-xl font-semibold text-green-800">{job.successfulIPs}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-md p-3">
              <p className="text-xs text-red-500 font-medium">Failed</p>
              <p className="text-xl font-semibold text-red-800">{job.failedIPs}</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-md p-3">
              <p className="text-xs text-purple-500 font-medium">Processing Time</p>
              <p className="text-xl font-semibold text-purple-800">
                {job.completedAt ? 
                  new Date(job.completedAt).toISOString().substr(11, 8) : 
                  "N/A"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-700">Preview Results</h4>
            <div className="text-sm text-gray-500">
              Showing {preview.length} of {job.totalIPs} records
            </div>
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="whitespace-nowrap text-xs font-medium">IP Address</TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-medium">Domain</TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-medium">Company</TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-medium">Industry</TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-medium">Organization Type</TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-medium">Size</TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-medium">Location</TableHead>
                  <TableHead className="whitespace-nowrap text-xs font-medium">ISP/ASN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="whitespace-nowrap font-mono text-xs">{row.ip}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{row.domain || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{row.company || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{row.industry || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{row.organizationType || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{row.employeeCount || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {[row.city, row.country].filter(Boolean).join(", ") || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{row.isp || row.asn || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-4 sm:mb-0 text-sm text-gray-500">
            Showing {Math.min((dataCurrentPage - 1) * 10 + 1, totalResults || 0)} to {Math.min(dataCurrentPage * 10, totalResults || 0)} of {totalResults || job.totalIPs} results
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(dataCurrentPage - 1);
                  }}
                  className={dataCurrentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              
              {/* Generate pagination links */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // For pages > 5, show current page and surrounding pages
                let pageNum = i + 1;
                if (totalPages > 5 && dataCurrentPage > 3) {
                  pageNum = Math.min(totalPages - 4 + i, totalPages);
                  if (dataCurrentPage > totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else if (dataCurrentPage > 3) {
                    pageNum = dataCurrentPage - 2 + i;
                  }
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink 
                      href="#" 
                      isActive={pageNum === dataCurrentPage}
                      onClick={(e) => {
                        e.preventDefault(); 
                        handlePageChange(pageNum);
                      }}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(dataCurrentPage + 1);
                  }}
                  className={dataCurrentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
        
        <div className="mt-8">
          <Button 
            variant="link" 
            className="text-primary px-0"
            onClick={onStartNew}
          >
            <RiRefreshLine className="mr-1" />
            Process Another File
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ResultsSection;
