import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, FileText, Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api'
import type { CreateProjectRequest } from '@/lib/api'

export function ProjectWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    idea: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: keyof CreateProjectRequest) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (error) setError(null) // Clear error when user starts typing
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleCreateProject = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const project = await apiClient.createProject(formData)
      navigate(`/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0 && formData.description.trim().length > 0
      case 2:
        return formData.idea.trim().length > 0
      case 3:
        return true
      default:
        return false
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-muted-foreground">
          Follow the guided wizard to define your project requirements and let our AI orchestrate the development process.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`w-24 h-1 mx-2 ${
                    step < currentStep ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>Basic Info</span>
          <span>Project Vision</span>
          <span>Review & Create</span>
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {currentStep === 1 && <FileText className="h-5 w-5" />}
            {currentStep === 2 && <Sparkles className="h-5 w-5" />}
            {currentStep === 3 && <FileText className="h-5 w-5" />}
            <span>
              {currentStep === 1 && 'Project Information'}
              {currentStep === 2 && 'Project Vision'}
              {currentStep === 3 && 'Review & Create'}
            </span>
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Let\'s start with the basics about your project.'}
            {currentStep === 2 && 'Describe your project idea and vision in detail.'}
            {currentStep === 3 && 'Review your project details before creating.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="My Awesome Project"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Short Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Brief overview of what your project will do..."
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  rows={3}
                />
              </div>
            </>
          )}

          {currentStep === 2 && (
            <div className="space-y-2">
              <Label htmlFor="idea">Project Idea & Vision *</Label>
              <Textarea
                id="idea"
                placeholder="Describe your project idea in detail. What problem does it solve? Who is it for? What are the key features you envision?"
                value={formData.idea}
                onChange={handleInputChange('idea')}
                rows={6}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Project Summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {formData.name}
                </div>
                <div>
                  <span className="font-medium">Description:</span> {formData.description}
                </div>
                <div>
                  <span className="font-medium">Vision:</span>
                  <p className="mt-1 text-muted-foreground">{formData.idea}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
            >
              Back
            </Button>
            
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleCreateProject}
                disabled={!canProceed() || isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}