import React from "react";

interface RepoType {
  id: string;
  name: string;
  url: string; // Add the URL to the type
}

interface ProjectConfirmationProps {
  selectedRepo: RepoType; // Expecting selectedRepo as prop
}

const ProjectConfirmation: React.FC<ProjectConfirmationProps> = ({
  selectedRepo,
}) => {
  return (
    <div className="flex flex-col items-center bg-gray-100 min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Confirm Your Project</h1>
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold">{selectedRepo.name}</h2>
        <p className="text-sm text-gray-500">{selectedRepo.url}</p>
        <button className="mt-4 w-full bg-green-600 text-white py-2 rounded-md">
          Confirm Selection
        </button>
      </div>
    </div>
  );
};

export default ProjectConfirmation;
