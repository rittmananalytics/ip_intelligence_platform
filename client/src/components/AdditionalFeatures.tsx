import { FaCode, FaHistory, FaDatabase, FaArrowRight } from "react-icons/fa";
import { Card, CardContent } from "@/components/ui/card";

function AdditionalFeatures() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2">
              <FaCode className="text-xl text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="text-md font-medium text-gray-900">API Access</h3>
              <p className="mt-1 text-sm text-gray-600">Integrate IP enrichment directly into your applications</p>
            </div>
          </div>
          <a href="/API-README.md" target="_blank" className="mt-2 text-primary hover:text-primary/80 text-sm font-medium inline-flex items-center">
            View API Documentation
            <FaArrowRight className="ml-1" />
          </a>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2">
              <FaHistory className="text-xl text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="text-md font-medium text-gray-900">History</h3>
              <p className="mt-1 text-sm text-gray-600">Access your previously processed files</p>
            </div>
          </div>
          <a href="/history" className="mt-2 text-primary hover:text-primary/80 text-sm font-medium inline-flex items-center">
            View Processing History
            <FaArrowRight className="ml-1" />
          </a>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2">
              <FaDatabase className="text-xl text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="text-md font-medium text-gray-900">Bulk Processing</h3>
              <p className="mt-1 text-sm text-gray-600">Process large datasets with auto-saving and resume capabilities</p>
            </div>
          </div>
          <a href="/bulk-processing" className="mt-2 text-primary hover:text-primary/80 text-sm font-medium inline-flex items-center">
            Learn More
            <FaArrowRight className="ml-1" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdditionalFeatures;
