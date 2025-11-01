import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#10b981',
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
    color: '#059669',
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
    width: '50%',
    fontSize: 10,
    color: '#64748b',
  },
  value: {
    width: '50%',
    fontSize: 10,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  statsBox: {
    backgroundColor: '#d1fae5',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 10,
  },
  statsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 5,
  },
  statsLabel: {
    fontSize: 11,
    color: '#064e3b',
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 3,
  },
  checkmark: {
    width: 20,
    fontSize: 14,
    color: '#10b981',
    marginRight: 10,
  },
  itemText: {
    flex: 1,
    fontSize: 10,
    color: '#334155',
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
  warning: {
    backgroundColor: '#fef3c7',
    border: 1,
    borderColor: '#f59e0b',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  warningText: {
    color: '#92400e',
    fontSize: 10,
  },
})

interface CASLReportData {
  report_title: string
  logo_url?: string
  report_period: {
    start_date: string
    end_date: string
  }
  generated_at: string
  marketing_consent: {
    total_customers: number
    opted_in: number
    opted_out: number
    opt_in_rate: number
    withdrawal_rate: number
  }
  consent_methods: {
    signup: number
    settings_page: number
    quote_acceptance: number
  }
  email_compliance: {
    emails_sent: number
    unsubscribe_requests: number
    bounces: number
    spam_complaints: number
  }
  recent_activity: {
    new_opt_ins: number
    new_opt_outs: number
    net_change: number
  }
}

export const CASLComplianceReportPDF = ({ data }: { data: CASLReportData }) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
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
              <Text style={styles.title}>CASL Compliance Report</Text>
              <Text style={styles.subtitle}>Canada's Anti-Spam Legislation</Text>
              <Text style={styles.subtitle}>TheAutoDoctor Platform</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Report Period: {formatDate(data.report_period.start_date)} to{' '}
            {formatDate(data.report_period.end_date)}
          </Text>
          <Text style={styles.subtitle}>Generated: {formatDate(data.generated_at)}</Text>
        </View>

        {/* Marketing Consent Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Marketing Consent Overview</Text>
          <View style={styles.statsBox}>
            <Text style={styles.statsText}>{data.marketing_consent.opt_in_rate.toFixed(1)}%</Text>
            <Text style={styles.statsLabel}>Marketing Consent Opt-in Rate</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Customers:</Text>
            <Text style={styles.value}>{data.marketing_consent.total_customers}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Opted In:</Text>
            <Text style={styles.value}>{data.marketing_consent.opted_in}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Opted Out:</Text>
            <Text style={styles.value}>{data.marketing_consent.opted_out}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Withdrawal Rate:</Text>
            <Text style={styles.value}>{data.marketing_consent.withdrawal_rate.toFixed(2)}%</Text>
          </View>
        </View>

        {/* CASL Compliance Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CASL Compliance Requirements</Text>
          <View style={styles.complianceItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.itemText}>
              Explicit consent obtained before sending commercial electronic messages
            </Text>
          </View>
          <View style={styles.complianceItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.itemText}>
              Clear identification of sender in all messages
            </Text>
          </View>
          <View style={styles.complianceItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.itemText}>
              Functional unsubscribe mechanism in every message
            </Text>
          </View>
          <View style={styles.complianceItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.itemText}>
              Consent records maintained for 3 years minimum
            </Text>
          </View>
          <View style={styles.complianceItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.itemText}>
              Unsubscribe requests processed within 10 business days
            </Text>
          </View>
        </View>

        {/* Consent Collection Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consent Collection Methods</Text>
          <View style={styles.row}>
            <Text style={styles.label}>At Account Signup:</Text>
            <Text style={styles.value}>{data.consent_methods.signup} consents</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Via Settings Page:</Text>
            <Text style={styles.value}>{data.consent_methods.settings_page} consents</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>At Quote Acceptance:</Text>
            <Text style={styles.value}>{data.consent_methods.quote_acceptance} consents</Text>
          </View>
        </View>

        {/* Email Marketing Compliance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Marketing Compliance</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Marketing Emails Sent:</Text>
            <Text style={styles.value}>{data.email_compliance.emails_sent}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Unsubscribe Requests:</Text>
            <Text style={styles.value}>{data.email_compliance.unsubscribe_requests}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email Bounces:</Text>
            <Text style={styles.value}>{data.email_compliance.bounces}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Spam Complaints:</Text>
            <Text style={styles.value}>{data.email_compliance.spam_complaints}</Text>
          </View>

          {data.email_compliance.spam_complaints > 0 && (
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                ⚠️ WARNING: {data.email_compliance.spam_complaints} spam complaints received.
                Review sending practices to maintain CASL compliance.
              </Text>
            </View>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity (Reporting Period)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>New Opt-ins:</Text>
            <Text style={styles.value}>+{data.recent_activity.new_opt_ins}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>New Opt-outs:</Text>
            <Text style={styles.value}>-{data.recent_activity.new_opt_outs}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Net Change:</Text>
            <Text style={styles.value}>
              {data.recent_activity.net_change >= 0 ? '+' : ''}
              {data.recent_activity.net_change}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>CASL Compliance Report - Confidential</Text>
          <Text>Generated by TheAutoDoctor Compliance System on {formatDate(data.generated_at)}</Text>
          <Text>Report ID: CASL-{new Date(data.generated_at).getTime()}</Text>
          <Text style={{ marginTop: 5 }}>
            CASL requires maintaining consent records for minimum 3 years from consent withdrawal.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
