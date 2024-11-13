import React from "react";

interface RepoType {
  id: string;
  name: string;
  url: string;
  description: string;
}

const RepoList = ({
  repos = [],
  onSelect,
}: {
  repos: RepoType[];
  onSelect: (repo: RepoType) => void;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      {repos.map((repo) => (
        <div
          key={repo.id}
          className="border p-4 rounded-lg shadow-md bg-white hover:bg-gray-50"
        >
          <h2 className="text-lg font-bold">{repo.name}</h2>
          <p className="text-sm text-gray-600">{repo.description}</p>
          <button
            onClick={() => onSelect(repo)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Select Project
          </button>
        </div>
      ))}
    </div>
  );
};

export default RepoList;
