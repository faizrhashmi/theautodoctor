import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 3,
  },
  section: {
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    borderBottom: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '40%',
    fontSize: 10,
    color: '#64748b',
  },
  value: {
    width: '60%',
    fontSize: 10,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  gradeBox: {
    backgroundColor: '#dbeafe',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
  },
  gradeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 5,
  },
  gradeLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
    fontSize: 9,
  },
  tableCell: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#64748b',
    borderTop: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 10,
  },
  alert: {
    backgroundColor: '#fef2f2',
    border: 1,
    borderColor: '#ef4444',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  alertText: {
    color: '#991b1b',
    fontSize: 10,
  },
})

interface PIPEDAReportData {
  report_title: string
  logo_url?: string
  report_period: {
    start_date: string
    end_date: string
  }
  generated_at: string
  generated_by: string
  compliance_score: {
    total_customers: number
    compliant_customers: number
    non_compliant_customers: number
    compliance_score: number
    compliance_grade: string
  }
  consent_summary: {
    total_consents: number
    active_consents: number
    withdrawn_consents: number
    marketing_opt_in_rate: number
  }
  data_access_requests: {
    total_requests: number
    completed_on_time: number
    overdue_requests: number
    average_response_days: number
  }
  account_deletions: {
    pending: number
    completed: number
    rejected: number
  }
  data_breaches: {
    total_incidents: number
    critical_high: number
    commissioner_notified: number
    customers_notified: number
  }
}

export const PIPEDAComplianceReportPDF = ({ data }: { data: PIPEDAReportData }) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return '#10b981'
    if (grade.startsWith('B')) return '#3b82f6'
    if (grade.startsWith('C')) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Image
              style={styles.logo}
              src={data.logo_url || '/logo.png'}
            />
            <View style={styles.titleSection}>
              <Text style={styles.title}>PIPEDA Compliance Report</Text>
              <Text style={styles.subtitle}>TheAutoDoctor Platform</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Report Period: {formatDate(data.report_period.start_date)} to{' '}
            {formatDate(data.report_period.end_date)}
          </Text>
          <Text style={styles.subtitle}>Generated: {formatDate(data.generated_at)}</Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.gradeBox}>
            <Text
              style={[
                styles.gradeText,
                { color: getGradeColor(data.compliance_score.compliance_grade) },
              ]}
            >
              {data.compliance_score.compliance_grade}
            </Text>
            <Text style={styles.gradeLabel}>
              Overall Compliance Score: {data.compliance_score.compliance_score.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Customers:</Text>
            <Text style={styles.value}>{data.compliance_score.total_customers}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fully Compliant:</Text>
            <Text style={styles.value}>{data.compliance_score.compliant_customers}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Non-Compliant:</Text>
            <Text style={styles.value}>{data.compliance_score.non_compliant_customers}</Text>
          </View>
        </View>

        {/* Consent Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consent Management (PIPEDA Principle 3)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Consent Records:</Text>
            <Text style={styles.value}>{data.consent_summary.total_consents}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Active Consents:</Text>
            <Text style={styles.value}>{data.consent_summary.active_consents}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Withdrawn Consents:</Text>
            <Text style={styles.value}>{data.consent_summary.withdrawn_consents}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Marketing Opt-in Rate:</Text>
            <Text style={styles.value}>{data.consent_summary.marketing_opt_in_rate.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Data Access Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Access Requests (PIPEDA Principle 9)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Requests:</Text>
            <Text style={styles.value}>{data.data_access_requests.total_requests}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Completed On Time (30 days):</Text>
            <Text style={styles.value}>{data.data_access_requests.completed_on_time}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Overdue Requests:</Text>
            <Text style={styles.value}>{data.data_access_requests.overdue_requests}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Average Response Time:</Text>
            <Text style={styles.value}>{data.data_access_requests.average_response_days} days</Text>
          </View>

          {data.data_access_requests.overdue_requests > 0 && (
            <View style={styles.alert}>
              <Text style={styles.alertText}>
                ⚠️ WARNING: {data.data_access_requests.overdue_requests} overdue data access
                requests exceed PIPEDA 30-day requirement. Immediate action required to avoid
                Privacy Commissioner complaints.
              </Text>
            </View>
          )}
        </View>

        {/* Account Deletions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Deletion Requests (Right to Erasure)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Pending Review:</Text>
            <Text style={styles.value}>{data.account_deletions.pending}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Completed:</Text>
            <Text style={styles.value}>{data.account_deletions.completed}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Rejected:</Text>
            <Text style={styles.value}>{data.account_deletions.rejected}</Text>
          </View>
        </View>

        {/* Data Breaches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Breach Incidents (PIPEDA Breach Reporting)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Incidents:</Text>
            <Text style={styles.value}>{data.data_breaches.total_incidents}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Critical/High Severity:</Text>
            <Text style={styles.value}>{data.data_breaches.critical_high}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Privacy Commissioner Notified:</Text>
            <Text style={styles.value}>{data.data_breaches.commissioner_notified}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Customers Notified:</Text>
            <Text style={styles.value}>{data.data_breaches.customers_notified}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This report is confidential and intended for compliance purposes only.
          </Text>
          <Text>Generated by TheAutoDoctor Compliance System on {formatDate(data.generated_at)}</Text>
          <Text>Report ID: PIPEDA-{new Date(data.generated_at).getTime()}</Text>
        </View>
      </Page>
    </Document>
  )
}
