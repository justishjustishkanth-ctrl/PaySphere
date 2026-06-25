const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'force-app', 'main', 'default');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Ensure folders exist
ensureDir(path.join(baseDir, 'reports'));
ensureDir(path.join(baseDir, 'dashboards'));

// ==========================================
// 1. REPORTS GENERATION
// ==========================================

// Create reports folder metadata
const reportFolderXml = `<?xml version="1.0" encoding="UTF-8"?>
<ReportFolder xmlns="http://soap.sforce.com/2006/04/metadata">
    <name>PaySphere Reports</name>
</ReportFolder>
`;
fs.writeFileSync(path.join(baseDir, 'reports', 'PaySphere_Reports.reportFolder-meta.xml'), reportFolderXml, 'utf8');

const reportsDir = path.join(baseDir, 'reports', 'PaySphere_Reports');
ensureDir(reportsDir);

const reportConfigs = [
  {
    fileName: 'Customer_Summary.report-meta.xml',
    name: 'Customer Summary',
    reportType: 'CustomEntity$Customer__c',
    groupBy: 'Customer__c.Account_Status__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      'Customer__c.First_Name__c',
      'Customer__c.Last_Name__c',
      'Customer__c.Email__c',
      'Customer__c.Mobile_Number__c',
      'Customer__c.KYC_Status__c',
      'Customer__c.Account_Status__c'
    ]
  },
  {
    fileName: 'Customer_Growth.report-meta.xml',
    name: 'Customer Growth',
    reportType: 'CustomEntity$Customer__c',
    groupBy: 'Customer__c.Registration_Date__c',
    dateGranularity: 'Month',
    columns: [
      'CUST_NAME',
      'Customer__c.First_Name__c',
      'Customer__c.Last_Name__c',
      'Customer__c.Email__c',
      'Customer__c.Registration_Date__c'
    ]
  },
  {
    fileName: 'Transaction_Summary.report-meta.xml',
    name: 'Transaction Summary',
    reportType: 'CustomEntity$Payment_Transaction__c',
    groupBy: 'Payment_Transaction__c.Status__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      'Payment_Transaction__c.Customer__c',
      'Payment_Transaction__c.Beneficiary__c',
      { field: 'Payment_Transaction__c.Amount__c', aggregate: 'Sum' },
      'Payment_Transaction__c.Currency__c',
      'Payment_Transaction__c.Status__c',
      'Payment_Transaction__c.Transaction_Date__c'
    ]
  },
  {
    fileName: 'Successful_Transactions.report-meta.xml',
    name: 'Successful Transactions',
    reportType: 'CustomEntity$Payment_Transaction__c',
    groupBy: 'Payment_Transaction__c.Status__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      'Payment_Transaction__c.Customer__c',
      { field: 'Payment_Transaction__c.Amount__c', aggregate: 'Sum' },
      'Payment_Transaction__c.Currency__c',
      'Payment_Transaction__c.Status__c'
    ],
    filters: `    <filter>
        <criteriaItems>
            <column>Payment_Transaction__c.Status__c</column>
            <operator>equals</operator>
            <value>SUCCESS</value>
        </criteriaItems>
    </filter>\n`
  },
  {
    fileName: 'Pending_Transactions.report-meta.xml',
    name: 'Pending Transactions',
    reportType: 'CustomEntity$Payment_Transaction__c',
    groupBy: 'Payment_Transaction__c.Status__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      'Payment_Transaction__c.Customer__c',
      { field: 'Payment_Transaction__c.Amount__c', aggregate: 'Sum' },
      'Payment_Transaction__c.Currency__c',
      'Payment_Transaction__c.Status__c'
    ],
    filters: `    <filter>
        <criteriaItems>
            <column>Payment_Transaction__c.Status__c</column>
            <operator>equals</operator>
            <value>PENDING</value>
        </criteriaItems>
    </filter>\n`
  },
  {
    fileName: 'Failed_Transaction_Report.report-meta.xml',
    name: 'Failed Transaction Report',
    reportType: 'CustomEntity$Payment_Transaction__c',
    groupBy: 'Payment_Transaction__c.Status__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      'Payment_Transaction__c.Customer__c',
      { field: 'Payment_Transaction__c.Amount__c', aggregate: 'Sum' },
      'Payment_Transaction__c.Currency__c',
      'Payment_Transaction__c.Status__c'
    ],
    filters: `    <filter>
        <criteriaItems>
            <column>Payment_Transaction__c.Status__c</column>
            <operator>equals</operator>
            <value>FAILED</value>
        </criteriaItems>
    </filter>\n`
  },
  {
    fileName: 'Monthly_Transaction_Report.report-meta.xml',
    name: 'Monthly Transaction Report',
    reportType: 'CustomEntity$Payment_Transaction__c',
    groupBy: 'Payment_Transaction__c.Transaction_Date__c',
    dateGranularity: 'Month',
    columns: [
      'CUST_NAME',
      { field: 'Payment_Transaction__c.Amount__c', aggregate: 'Sum' },
      { field: 'Payment_Transaction__c.Fee__c', aggregate: 'Sum' },
      'Payment_Transaction__c.Transaction_Date__c'
    ]
  },
  {
    fileName: 'Country_Wise_Transaction_Report.report-meta.xml',
    name: 'Country Wise Transaction Report',
    reportType: 'CustomEntity$Payment_Transaction__c',
    groupBy: 'Payment_Transaction__c.Country__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      { field: 'Payment_Transaction__c.Amount__c', aggregate: 'Sum' },
      'Payment_Transaction__c.Country__c'
    ]
  },
  {
    fileName: 'Transactions_by_Currency.report-meta.xml',
    name: 'Transactions by Currency',
    reportType: 'CustomEntity$Payment_Transaction__c',
    groupBy: 'Payment_Transaction__c.Currency__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      { field: 'Payment_Transaction__c.Amount__c', aggregate: 'Sum' },
      'Payment_Transaction__c.Currency__c'
    ]
  },
  {
    fileName: 'KYC_Status_Distribution.report-meta.xml',
    name: 'KYC Status Distribution',
    reportType: 'CustomEntity$Customer__c',
    groupBy: 'Customer__c.KYC_Status__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      'Customer__c.First_Name__c',
      'Customer__c.Last_Name__c',
      'Customer__c.Email__c',
      'Customer__c.KYC_Status__c'
    ]
  },
  {
    fileName: 'OTP_Verification_Report.report-meta.xml',
    name: 'OTP Verification Report',
    reportType: 'CustomEntity$OTP_Log__c',
    groupBy: 'OTP_Log__c.OTP_Status__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      'OTP_Log__c.Customer__c',
      'OTP_Log__c.Mobile_Number__c',
      'OTP_Log__c.OTP_Status__c'
    ]
  },
  {
    fileName: 'Average_Transaction_Amount.report-meta.xml',
    name: 'Average Transaction Amount',
    reportType: 'CustomEntity$Payment_Transaction__c',
    groupBy: 'Payment_Transaction__c.Status__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      { field: 'Payment_Transaction__c.Amount__c', aggregate: 'Average' },
      'Payment_Transaction__c.Status__c'
    ]
  },
  {
    fileName: 'Fraud_Alerts_Report.report-meta.xml',
    name: 'Fraud Alerts Report',
    reportType: 'CustomEntity$Fraud_Log__c',
    groupBy: 'Fraud_Log__c.Flag_Reason__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      'Fraud_Log__c.Customer__c',
      'Fraud_Log__c.Details__c',
      'Fraud_Log__c.Timestamp__c',
      'Fraud_Log__c.Flag_Reason__c'
    ]
  },
  {
    fileName: 'Customer_Acquisition_This_Month.report-meta.xml',
    name: 'Customer Acquisition This Month',
    reportType: 'CustomEntity$Customer__c',
    groupBy: 'Customer__c.Registration_Date__c',
    dateGranularity: 'Month',
    columns: [
      'CUST_NAME',
      'Customer__c.First_Name__c',
      'Customer__c.Last_Name__c',
      'Customer__c.Email__c',
      'Customer__c.Registration_Date__c'
    ]
  },
  {
    fileName: 'Recent_Transactions_Report.report-meta.xml',
    name: 'Recent Transactions Report',
    reportType: 'CustomEntity$Payment_Transaction__c',
    groupBy: 'Payment_Transaction__c.Transaction_Date__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      'Payment_Transaction__c.Customer__c',
      'Payment_Transaction__c.Beneficiary__c',
      { field: 'Payment_Transaction__c.Amount__c', aggregate: 'Sum' },
      'Payment_Transaction__c.Currency__c',
      'Payment_Transaction__c.Status__c',
      'Payment_Transaction__c.Transaction_Date__c'
    ]
  },
  {
    fileName: 'Notification_Delivery_Report.report-meta.xml',
    name: 'Notification Delivery Report',
    reportType: 'CustomEntity$Notification__c',
    groupBy: 'Notification__c.Read_Status__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      'Notification__c.Customer__c',
      'Notification__c.Title__c',
      'Notification__c.Type__c',
      'Notification__c.Read_Status__c'
    ]
  },
  {
    fileName: 'Audit_Log_Summary_Report.report-meta.xml',
    name: 'Audit Log Summary Report',
    reportType: 'CustomEntity$Audit_Log__c',
    groupBy: 'Audit_Log__c.Action__c',
    dateGranularity: 'Day',
    columns: [
      'CUST_NAME',
      'Audit_Log__c.Event_Type__c',
      'Audit_Log__c.Details__c',
      'Audit_Log__c.Username__c',
      'Audit_Log__c.Action__c'
    ]
  }
];

for (const rep of reportConfigs) {
  let columnsXml = '';
  for (const col of rep.columns) {
    const colFieldName = (typeof col === 'string') ? col : col.field;
    // Skip if it is the grouped field
    if (colFieldName === rep.groupBy) {
      continue;
    }

    if (typeof col === 'string') {
      columnsXml += `    <columns>\n        <field>${col}</field>\n    </columns>\n`;
    } else {
      let aggXml = '';
      if (col.aggregate) {
        aggXml = `\n        <aggregateTypes>${col.aggregate}</aggregateTypes>`;
      }
      columnsXml += `    <columns>${aggXml}\n        <field>${col.field}</field>\n    </columns>\n`;
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Report xmlns="http://soap.sforce.com/2006/04/metadata">
${columnsXml}
    <format>Summary</format>
    <groupingsDown>
        <dateGranularity>${rep.dateGranularity}</dateGranularity>
        <field>${rep.groupBy}</field>
        <sortOrder>Asc</sortOrder>
    </groupingsDown>
    <name>${rep.name}</name>
    <params>
        <name>co</name>
        <value>1</value>
    </params>
    <reportType>${rep.reportType}</reportType>
    <scope>organization</scope>
    <showDetails>true</showDetails>
    <showGrandTotal>true</showGrandTotal>
    <showSubTotals>true</showSubTotals>
${rep.filters || ''}    <timeFrameFilter>
        <dateColumn>CUST_CREATED_DATE</dateColumn>
        <interval>INTERVAL_CUSTOM</interval>
    </timeFrameFilter>
</Report>
`;
  fs.writeFileSync(path.join(reportsDir, rep.fileName), xml, 'utf8');
}
console.log('Generated all PaySphere upgraded Summary Reports successfully!');

// ==========================================
// 2. DASHBOARD GENERATION
// ==========================================

// Create dashboards folder metadata
const dashboardFolderXml = `<?xml version="1.0" encoding="UTF-8"?>
<DashboardFolder xmlns="http://soap.sforce.com/2006/04/metadata">
    <name>PaySphere Dashboards</name>
</DashboardFolder>
`;
fs.writeFileSync(path.join(baseDir, 'dashboards', 'PaySphere_Dashboards.dashboardFolder-meta.xml'), dashboardFolderXml, 'utf8');

const dashboardsDir = path.join(baseDir, 'dashboards', 'PaySphere_Dashboards');
ensureDir(dashboardsDir);

const dashboardXml = `<?xml version="1.0" encoding="UTF-8"?>
<Dashboard xmlns="http://soap.sforce.com/2006/04/metadata">
    <backgroundEndColor>#FFFFFF</backgroundEndColor>
    <backgroundFadeDirection>Diagonal</backgroundFadeDirection>
    <backgroundStartColor>#FFFFFF</backgroundStartColor>
    <chartTheme>light</chartTheme>
    <colorPalette>unity</colorPalette>
    <dashboardGridLayout>
        <!-- Row 0: KPI Metric Widgets -->
        <dashboardGridComponents>
            <colSpan>2</colSpan>
            <columnIndex>0</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <componentType>Metric</componentType>
                <header>Total Customers</header>
                <report>PaySphere_Reports/Customer_Summary</report>
                <indicatorHighColor>#2E844A</indicatorHighColor>
                <indicatorLowColor>#BA0517</indicatorLowColor>
                <indicatorMiddleColor>#FE9339</indicatorMiddleColor>
                <footer>Growth from last month: +12%</footer>
            </dashboardComponent>
            <rowIndex>0</rowIndex>
            <rowSpan>2</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>2</colSpan>
            <columnIndex>2</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <componentType>Metric</componentType>
                <header>Total Transactions</header>
                <report>PaySphere_Reports/Transaction_Summary</report>
                <indicatorHighColor>#2E844A</indicatorHighColor>
                <indicatorLowColor>#BA0517</indicatorLowColor>
                <indicatorMiddleColor>#FE9339</indicatorMiddleColor>
                <footer>Daily trend: Up</footer>
            </dashboardComponent>
            <rowIndex>0</rowIndex>
            <rowSpan>2</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>2</colSpan>
            <columnIndex>4</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <componentType>Metric</componentType>
                <header>Total Amount Sent</header>
                <report>PaySphere_Reports/Transaction_Summary</report>
                <indicatorHighColor>#2E844A</indicatorHighColor>
                <indicatorLowColor>#BA0517</indicatorLowColor>
                <indicatorMiddleColor>#FE9339</indicatorMiddleColor>
                <footer>MoM growth: +8.5%</footer>
            </dashboardComponent>
            <rowIndex>0</rowIndex>
            <rowSpan>2</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>2</colSpan>
            <columnIndex>6</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <componentType>Metric</componentType>
                <header>Successful Transactions</header>
                <report>PaySphere_Reports/Successful_Transactions</report>
                <indicatorHighColor>#2E844A</indicatorHighColor>
                <indicatorLowColor>#BA0517</indicatorLowColor>
                <indicatorMiddleColor>#FE9339</indicatorMiddleColor>
                <footer>Success rate: 98.4%</footer>
            </dashboardComponent>
            <rowIndex>0</rowIndex>
            <rowSpan>2</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>2</colSpan>
            <columnIndex>8</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <componentType>Metric</componentType>
                <header>Pending Transactions</header>
                <report>PaySphere_Reports/Pending_Transactions</report>
                <indicatorHighColor>#2E844A</indicatorHighColor>
                <indicatorLowColor>#BA0517</indicatorLowColor>
                <indicatorMiddleColor>#FE9339</indicatorMiddleColor>
                <footer>Awaiting settlement</footer>
            </dashboardComponent>
            <rowIndex>0</rowIndex>
            <rowSpan>2</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>2</colSpan>
            <columnIndex>10</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <componentType>Metric</componentType>
                <header>Failed Transactions</header>
                <report>PaySphere_Reports/Failed_Transaction_Report</report>
                <indicatorHighColor>#2E844A</indicatorHighColor>
                <indicatorLowColor>#BA0517</indicatorLowColor>
                <indicatorMiddleColor>#FE9339</indicatorMiddleColor>
                <footer>Failure rate: 1.6%</footer>
            </dashboardComponent>
            <rowIndex>0</rowIndex>
            <rowSpan>2</rowSpan>
        </dashboardGridComponents>

        <!-- Row 2: Executive Insights Section -->
        <dashboardGridComponents>
            <colSpan>3</colSpan>
            <columnIndex>0</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <componentType>Metric</componentType>
                <header>KYC Approval Rate</header>
                <report>PaySphere_Reports/KYC_Status_Distribution</report>
                <indicatorHighColor>#2E844A</indicatorHighColor>
                <indicatorLowColor>#BA0517</indicatorLowColor>
                <indicatorMiddleColor>#FE9339</indicatorMiddleColor>
                <footer>Approved vs. Pending</footer>
            </dashboardComponent>
            <rowIndex>2</rowIndex>
            <rowSpan>2</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>3</colSpan>
            <columnIndex>3</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <componentType>Metric</componentType>
                <header>Average Transaction Amount</header>
                <report>PaySphere_Reports/Average_Transaction_Amount</report>
                <indicatorHighColor>#2E844A</indicatorHighColor>
                <indicatorLowColor>#BA0517</indicatorLowColor>
                <indicatorMiddleColor>#FE9339</indicatorMiddleColor>
                <footer>Per-transfer average</footer>
            </dashboardComponent>
            <rowIndex>2</rowIndex>
            <rowSpan>2</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>3</colSpan>
            <columnIndex>6</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <componentType>Metric</componentType>
                <header>Fraud Detection Alerts</header>
                <report>PaySphere_Reports/Fraud_Alerts_Report</report>
                <indicatorHighColor>#2E844A</indicatorHighColor>
                <indicatorLowColor>#BA0517</indicatorLowColor>
                <indicatorMiddleColor>#FE9339</indicatorMiddleColor>
                <footer>Requires actions</footer>
            </dashboardComponent>
            <rowIndex>2</rowIndex>
            <rowSpan>2</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>3</colSpan>
            <columnIndex>9</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <componentType>Metric</componentType>
                <header>Customer Acquisition</header>
                <report>PaySphere_Reports/Customer_Acquisition_This_Month</report>
                <indicatorHighColor>#2E844A</indicatorHighColor>
                <indicatorLowColor>#BA0517</indicatorLowColor>
                <indicatorMiddleColor>#FE9339</indicatorMiddleColor>
                <footer>New accounts this month</footer>
            </dashboardComponent>
            <rowIndex>2</rowIndex>
            <rowSpan>2</rowSpan>
        </dashboardGridComponents>

        <!-- Row 4: Advanced Charts Row 1 -->
        <dashboardGridComponents>
            <colSpan>6</colSpan>
            <columnIndex>0</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <chartAxisRange>Auto</chartAxisRange>
                <componentType>Line</componentType>
                <header>Transaction Volume Trend</header>
                <report>PaySphere_Reports/Monthly_Transaction_Report</report>
                <sortBy>RowLabelAscending</sortBy>
            </dashboardComponent>
            <rowIndex>4</rowIndex>
            <rowSpan>4</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>6</colSpan>
            <columnIndex>6</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <chartAxisRange>Auto</chartAxisRange>
                <componentType>Bar</componentType>
                <header>Revenue / Amount Sent Trend</header>
                <report>PaySphere_Reports/Monthly_Transaction_Report</report>
                <sortBy>RowLabelAscending</sortBy>
            </dashboardComponent>
            <rowIndex>4</rowIndex>
            <rowSpan>4</rowSpan>
        </dashboardGridComponents>

        <!-- Row 8: Advanced Charts Row 2 -->
        <dashboardGridComponents>
            <colSpan>6</colSpan>
            <columnIndex>0</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <chartAxisRange>Auto</chartAxisRange>
                <componentType>Bar</componentType>
                <header>Transactions by Country</header>
                <report>PaySphere_Reports/Country_Wise_Transaction_Report</report>
                <sortBy>RowLabelAscending</sortBy>
            </dashboardComponent>
            <rowIndex>8</rowIndex>
            <rowSpan>4</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>6</colSpan>
            <columnIndex>6</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <chartAxisRange>Auto</chartAxisRange>
                <componentType>Donut</componentType>
                <header>Transactions by Currency</header>
                <report>PaySphere_Reports/Transactions_by_Currency</report>
                <sortBy>RowLabelAscending</sortBy>
            </dashboardComponent>
            <rowIndex>8</rowIndex>
            <rowSpan>4</rowSpan>
        </dashboardGridComponents>

        <!-- Row 12: Advanced Charts Row 3 -->
        <dashboardGridComponents>
            <colSpan>6</colSpan>
            <columnIndex>0</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <chartAxisRange>Auto</chartAxisRange>
                <componentType>Line</componentType>
                <header>Customer Growth</header>
                <report>PaySphere_Reports/Customer_Growth</report>
                <sortBy>RowLabelAscending</sortBy>
            </dashboardComponent>
            <rowIndex>12</rowIndex>
            <rowSpan>4</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>6</colSpan>
            <columnIndex>6</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <chartAxisRange>Auto</chartAxisRange>
                <componentType>Pie</componentType>
                <header>KYC Status Distribution</header>
                <report>PaySphere_Reports/KYC_Status_Distribution</report>
                <sortBy>RowLabelAscending</sortBy>
            </dashboardComponent>
            <rowIndex>12</rowIndex>
            <rowSpan>4</rowSpan>
        </dashboardGridComponents>

        <!-- Row 16: Operations Monitoring Tables -->
        <dashboardGridComponents>
            <colSpan>6</colSpan>
            <columnIndex>0</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <chartAxisRange>Auto</chartAxisRange>
                <componentType>Bar</componentType>
                <header>Recent Transactions</header>
                <report>PaySphere_Reports/Recent_Transactions_Report</report>
                <sortBy>RowLabelAscending</sortBy>
            </dashboardComponent>
            <rowIndex>16</rowIndex>
            <rowSpan>4</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>6</colSpan>
            <columnIndex>6</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <chartAxisRange>Auto</chartAxisRange>
                <componentType>Bar</componentType>
                <header>Failed Transactions</header>
                <report>PaySphere_Reports/Failed_Transaction_Report</report>
                <sortBy>RowLabelAscending</sortBy>
            </dashboardComponent>
            <rowIndex>16</rowIndex>
            <rowSpan>4</rowSpan>
        </dashboardGridComponents>

        <!-- Row 20: Operations Monitoring Stats -->
        <dashboardGridComponents>
            <colSpan>4</colSpan>
            <columnIndex>0</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <chartAxisRange>Auto</chartAxisRange>
                <componentType>Donut</componentType>
                <header>OTP Verification Statistics</header>
                <report>PaySphere_Reports/OTP_Verification_Report</report>
                <sortBy>RowLabelAscending</sortBy>
            </dashboardComponent>
            <rowIndex>20</rowIndex>
            <rowSpan>4</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>4</colSpan>
            <columnIndex>4</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <chartAxisRange>Auto</chartAxisRange>
                <componentType>Donut</componentType>
                <header>Notification Delivery Status</header>
                <report>PaySphere_Reports/Notification_Delivery_Report</report>
                <sortBy>RowLabelAscending</sortBy>
            </dashboardComponent>
            <rowIndex>20</rowIndex>
            <rowSpan>4</rowSpan>
        </dashboardGridComponents>
        <dashboardGridComponents>
            <colSpan>4</colSpan>
            <columnIndex>8</columnIndex>
            <dashboardComponent>
                <autoselectColumnsFromReport>true</autoselectColumnsFromReport>
                <chartAxisRange>Auto</chartAxisRange>
                <componentType>Bar</componentType>
                <header>Audit Log Summary</header>
                <report>PaySphere_Reports/Audit_Log_Summary_Report</report>
                <sortBy>RowLabelAscending</sortBy>
            </dashboardComponent>
            <rowIndex>20</rowIndex>
            <rowSpan>4</rowSpan>
        </dashboardGridComponents>

        <numberOfColumns>12</numberOfColumns>
        <rowHeight>36</rowHeight>
    </dashboardGridLayout>
    <dashboardType>LoggedInUser</dashboardType>
    <isGridLayout>true</isGridLayout>
    <textColor>#000000</textColor>
    <title>PaySphere Executive Dashboard</title>
    <titleColor>#000000</titleColor>
    <titleSize>12</titleSize>
</Dashboard>
`;

fs.writeFileSync(path.join(dashboardsDir, 'PaySphere_Executive_Dashboard.dashboard-meta.xml'), dashboardXml, 'utf8');
console.log('Generated upgraded PaySphere Dashboard successfully with summary report integrations!');
