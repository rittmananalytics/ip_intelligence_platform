import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import UploadSection from "@/components/UploadSection";
import ConfigSection from "@/components/ConfigSection";
import ProcessingSection from "@/components/ProcessingSection";
import ResultsSection from "@/components/ResultsSection";
import WorkflowSteps from "@/components/WorkflowSteps";
import AdditionalFeatures from "@/components/AdditionalFeatures";
import { FileUpload, EnrichmentJob, WorkflowStep } from "@/types";

function Home() {
  const { toast } = useToast();
  
  // State for workflow steps
  const [activeStep, setActiveStep] = useState<WorkflowStep>("upload");
  
  // State for file upload and enrichment
  const [fileUpload, setFileUpload] = useState<FileUpload | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [job, setJob] = useState<EnrichmentJob | null>(null);
  
  // Handle file upload completion
  const handleUploadComplete = (upload: FileUpload, headers: string[]) => {
    setFileUpload(upload);
    setCsvHeaders(headers);
    setActiveStep("config");
    
    toast({
      title: "File uploaded successfully",
      description: `Uploaded ${upload.originalFileName}`,
    });
  };
  
  // Handle job creation
  const handleJobCreated = (newJob: EnrichmentJob) => {
    setJob(newJob);
    setActiveStep("processing");
    
    toast({
      title: "Processing started",
      description: "Your file is being processed",
    });
  };
  
  // Handle processing completion
  const handleProcessingComplete = (completedJob: EnrichmentJob) => {
    setJob(completedJob);
    setActiveStep("results");
    
    toast({
      variant: "success",
      title: "Processing complete",
      description: `Successfully processed ${completedJob.successfulIPs} of ${completedJob.totalIPs} IP addresses`,
    });
  };
  
  // Handle starting a new job
  const handleStartNew = () => {
    setFileUpload(null);
    setCsvHeaders([]);
    setJob(null);
    setActiveStep("upload");
  };
  
  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">IP Address Enrichment</h2>
        <p className="text-gray-600">Upload a CSV file containing IP addresses to enrich with domain, company, and geolocation data.</p>
      </div>
      
      <WorkflowSteps activeStep={activeStep} />
      
      {activeStep === "upload" && (
        <UploadSection onUploadComplete={handleUploadComplete} />
      )}
      
      {activeStep === "config" && fileUpload && (
        <ConfigSection 
          fileUpload={fileUpload} 
          headers={csvHeaders}
          onBack={() => setActiveStep("upload")}
          onJobCreated={handleJobCreated}
        />
      )}
      
      {activeStep === "processing" && job && (
        <ProcessingSection 
          job={job} 
          onProcessingComplete={handleProcessingComplete}
        />
      )}
      
      {activeStep === "results" && job && (
        <ResultsSection 
          jobId={job.id} 
          onStartNew={handleStartNew}
        />
      )}
      
      {/* Always show additional features */}
      <AdditionalFeatures />
    </>
  );
}

export default Home;
