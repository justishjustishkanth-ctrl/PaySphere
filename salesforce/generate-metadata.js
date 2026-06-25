const fs = require('fs');
const path = require('path');

const objects = {
  Customer__c: [
    { name: 'First_Name__c', type: 'Text', length: 100, label: 'First Name' },
    { name: 'Last_Name__c', type: 'Text', length: 100, label: 'Last Name' },
    { name: 'Email__c', type: 'Email', unique: true, externalId: true, label: 'Email' },
    { name: 'Mobile__c', type: 'Text', length: 20, label: 'Mobile' },
    { name: 'Mobile_Number__c', type: 'Text', length: 20, label: 'Mobile Number' },
    { name: 'Password_Hash__c', type: 'Text', length: 255, label: 'Password Hash' },
    { name: 'Locked__c', type: 'Checkbox', defaultValue: 'false', label: 'Locked' },
    { name: 'Failed_Login_Attempts__c', type: 'Number', precision: 18, scale: 0, label: 'Failed Login Attempts' },
    { name: 'Role__c', type: 'Text', length: 50, label: 'Role' },
    { name: 'Account_Status__c', type: 'Text', length: 20, label: 'Account Status' }
  ],
  Beneficiary__c: [
    { name: 'Customer__c', type: 'Lookup', referenceTo: 'Customer__c', relationshipName: 'Beneficiaries', label: 'Customer' },
    { name: 'Name__c', type: 'Text', length: 150, label: 'Name' },
    { name: 'Country__c', type: 'Text', length: 100, label: 'Country' },
    { name: 'Bank_Name__c', type: 'Text', length: 150, label: 'Bank Name' },
    { name: 'Account_Number__c', type: 'Text', length: 100, label: 'Account Number' },
    { name: 'SWIFT_BIC__c', type: 'Text', length: 50, label: 'SWIFT BIC' },
    { name: 'Mobile__c', type: 'Text', length: 20, label: 'Mobile' },
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
  Notification__c: [
    { name: 'Customer__c', type: 'Lookup', referenceTo: 'Customer__c', relationshipName: 'Notifications', label: 'Customer' },
    { name: 'Message__c', type: 'Text', length: 255, label: 'Message' },
    { name: 'Type__c', type: 'Text', length: 50, label: 'Type' },
    { name: 'Read__c', type: 'Checkbox', defaultValue: 'false', label: 'Read' },
    { name: 'Timestamp__c', type: 'DateTime', label: 'Timestamp' }
  ],
  Audit_Log__c: [
    { name: 'Action__c', type: 'Text', length: 100, label: 'Action' },
    { name: 'Details__c', type: 'Text', length: 255, label: 'Details' },
    { name: 'Username__c', type: 'Text', length: 150, label: 'Username' },
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
  ],
  OTP_Log__c: [
    { name: 'User_Name__c', type: 'Text', length: 255, label: 'User Name' },
    { name: 'Mobile_Number__c', type: 'Text', length: 100, label: 'Mobile Number' },
    { name: 'OTP_Status__c', type: 'Text', length: 50, label: 'OTP Status' },
    { name: 'Purpose__c', type: 'Text', length: 100, label: 'Purpose' },
    { name: 'Details__c', type: 'Text', length: 255, label: 'Details' },
    { name: 'Sent_Time__c', type: 'Text', length: 100, label: 'Sent Time' },
    { name: 'Verified_Time__c', type: 'Text', length: 100, label: 'Verified Time' },
    { name: 'Attempts__c', type: 'Number', precision: 18, scale: 0, label: 'Attempts' }
  ]
};


const baseDir = path.join(__dirname, 'force-app', 'main', 'default', 'objects');

for (const [objName, fields] of Object.entries(objects)) {
  const fieldsDir = path.join(baseDir, objName, 'fields');
  
  // Ensure the directory exists
  if (!fs.existsSync(fieldsDir)) {
    fs.mkdirSync(fieldsDir, { recursive: true });
    console.log(`Created directory: ${fieldsDir}`);
  }

  for (const f of fields) {
    const filePath = path.join(fieldsDir, `${f.name}.field-meta.xml`);
    
    let typeConfig = '';
    if (f.type === 'Text') {
      typeConfig = `    <length>${f.length}</length>\n    <unique>false</unique>`;
    } else if (f.type === 'LongTextArea') {
      typeConfig = `    <length>${f.length}</length>\n    <visibleLines>${f.visibleLines}</visibleLines>`;
    } else if (f.type === 'Checkbox') {
      typeConfig = `    <defaultValue>${f.defaultValue}</defaultValue>`;
    } else if (f.type === 'Number') {
      typeConfig = `    <precision>${f.precision}</precision>\n    <scale>${f.scale}</scale>\n    <unique>false</unique>`;
    } else if (f.type === 'Email') {
      typeConfig = `    <unique>${f.unique || false}</unique>`;
    } else if (f.type === 'Lookup') {
      typeConfig = `    <deleteConstraint>SetNull</deleteConstraint>\n    <referenceTo>${f.referenceTo}</referenceTo>\n    <relationshipLabel>${f.relationshipLabel || f.name}</relationshipLabel>\n    <relationshipName>${f.relationshipName}</relationshipName>`;
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
    console.log(`Generated: ${filePath}`);
  }
}

console.log('Successfully generated all Salesforce custom fields!');

// Ensure permissionsets directory exists
const permsDir = path.join(__dirname, 'force-app', 'main', 'default', 'permissionsets');
if (!fs.existsSync(permsDir)) {
  fs.mkdirSync(permsDir, { recursive: true });
}

let objectPermissionsXml = '';
let fieldPermissionsXml = '';

for (const [objName, fields] of Object.entries(objects)) {
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

const permSetXml = `<?xml version="1.0" encoding="UTF-8"?>
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <hasActivationRequired>false</hasActivationRequired>
    <label>PaySphere Permissions</label>
    <applicationVisibilities>
        <application>PaySphere</application>
        <visible>true</visible>
    </applicationVisibilities>
${objectPermissionsXml}
${fieldPermissionsXml}
</PermissionSet>
`;

fs.writeFileSync(path.join(permsDir, 'PaySphere.permissionset-meta.xml'), permSetXml, 'utf8');
console.log('Successfully generated PaySphere permissionset!');

