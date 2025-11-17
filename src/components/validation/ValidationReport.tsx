import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertTriangle, Info, RefreshCw, FileCheck } from 'lucide-react'
import type { ValidationResult } from '@/lib/validation'

interface ValidationReportProps {
  projectId: string
  artifacts: Record<string, string>
  onValidationComplete?: (results: ValidationResult[]) => void
}

export function ValidationReport({ projectId, artifacts, onValidationComplete }: ValidationReportProps) {
  const [results, setResults] = useState<ValidationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [validationStats, setValidationStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  })

  const runValidation = async () => {
    setLoading(true)
    try {
      const { validationEngine } = await import('@/lib/validation')
      const validationResults = await validationEngine.validateArtifacts(artifacts)
      setResults(validationResults)
      
      // Calculate stats
      const stats = {
        total: validationResults.length,
        passed: validationResults.filter(r => r.passed).length,
        failed: validationResults.filter(r => !r.passed && r.severity === 'error').length,
        warnings: validationResults.filter(r => r.severity === 'warning').length
      }
      setValidationStats(stats)
      
      onValidationComplete?.(validationResults)
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (artifacts && Object.keys(artifacts).length > 0) {
      runValidation()
    }
  }, [artifacts])

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
      return <Badge variant="secondary" className="bg-green-100 text-green-800">PASS</Badge>
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

  const getProgressColor = () => {
    if (validationStats.failed > 0) return 'bg-red-500'
    if (validationStats.warnings > 0) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const progressPercentage = validationStats.total > 0 ? 
    Math.round((validationStats.passed / validationStats.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileCheck className="h-6 w-6" />
            <span>Cross-Artifact Validation Report</span>
          </CardTitle>
          <CardDescription>
            Validate consistency across project artifacts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Validation Progress</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress 
                value={progressPercentage} 
                className={`h-3 ${getProgressColor()}`}
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{validationStats.total}</div>
                <div className="text-sm text-gray-600">Total Rules</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{validationStats.passed}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{validationStats.failed}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{validationStats.warnings}</div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
            </div>

            {/* Re-run Button */}
            <div className="flex justify-center">
              <Button 
                onClick={runValidation} 
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-run Validation
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Results</CardTitle>
          <CardDescription>
            Detailed results for each validation rule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No validation results yet. Run validation to see results.
                </AlertDescription>
              </Alert>
            ) : (
              results.map((result) => (
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
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(result)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{result.ruleId}</span>
                          {getStatusBadge(result)}
                        </div>
                        <p className="text-sm text-gray-700">{result.message}</p>
                        {result.details && (
                          <div className="mt-2 p-2 bg-white rounded border">
                            <details className="cursor-pointer">
                              <summary className="text-sm font-medium text-gray-900">
                                View Details
                              </summary>
                              <div className="mt-2 text-xs text-gray-600">
                                {Array.isArray(result.details) ? (
                                  <ul className="list-disc list-inside space-y-1">
                                    {result.details.map((detail: any, index: number) => (
                                      <li key={index}>{JSON.stringify(detail)}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(result.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}