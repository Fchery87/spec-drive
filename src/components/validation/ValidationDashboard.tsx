import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw,
  Settings,
  BarChart3
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface ValidationMetrics {
  totalValidations: number
  passedValidations: number
  failedValidations: number
  warningValidations: number
  lastValidation: string | null
  trend: 'improving' | 'declining' | 'stable'
}

interface ValidationRuleStats {
  total: number
  enabled: number
  byType: {
    requirement_api: number
    requirement_data: number
    requirement_task: number
    stack_dependency: number
  }
  bySeverity: {
    error: number
    warning: number
    info: number
  }
}

interface ValidationReport {
  id: string
  reportName: string
  overallStatus: 'pass' | 'fail' | 'warning'
  totalRules: number
  passedRules: number
  failedRules: number
  warningRules: number
  createdAt: string
}

interface ValidationDashboardProps {
  projectId: string
}

export function ValidationDashboard({ projectId }: ValidationDashboardProps) {
  const [metrics, setMetrics] = useState<ValidationMetrics | null>(null)
  const [ruleStats, setRuleStats] = useState<ValidationRuleStats | null>(null)
  const [recentReports, setRecentReports] = useState<ValidationReport[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchDashboardData = async () => {
    try {
      const data = await apiClient.getValidationDashboard(projectId)
      if (data) {
        const { metrics, ruleStats, recentReports } = data
        setMetrics(metrics)
        setRuleStats(ruleStats)
        setRecentReports(recentReports)
      }
    } catch (error) {
      console.error('Failed to fetch validation dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [projectId])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh, projectId])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
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

  const getStatusBadge = (status: string) => {
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

  const calculatePassRate = () => {
    if (!metrics || metrics.totalValidations === 0) return 0
    return Math.round((metrics.passedValidations / metrics.totalValidations) * 100)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Loading validation dashboard...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Validation Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor cross-artifact validation status and trends
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Validations</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalValidations}</div>
              <p className="text-xs text-muted-foreground">
                {calculatePassRate()}% pass rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.passedValidations}</div>
              <Progress 
                value={calculatePassRate()} 
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.failedValidations}</div>
              <p className="text-xs text-muted-foreground">
                Need attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trend</CardTitle>
              {getTrendIcon(metrics.trend)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{metrics.trend}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.lastValidation 
                  ? `Last: ${new Date(metrics.lastValidation).toLocaleDateString()}`
                  : 'No validations yet'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Rules Overview */}
      {ruleStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Validation Rules Overview</span>
            </CardTitle>
            <CardDescription>
              Current validation rule configuration and distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Rule Count */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Rule Status</h4>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold">{ruleStats.enabled}/{ruleStats.total}</div>
                  <div className="text-sm text-muted-foreground">enabled</div>
                </div>
                <Progress 
                  value={(ruleStats.enabled / ruleStats.total) * 100} 
                  className="h-2"
                />
              </div>

              {/* By Type */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">By Type</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Requirements ↔ APIs</span>
                    <span>{ruleStats.byType.requirement_api}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Requirements ↔ Data</span>
                    <span>{ruleStats.byType.requirement_data}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Requirements ↔ Tasks</span>
                    <span>{ruleStats.byType.requirement_task}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Stack ↔ Dependencies</span>
                    <span>{ruleStats.byType.stack_dependency}</span>
                  </div>
                </div>
              </div>

              {/* By Severity */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">By Severity</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Errors</span>
                    <span>{ruleStats.bySeverity.error}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600">Warnings</span>
                    <span>{ruleStats.bySeverity.warning}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600">Info</span>
                    <span>{ruleStats.bySeverity.info}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Validation Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Validation Reports</CardTitle>
          <CardDescription>
            Latest validation results and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No validation reports found. Run validation to see results.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div 
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="font-medium">{report.reportName}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(report.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm">
                        {report.passedRules}/{report.totalRules} rules passed
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {report.failedRules} errors, {report.warningRules} warnings
                      </div>
                    </div>
                    {getStatusBadge(report.overallStatus)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}