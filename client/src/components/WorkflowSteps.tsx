import { WorkflowStep } from "@/types";

interface WorkflowStepsProps {
  activeStep: WorkflowStep;
}

function WorkflowSteps({ activeStep }: WorkflowStepsProps) {
  const steps: { key: WorkflowStep, label: string }[] = [
    { key: "upload", label: "Upload CSV" },
    { key: "config", label: "Process Data" },
    { key: "results", label: "Download Results" }
  ];

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row justify-between border-b border-gray-200 pb-4">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center mb-3 sm:mb-0">
            <div 
              className={`w-8 h-8 rounded-full ${
                activeStep === step.key || 
                (activeStep === "processing" && step.key === "config") ? 
                'bg-primary text-white' : 'bg-gray-300 text-gray-600'
              } flex items-center justify-center text-sm font-medium`}
            >
              {index + 1}
            </div>
            <span 
              className={`ml-2 font-medium ${
                activeStep === step.key || 
                (activeStep === "processing" && step.key === "config") ? 
                'text-gray-900' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorkflowSteps;
