const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'force-app', 'main', 'default');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Custom Objects basic definitions (All 14 custom objects)
const objectsList = {
  Customer__c: { label: 'Customer', plural: 'Customers', nameFieldLabel: 'Customer Name', nameFieldType: 'Text' },
  Beneficiary__c: { label: 'Beneficiary', plural: 'Beneficiaries', nameFieldLabel: 'Beneficiary Name', nameFieldType: 'Text' },
  Payment_Transaction__c: { label: 'Payment Transaction', plural: 'Payment Transactions', nameFieldLabel: 'Transaction Name', nameFieldType: 'Text' },
  OTP_Log__c: { label: 'OTP Log', plural: 'OTP Logs', nameFieldLabel: 'OTP Log Name', nameFieldType: 'Text' },
  Notification__c: { label: 'Notification', plural: 'Notifications', nameFieldLabel: 'Notification Name', nameFieldType: 'Text' },
  Audit_Log__c: { label: 'Audit Log', plural: 'Audit Logs', nameFieldLabel: 'Audit Log Name', nameFieldType: 'Text' },
  TransferRequest__c: { label: 'Transfer Request', plural: 'Transfer Requests', nameFieldLabel: 'Transfer Request Name', nameFieldType: 'AutoNumber', displayFormat: 'TR-{0000}' },
  Payment__c: { label: 'Payment', plural: 'Payments', nameFieldLabel: 'Payment Name', nameFieldType: 'AutoNumber', displayFormat: 'PAY-{0000}' },
  Transaction__c: { label: 'Transaction', plural: 'Transactions', nameFieldLabel: 'Transaction ID', nameFieldType: 'AutoNumber', displayFormat: 'TXN-{0000}' },
  Fraud_Log__c: { label: 'Fraud Log', plural: 'Fraud Logs', nameFieldLabel: 'Fraud Log ID', nameFieldType: 'AutoNumber', displayFormat: 'FL-{0000}' },
  TransferApproval__c: { label: 'Transfer Approval', plural: 'Transfer Approvals', nameFieldLabel: 'Approval ID', nameFieldType: 'AutoNumber', displayFormat: 'APR-{0000}' },
  ExchangeRate__c: { label: 'Exchange Rate', plural: 'Exchange Rates', nameFieldLabel: 'Exchange Rate ID', nameFieldType: 'AutoNumber', displayFormat: 'ER-{0000}' },
  Webhook_Log__c: { label: 'Webhook Log', plural: 'Webhook Logs', nameFieldLabel: 'Webhook Log ID', nameFieldType: 'AutoNumber', displayFormat: 'WH-{0000}' },
  KYC__c: { label: 'KYC', plural: 'KYC Verification', nameFieldLabel: 'KYC Document Name', nameFieldType: 'Text' }
};

// Write object-meta.xml for each custom object to enable reports, activities, search, and history
for (const [objName, objDef] of Object.entries(objectsList)) {
  const objMetaDir = path.join(baseDir, 'objects', objName);
  ensureDir(objMetaDir);

  let nameFieldXml = '';
  if (objDef.nameFieldType === 'AutoNumber') {
    nameFieldXml = `    <nameField>
        <label>${objDef.nameFieldLabel}</label>
        <type>AutoNumber</type>
        <displayFormat>${objDef.displayFormat}</displayFormat>
    </nameField>`;
  } else {
    nameFieldXml = `    <nameField>
        <label>${objDef.nameFieldLabel}</label>
        <type>Text</type>
    </nameField>`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <deploymentStatus>Deployed</deploymentStatus>
    <label>${objDef.label}</label>
    <pluralLabel>${objDef.plural}</pluralLabel>
    <sharingModel>ReadWrite</sharingModel>
    <enableReports>true</enableReports>
    <enableActivities>true</enableActivities>
    <enableHistory>true</enableHistory>
    <enableSearch>true</enableSearch>
${nameFieldXml}
</CustomObject>
`;
  fs.writeFileSync(path.join(objMetaDir, `${objName}.object-meta.xml`), xml, 'utf8');
}
console.log('Object meta-xml files generated successfully for all 14 custom objects with reporting enabled!');

// ==========================================
// 1. CUSTOM FIELDS CONFIGURATION
// ==========================================
const customFields = {
  Customer__c: [
    { name: 'Customer_ID__c', type: 'Text', length: 100, label: 'Customer ID', externalId: true, unique: true },
    { name: 'First_Name__c', type: 'Text', length: 100, label: 'First Name' },
    { name: 'Last_Name__c', type: 'Text', length: 100, label: 'Last Name' },
    { name: 'Email__c', type: 'Email', unique: true, externalId: true, label: 'Email' },
    { name: 'Mobile__c', type: 'Text', length: 20, label: 'Mobile' },
    { name: 'Mobile_Number__c', type: 'Text', length: 20, label: 'Mobile Number' },
    { name: 'Password_Hash__c', type: 'Text', length: 255, label: 'Password Hash' },
    { name: 'Locked__c', type: 'Checkbox', defaultValue: 'false', label: 'Locked' },
    { name: 'Failed_Login_Attempts__c', type: 'Number', precision: 18, scale: 0, label: 'Failed Login Attempts' },
    { name: 'Role__c', type: 'Text', length: 50, label: 'Role' },
    { name: 'Account_Status__c', type: 'Text', length: 20, label: 'Account Status' },
    { name: 'KYC_Status__c', type: 'Text', length: 50, label: 'KYC Status' },
    { name: 'Country__c', type: 'Text', length: 100, label: 'Country' },
    { name: 'Registration_Date__c', type: 'DateTime', label: 'Registration Date' }
  ],
  Beneficiary__c: [
    { name: 'Customer__c', type: 'Lookup', referenceTo: 'Customer__c', relationshipName: 'Beneficiaries', label: 'Customer' },
    { name: 'Name__c', type: 'Text', length: 150, label: 'Name' },
    { name: 'Country__c', type: 'Text', length: 100, label: 'Country' },
    { name: 'Bank_Name__c', type: 'Text', length: 150, label: 'Bank Name' },
    { name: 'Account_Number__c', type: 'Text', length: 100, label: 'Account Number' },
    { name: 'SWIFT_BIC__c', type: 'Text', length: 50, label: 'SWIFT BIC' },
    { name: 'Mobile__c', type: 'Text', length: 20, label: 'Mobile' },
    { name: 'Status__c', type: 'Text', length: 50, label: 'Status' },
    { name: 'IFSC_Code__c', type: 'Text', length: 50, label: 'IFSC Code' },
    { name: 'Currency__c', type: 'Text', length: 10, label: 'Currency' },
    { name: 'Relationship__c', type: 'Text', length: 100, label: 'Relationship' }
  ],
  Payment_Transaction__c: [
    { name: 'Customer__c', type: 'Lookup', referenceTo: 'Customer__c', relationshipName: 'Payment_Transactions', label: 'Customer' },
    { name: 'Beneficiary__c', type: 'Lookup', referenceTo: 'Beneficiary__c', relationshipName: 'Payment_Transactions', label: 'Beneficiary' },
    { name: 'Amount__c', type: 'Number', precision: 18, scale: 2, label: 'Amount' },
    { name: 'Currency__c', type: 'Text', length: 10, label: 'Currency' },
    { name: 'Exchange_Rate__c', type: 'Number', precision: 18, scale: 6, label: 'Exchange Rate' },
    { name: 'Transfer_Fee__c', type: 'Number', precision: 18, scale: 2, label: 'Transfer Fee' },
    { name: 'Fee__c', type: 'Number', precision: 18, scale: 2, label: 'Fee' },
    { name: 'Final_Amount__c', type: 'Number', precision: 18, scale: 2, label: 'Final Amount' },
    { name: 'Razorpay_Order_Id__c', type: 'Text', length: 100, label: 'Razorpay Order ID' },
    { name: 'Razorpay_Payment_ID__c', type: 'Text', length: 100, label: 'Razorpay Payment ID' },
    { name: 'Razorpay_Signature__c', type: 'Text', length: 255, label: 'Razorpay Signature' },
    { name: 'Status__c', type: 'Text', length: 50, label: 'Status' },
    { name: 'Transaction_Date__c', type: 'DateTime', label: 'Transaction Date' },
    { name: 'Payment_Method__c', type: 'Text', length: 50, label: 'Payment Method' },
    { name: 'MySQL_Transaction_Id__c', type: 'Text', length: 100, label: 'MySQL Transaction ID' },
    { name: 'Reference_Id__c', type: 'Text', length: 100, label: 'Reference ID' },
    { name: 'Source_Amount__c', type: 'Number', precision: 18, scale: 2, label: 'Source Amount' },
    { name: 'Source_Currency__c', type: 'Text', length: 10, label: 'Source Currency' },
    { name: 'Target_Amount__c', type: 'Number', precision: 18, scale: 2, label: 'Target Amount' },
    { name: 'Target_Currency__c', type: 'Text', length: 10, label: 'Target Currency' },
    { name: 'Country__c', type: 'Text', length: 100, label: 'Country', formula: 'Customer__r.Country__c' }
  ],
  OTP_Log__c: [
    { name: 'Customer__c', type: 'Lookup', referenceTo: 'Customer__c', relationshipName: 'OTP_Logs', label: 'Customer' },
    { name: 'User_Name__c', type: 'Text', length: 255, label: 'User Name' },
    { name: 'Mobile_Number__c', type: 'Text', length: 100, label: 'Mobile Number' },
    { name: 'OTP_Status__c', type: 'Text', length: 50, label: 'OTP Status' },
    { name: 'Purpose__c', type: 'Text', length: 100, label: 'Purpose' },
    { name: 'Details__c', type: 'Text', length: 255, label: 'Details' },
    { name: 'Sent_Time__c', type: 'Text', length: 100, label: 'Sent Time' },
    { name: 'Verified_Time__c', type: 'Text', length: 100, label: 'Verified Time' },
    { name: 'Attempts__c', type: 'Number', precision: 18, scale: 0, label: 'Attempts' }
  ],
  Notification__c: [
    { name: 'Customer__c', type: 'Lookup', referenceTo: 'Customer__c', relationshipName: 'Notifications', label: 'Customer' },
    { name: 'Title__c', type: 'Text', length: 255, label: 'Title' },
    { name: 'Message__c', type: 'Text', length: 255, label: 'Message' },
    { name: 'Type__c', type: 'Text', length: 50, label: 'Type' },
    { name: 'Read__c', type: 'Checkbox', defaultValue: 'false', label: 'Read' },
    { name: 'Read_Status__c', type: 'Text', length: 50, label: 'Read Status' },
    { name: 'User__c', type: 'Lookup', referenceTo: 'User', relationshipName: 'PaySphere_Notifications', label: 'User' },
    { name: 'Timestamp__c', type: 'DateTime', label: 'Timestamp' }
  ],
  Audit_Log__c: [
    { name: 'Action__c', type: 'Text', length: 100, label: 'Action' },
    { name: 'Event_Type__c', type: 'Text', length: 100, label: 'Event Type' },
    { name: 'Details__c', type: 'Text', length: 255, label: 'Details' },
    { name: 'Username__c', type: 'Text', length: 150, label: 'Username' },
    { name: 'User__c', type: 'Lookup', referenceTo: 'User', relationshipName: 'PaySphere_Audit_Logs', label: 'User' },
    { name: 'Description__c', type: 'LongTextArea', length: 32768, visibleLines: 5, label: 'Description' },
    { name: 'Timestamp__c', type: 'DateTime', label: 'Timestamp' },
    { name: 'Status__c', type: 'Text', length: 50, label: 'Status' }
  ],
  TransferRequest__c: [
    { name: 'Customer__c', type: 'Lookup', referenceTo: 'Customer__c', relationshipName: 'Transfer_Requests', label: 'Customer' },
    { name: 'Beneficiary__c', type: 'Lookup', referenceTo: 'Beneficiary__c', relationshipName: 'Transfer_Requests', label: 'Beneficiary' },
    { name: 'Source_Currency__c', type: 'Text', length: 10, label: 'Source Currency' },
    { name: 'Destination_Currency__c', type: 'Text', length: 10, label: 'Destination Currency' },
    { name: 'Amount__c', type: 'Number', precision: 18, scale: 2, label: 'Amount' },
    { name: 'Purpose__c', type: 'Text', length: 255, label: 'Purpose' },
    { name: 'Exchange_Rate__c', type: 'Number', precision: 18, scale: 6, label: 'Exchange Rate' },
    { name: 'Transfer_Fee__c', type: 'Number', precision: 18, scale: 2, label: 'Transfer Fee' },
    { name: 'Receiver_Amount__c', type: 'Number', precision: 18, scale: 2, label: 'Receiver Amount' },
    { name: 'Status__c', type: 'Text', length: 50, label: 'Status' },
    { name: 'OTP__c', type: 'Text', length: 10, label: 'OTP' },
    { name: 'OTP_Generated_At__c', type: 'DateTime', label: 'OTP Generated At' }
  ],
  Payment__c: [
    { name: 'Transfer_Request__c', type: 'Lookup', referenceTo: 'TransferRequest__c', relationshipName: 'Payments', label: 'Transfer Request' },
    { name: 'Order_ID__c', type: 'Text', length: 100, label: 'Order ID' },
    { name: 'Payment_ID__c', type: 'Text', length: 100, label: 'Payment ID' },
    { name: 'Signature__c', type: 'Text', length: 255, label: 'Signature' },
    { name: 'Amount__c', type: 'Number', precision: 18, scale: 2, label: 'Amount' },
    { name: 'Status__c', type: 'Text', length: 50, label: 'Status' }
  ],
  Transaction__c: [
    { name: 'Customer__c', type: 'Lookup', referenceTo: 'Customer__c', relationshipName: 'Transactions', label: 'Customer' },
    { name: 'Transfer_Request__c', type: 'Lookup', referenceTo: 'TransferRequest__c', relationshipName: 'Transactions', label: 'Transfer Request' },
    { name: 'Amount__c', type: 'Number', precision: 18, scale: 2, label: 'Amount' },
    { name: 'Currency__c', type: 'Text', length: 10, label: 'Currency' },
    { name: 'Status__c', type: 'Text', length: 50, label: 'Status' },
    { name: 'Timestamp__c', type: 'DateTime', label: 'Timestamp' }
  ],
  Fraud_Log__c: [
    { name: 'Customer__c', type: 'Lookup', referenceTo: 'Customer__c', relationshipName: 'Fraud_Logs', label: 'Customer' },
    { name: 'Flag_Reason__c', type: 'Text', length: 255, label: 'Flag Reason' },
    { name: 'Details__c', type: 'Text', length: 255, label: 'Details' },
    { name: 'Timestamp__c', type: 'DateTime', label: 'Timestamp' }
  ],
  TransferApproval__c: [
    { name: 'Transfer_Request__c', type: 'Lookup', referenceTo: 'TransferRequest__c', relationshipName: 'Transfer_Approvals', label: 'Transfer Request' },
    { name: 'Approver__c', type: 'Text', length: 100, label: 'Approver' },
    { name: 'Status__c', type: 'Text', length: 50, label: 'Status' },
    { name: 'Comments__c', type: 'Text', length: 255, label: 'Comments' },
    { name: 'Timestamp__c', type: 'DateTime', label: 'Timestamp' }
  ],
  ExchangeRate__c: [
    { name: 'Source_Currency__c', type: 'Text', length: 10, label: 'Source Currency' },
    { name: 'Destination_Currency__c', type: 'Text', length: 10, label: 'Destination Currency' },
    { name: 'Rate__c', type: 'Number', precision: 18, scale: 6, label: 'Rate' },
    { name: 'Timestamp__c', type: 'DateTime', label: 'Timestamp' }
  ],
  Webhook_Log__c: [
    { name: 'Event_Type__c', type: 'Text', length: 100, label: 'Event Type' },
    { name: 'Payload__c', type: 'LongTextArea', length: 32768, visibleLines: 10, label: 'Payload' },
    { name: 'Processed__c', type: 'Checkbox', defaultValue: 'false', label: 'Processed' }
  ],
  KYC__c: [
    { name: 'Customer__c', type: 'Lookup', referenceTo: 'Customer__c', relationshipName: 'KYC_Records', label: 'Customer' },
    { name: 'PAN__c', type: 'Text', length: 50, label: 'PAN' },
    { name: 'Aadhaar__c', type: 'Text', length: 50, label: 'Aadhaar' },
    { name: 'Passport__c', type: 'Text', length: 50, label: 'Passport' },
    { name: 'Address__c', type: 'Text', length: 255, label: 'Address' },
    { name: 'Status__c', type: 'Text', length: 50, label: 'Status' },
    { name: 'Document_URL__c', type: 'Text', length: 255, label: 'Document URL' }
  ]
};

// Generate fields files
for (const [objName, fields] of Object.entries(customFields)) {
  const fieldsDir = path.join(baseDir, 'objects', objName, 'fields');
  ensureDir(fieldsDir);

  for (const f of fields) {
    const filePath = path.join(fieldsDir, `${f.name}.field-meta.xml`);
    
    let typeConfig = '';
    if (f.type === 'Text') {
      if (f.formula) {
        typeConfig = `    <unique>${f.unique || false}</unique>`;
      } else {
        typeConfig = `    <length>${f.length}</length>\n    <unique>${f.unique || false}</unique>`;
      }
    } else if (f.type === 'LongTextArea') {
      typeConfig = `    <length>${f.length}</length>\n    <visibleLines>${f.visibleLines}</visibleLines>`;
    } else if (f.type === 'Checkbox') {
      typeConfig = `    <defaultValue>${f.defaultValue}</defaultValue>`;
    } else if (f.type === 'Number') {
      typeConfig = `    <precision>${f.precision}</precision>\n    <scale>${f.scale}</scale>\n    <unique>false</unique>`;
    } else if (f.type === 'Email') {
      typeConfig = `    <unique>${f.unique || false}</unique>`;
    } else if (f.type === 'DateTime') {
      typeConfig = '';
    } else if (f.type === 'Lookup') {
      typeConfig = `    <deleteConstraint>SetNull</deleteConstraint>\n    <referenceTo>${f.referenceTo}</referenceTo>\n    <relationshipLabel>${f.relationshipLabel || f.label}</relationshipLabel>\n    <relationshipName>${f.relationshipName}</relationshipName>`;
    }

    if (f.formula) {
      typeConfig += `\n    <formula>${f.formula}</formula>\n    <formulaTreatBlanksAs>BlankAsZero</formulaTreatBlanksAs>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>${f.name}</fullName>
    <externalId>${f.externalId || false}</externalId>
    <label>${f.label}</label>
    <required>false</required>
    <trackTrending>false</trackTrending>
    <type>${f.type}</type>
${typeConfig}
</CustomField>
`;
    fs.writeFileSync(filePath, xml, 'utf8');
  }
}
console.log('Generated Custom Fields successfully!');

// ==========================================
// 2. CUSTOM TABS CONFIGURATION
// ==========================================
const tabs = [
  { object: 'Customer__c', label: 'Customers', motif: 'Custom83: Pencil' },
  { object: 'Beneficiary__c', label: 'Beneficiaries', motif: 'Custom44: Hands' },
  { object: 'Payment_Transaction__c', label: 'Transactions', motif: 'Custom17: Sack' },
  { object: 'OTP_Log__c', label: 'OTP Logs', motif: 'Custom28: Cell phone' },
  { object: 'Notification__c', label: 'Notifications', motif: 'Custom53: Bell' },
  { object: 'Audit_Log__c', label: 'Audit Logs', motif: 'Custom19: Wrench' }
];

const tabsDir = path.join(baseDir, 'tabs');
ensureDir(tabsDir);

for (const t of tabs) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomTab xmlns="http://soap.sforce.com/2006/04/metadata">
    <customObject>true</customObject>
    <motif>${t.motif}</motif>
</CustomTab>
`;
  fs.writeFileSync(path.join(tabsDir, `${t.object}.tab-meta.xml`), xml, 'utf8');
}
console.log('Generated Custom Tabs successfully!');

// ==========================================
// 3. LIGHTNING APP CONFIGURATION (Corrected formFactors for Lightning App)
// ==========================================
const appsDir = path.join(baseDir, 'applications');
ensureDir(appsDir);

const appXml = `<?xml version="1.0" encoding="UTF-8"?>
<CustomApplication xmlns="http://soap.sforce.com/2006/04/metadata">
    <brand>
        <headerColor>#0EA5E9</headerColor>
        <shouldOverrideOrgTheme>true</shouldOverrideOrgTheme>
    </brand>
    <description>Enterprise-grade Cross-Border Payment &amp; Remittance System.</description>
    <formFactors>Large</formFactors>
    <formFactors>Small</formFactors>
    <label>PaySphere</label>
    <navType>Standard</navType>
    <tabs>standard-home</tabs>
    <tabs>standard-Dashboard</tabs>
    <tabs>Customer__c</tabs>
    <tabs>Beneficiary__c</tabs>
    <tabs>Payment_Transaction__c</tabs>
    <tabs>OTP_Log__c</tabs>
    <tabs>Notification__c</tabs>
    <tabs>standard-report</tabs>
    <tabs>Audit_Log__c</tabs>
    <uiType>Lightning</uiType>
    <utilityBar>PaySphere_UtilityBar</utilityBar>
</CustomApplication>
`;
fs.writeFileSync(path.join(appsDir, 'PaySphere.app-meta.xml'), appXml, 'utf8');

// Utility Bar FlexiPage (Corrected Layout Template name to standard one:utilityBarTemplateDesktop)
const flexipagesDir = path.join(baseDir, 'flexipages');
ensureDir(flexipagesDir);

const utilityBarXml = `<?xml version="1.0" encoding="UTF-8"?>
<FlexiPage xmlns="http://soap.sforce.com/2006/04/metadata">
    <flexiPageRegions>
        <itemInstances>
            <componentInstance>
                <componentName>flexipage:filterListCard</componentName>
                <identifier>notification_filterListCard</identifier>
                <componentInstanceProperties>
                    <name>label</name>
                    <type>decorator</type>
                    <value>Notifications</value>
                </componentInstanceProperties>
                <componentInstanceProperties>
                    <name>icon</name>
                    <type>decorator</type>
                    <value>utility:notification</value>
                </componentInstanceProperties>
                <componentInstanceProperties>
                    <name>entityName</name>
                    <value>Notification__c</value>
                </componentInstanceProperties>
                <componentInstanceProperties>
                    <name>filterName</name>
                    <value>All</value>
                </componentInstanceProperties>
                <componentInstanceProperties>
                    <name>pageSize</name>
                    <value>5</value>
                </componentInstanceProperties>
            </componentInstance>
        </itemInstances>
        <name>utilityItems</name>
        <type>Region</type>
    </flexiPageRegions>
    <masterLabel>PaySphere Utility Bar</masterLabel>
    <template>
        <name>one:utilityBarTemplateDesktop</name>
    </template>
    <type>UtilityBar</type>
</FlexiPage>
`;
fs.writeFileSync(path.join(flexipagesDir, 'PaySphere_UtilityBar.flexipage-meta.xml'), utilityBarXml, 'utf8');
console.log('Generated Lightning App & Utility Bar successfully!');

// ==========================================
// 4. LIST VIEWS CONFIGURATION (Added All list views for Notification__c and Audit_Log__c)
// ==========================================
const listViews = {
  Customer__c: [
    { name: 'All_Customers', label: 'All Customers', filterScope: 'Everything' },
    { name: 'Active_Customers', label: 'Active Customers', filterScope: 'Everything', filter: 'Account_Status__c = ACTIVE' },
    { name: 'Pending_KYC', label: 'Pending KYC', filterScope: 'Everything', filter: 'KYC_Status__c = PENDING_KYC' }
  ],
  Beneficiary__c: [
    { name: 'All_Beneficiaries', label: 'All Beneficiaries', filterScope: 'Everything' },
    { name: 'Active_Beneficiaries', label: 'Active Beneficiaries', filterScope: 'Everything', filter: 'Status__c = APPROVED' }
  ],
  Payment_Transaction__c: [
    { name: 'All_Transactions', label: 'All Transactions', filterScope: 'Everything' },
    { name: 'Successful_Transactions', label: 'Successful Transactions', filterScope: 'Everything', filter: 'Status__c = SUCCESS' },
    { name: 'Failed_Transactions', label: 'Failed Transactions', filterScope: 'Everything', filter: 'Status__c = FAILED' }
  ],
  OTP_Log__c: [
    { name: 'All_OTP_Logs', label: 'All OTP Logs', filterScope: 'Everything' }
  ],
  Notification__c: [
    { name: 'All', label: 'All Notifications', filterScope: 'Everything' }
  ],
  Audit_Log__c: [
    { name: 'All', label: 'All Audit Logs', filterScope: 'Everything' }
  ]
};

for (const [objName, views] of Object.entries(listViews)) {
  const objMetaDir = path.join(baseDir, 'objects', objName);
  ensureDir(objMetaDir);

  const viewsDir = path.join(objMetaDir, 'listViews');
  ensureDir(viewsDir);

  for (const v of views) {
    let filterString = '';
    if (v.filter) {
      const parts = v.filter.split(' = ');
      filterString = `    <filters>
        <field>${parts[0]}</field>
        <operation>equals</operation>
        <value>${parts[1]}</value>
    </filters>\n`;
    }

    const vXml = `<?xml version="1.0" encoding="UTF-8"?>
<ListView xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>${v.name}</fullName>
    <filterScope>${v.filterScope}</filterScope>
    <label>${v.label}</label>
${filterString}
</ListView>
`;
    fs.writeFileSync(path.join(viewsDir, `${v.name}.listView-meta.xml`), vXml, 'utf8');
  }
}
console.log('Generated List Views successfully!');

// ==========================================
// 5. PREMIUM RECORD PAGES CONFIGURATION (Explicit Identifiers & Chatter Feed)
// ==========================================
const recordPages = {
  Customer__c: 'Customer',
  Beneficiary__c: 'Beneficiary',
  Payment_Transaction__c: 'Payment Transaction',
  OTP_Log__c: 'OTP Log'
};

for (const [obj, label] of Object.entries(recordPages)) {
  const pageName = `${obj.replace('__c', '')}_Record_Page`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FlexiPage xmlns="http://soap.sforce.com/2006/04/metadata">
    <flexiPageRegions>
        <itemInstances>
            <componentInstance>
                <componentName>force:highlightsPanel</componentName>
                <identifier>force_highlightsPanel</identifier>
            </componentInstance>
        </itemInstances>
        <name>header</name>
        <type>Region</type>
    </flexiPageRegions>
    <flexiPageRegions>
        <itemInstances>
            <componentInstance>
                <componentName>force:detailPanel</componentName>
                <identifier>force_detailPanel</identifier>
            </componentInstance>
        </itemInstances>
        <itemInstances>
            <componentInstance>
                <componentName>force:relatedListContainer</componentName>
                <identifier>force_relatedListContainer</identifier>
            </componentInstance>
        </itemInstances>
        <name>main</name>
        <type>Region</type>
    </flexiPageRegions>
    <flexiPageRegions>
        <itemInstances>
            <componentInstance>
                <componentName>forceChatter:recordFeedContainer</componentName>
                <identifier>forceChatter_recordFeedContainer</identifier>
            </componentInstance>
        </itemInstances>
        <name>sidebar</name>
        <type>Region</type>
    </flexiPageRegions>
    <masterLabel>${label} Record Page</masterLabel>
    <sobjectType>${obj}</sobjectType>
    <template>
        <name>flexipage:recordHomeTemplateDesktop</name>
    </template>
    <type>RecordPage</type>
</FlexiPage>
`;
  fs.writeFileSync(path.join(flexipagesDir, `${pageName}.flexipage-meta.xml`), xml, 'utf8');
}
console.log('Generated premium Record Pages successfully!');

// ==========================================
// 6. PERMISSION SET UPDATE (All 14 custom objects)
// ==========================================
const permsDir = path.join(baseDir, 'permissionsets');
ensureDir(permsDir);

let objectPermissionsXml = '';
let fieldPermissionsXml = '';

for (const [objName, fields] of Object.entries(customFields)) {
  objectPermissionsXml += `    <objectPermissions>
        <allowCreate>true</allowCreate>
        <allowDelete>true</allowDelete>
        <allowEdit>true</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>true</modifyAllRecords>
        <object>${objName}</object>
        <viewAllRecords>true</viewAllRecords>
    </objectPermissions>\n`;

  for (const f of fields) {
    fieldPermissionsXml += `    <fieldPermissions>
        <editable>true</editable>
        <field>${objName}.${f.name}</field>
        <readable>true</readable>
    </fieldPermissions>\n`;
  }
}

// Add Custom Tab settings to permission set
let tabSettingsXml = '';
for (const t of tabs) {
  tabSettingsXml += `    <tabSettings>
        <tab>${t.object}</tab>
        <visibility>Visible</visibility>
    </tabSettings>\n`;
}

const finalPermSetXml = `<?xml version="1.0" encoding="UTF-8"?>
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <hasActivationRequired>false</hasActivationRequired>
    <label>PaySphere Permissions</label>
    <applicationVisibilities>
        <application>PaySphere</application>
        <visible>true</visible>
    </applicationVisibilities>
${objectPermissionsXml}
${fieldPermissionsXml}
${tabSettingsXml}
</PermissionSet>
`;

fs.writeFileSync(path.join(permsDir, 'PaySphere.permissionset-meta.xml'), finalPermSetXml, 'utf8');
console.log('Updated PaySphere permission set successfully for all 14 custom objects!');
