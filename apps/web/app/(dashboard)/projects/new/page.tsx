// BuildOS - Create New Project Page

import { ProjectForm } from "./project-form";

export default function NewProjectPage() {
  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-gray-600 mt-2">
          Enter project details to get started
        </p>
      </div>

      <ProjectForm />
    </div>
  );
}
