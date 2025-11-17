import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Play, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Clock,
  FileText
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface ValidationResult {
  ruleId: string
  ruleName: string
  passed: boolean
  severity: 'error' | 'warning' | 'info'
  message: string
  details?: unknown
  affectedArtifacts?: string[]
  affectedRequirements?: string[]
}

interface ValidationReport {
  id?: string
  overallStatus: 'pass' | 'fail' | 'warning'
  totalRules: number
  passedRules: number
  failedRules: number
  warningRules: number
  validationResults: ValidationResult[]
  reportMetadata?: Record<string, unknown>
}

interface ValidationRunnerProps {
  projectId: string
  phase: string
  onValidationComplete?: (report: ValidationReport) => void
}

export function ValidationRunner({ projectId, phase, onValidationComplete }: ValidationRunnerProps) {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runValidation = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.runValidation(projectId, phase)

      if (response.success) {
        const validationReport = response.data
        setReport(validationReport)
        onValidationComplete?.(validationReport)
      } else {
        setError(response.error || 'Validation failed')
      }
    } catch (err) {
      setError('Failed to run validation. Please try again.')
      console.error('Validation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (result: ValidationResult) => {
    if (result.passed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    switch (result.severity) {
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getStatusBadge = (result: ValidationResult) => {
    if (result.passed) {
      return <Badge className="bg-green-100 text-green-800">PASS</Badge>
    }
    switch (result.severity) {
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">WARNING</Badge>
      default:
        return <Badge variant="outline">INFO</Badge>
    }
  }

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'text-green-600'
      case 'fail':
        return 'text-red-600'
      case 'warning':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const getOverallStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-800">PASS</Badge>
      case 'fail':
        return <Badge variant="destructive">FAIL</Badge>
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">WARNING</Badge>
      default:
        return <Badge variant="outline">UNKNOWN</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Run Validation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-6 w-6" />
            <span>Cross-Artifact Validation</span>
          </CardTitle>
          <CardDescription>
            Run validation for {phase} phase artifacts to check for consistency and completeness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-center">
              <Button 
                onClick={runValidation} 
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Validation...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Validation
                  </>
                )}
              </Button>
            </div>
            
            {report && (
              <div className="text-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 inline mr-1" />
                Last run: {new Date().toLocaleString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Validation Results</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-normal">Overall Status:</span>
                {getOverallStatusBadge(report.overallStatus)}
              </div>
            </CardTitle>
            <CardDescription>
              {report.totalRules} validation rules executed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">{report.totalRules}</div>
                  <div className="text-sm text-gray-600">Total Rules</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{report.passedRules}</div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{report.failedRules}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{report.warningRules}</div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-3">
                <h4 className="font-medium">Detailed Results</h4>
                {report.validationResults.map((result) => (
                  <div 
                    key={result.ruleId}
                    className={`p-4 rounded-lg border ${
                      result.passed 
                        ? 'bg-green-50 border-green-200' 
                        : result.severity === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(result)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{result.ruleName}</span>
                          {getStatusBadge(result)}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                        
                        {result.affectedArtifacts && result.affectedArtifacts.length > 0 && (
                          <div className="text-xs text-gray-600 mb-2">
                            <strong>Affected Artifacts:</strong> {result.affectedArtifacts.join(', ')}
                          </div>
                        )}
                        
                        {result.affectedRequirements && result.affectedRequirements.length > 0 && (
                          <div className="text-xs text-gray-600 mb-2">
                            <strong>Affected Requirements:</strong> {result.affectedRequirements.join(', ')}
                          </div>
                        )}

                        {result.details && (
                          <details className="cursor-pointer">
                            <summary className="text-sm font-medium text-gray-900 hover:text-gray-700">
                              View Details
                            </summary>
                            <div className="mt-2 p-2 bg-white rounded border text-xs">
                              <pre className="whitespace-pre-wrap text-gray-600">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}