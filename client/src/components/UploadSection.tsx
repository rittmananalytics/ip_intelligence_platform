import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { RiUploadCloud2Line, RiFileUploadLine } from "react-icons/ri";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadCSVFile } from "@/lib/ip-service";
import { parseCSVHeaders } from "@/lib/csv-utils";
import { FileUpload } from "@/types";

interface UploadSectionProps {
  onUploadComplete: (upload: FileUpload, headers: string[]) => void;
}

function UploadSection({ onUploadComplete }: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle file selection from input
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  // Handle file drop
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  // Process the selected file
  const processFile = async (file: File) => {
    // Check if the file is a CSV
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        variant: "destructive",
        title: "Invalid file format",
        description: "Please upload a CSV file"
      });
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload a file smaller than 10MB"
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Parse CSV headers first
      const headers = await parseCSVHeaders(file);
      
      // Upload the file
      const uploadResult = await uploadCSVFile(file);
      
      // Notify parent component of success
      onUploadComplete(uploadResult, headers);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "There was an error uploading your file"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger file input click
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Card className="bg-white shadow-sm mb-8">
      <CardContent className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upload IP Addresses</h3>
        
        {/* File Uploader */}
        <div 
          className={`border-2 border-dashed ${
            isDragging ? 'border-primary' : 'border-gray-300'
          } rounded-lg p-8 text-center cursor-pointer hover:border-primary transition duration-200`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={openFileSelector}
        >
          <div className="mb-4">
            <RiUploadCloud2Line className="mx-auto text-5xl text-gray-400" />
          </div>
          <p className="text-gray-700 mb-1">Drag and drop your CSV file here</p>
          <p className="text-gray-500 text-sm mb-4">or</p>
          <Button 
            onClick={(e) => { e.stopPropagation(); openFileSelector(); }}
            disabled={isUploading}
          >
            <RiFileUploadLine className="mr-2" />
            {isUploading ? "Uploading..." : "Browse Files"}
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".csv" 
            className="hidden" 
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <p className="mt-4 text-sm text-gray-500">Supported format: CSV with a column containing IP addresses</p>
        </div>

        {/* Requirements Section */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">CSV Format Requirements:</h4>
          <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>File must contain a header row</li>
            <li>Must include a column with IP addresses</li>
            <li>Recommended max size: 5MB (approx. 100,000 IPs)</li>
          </ul>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-sm text-blue-800"><strong>Example CSV format:</strong></p>
            <pre className="font-mono text-xs text-blue-800 mt-1 overflow-x-auto">ip_address,client_id,timestamp
192.168.1.1,client123,2023-06-15
203.0.113.195,client456,2023-06-16</pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UploadSection;
