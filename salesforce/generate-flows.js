const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'force-app', 'main', 'default');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDir(path.join(baseDir, 'flows'));

// ==========================================
// 1. TRANSACTION TRIGGERED FLOW
// ==========================================
const transactionFlowXml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <description>Triggered when a Transaction is created. Creates Audit Log, sends Notifications and updates related records.</description>
    <label>PaySphere Transaction Triggered Flow</label>
    <processType>AutoLaunchedFlow</processType>
    <recordCreates>
        <name>Create_Audit_Log</name>
        <label>Create Audit Log</label>
        <locationX>150</locationX>
        <locationY>150</locationY>
        <connector>
            <targetReference>Create_Notification</targetReference>
        </connector>
        <inputAssignments>
            <field>Action__c</field>
            <value>
                <stringValue>Transaction Processed</stringValue>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Details__c</field>
            <value>
                <stringValue>Payment Transaction of amount {!$Record.Amount__c} {!$Record.Currency__c} status: {!$Record.Status__c}</stringValue>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Status__c</field>
            <value>
                <stringValue>SUCCESS</stringValue>
            </value>
        </inputAssignments>
        <object>Audit_Log__c</object>
    </recordCreates>
    <recordCreates>
        <name>Create_Notification</name>
        <label>Create Notification</label>
        <locationX>300</locationX>
        <locationY>150</locationY>
        <inputAssignments>
            <field>Customer__c</field>
            <value>
                <elementReference>$Record.Customer__c</elementReference>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Message__c</field>
            <value>
                <stringValue>Your remittance of {!$Record.Amount__c} {!$Record.Currency__c} was processed successfully.</stringValue>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Title__c</field>
            <value>
                <stringValue>Payment Complete</stringValue>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Type__c</field>
            <value>
                <stringValue>PAYMENT</stringValue>
            </value>
        </inputAssignments>
        <object>Notification__c</object>
    </recordCreates>
    <start>
        <locationX>50</locationX>
        <locationY>50</locationY>
        <connector>
            <targetReference>Create_Audit_Log</targetReference>
        </connector>
        <object>Payment_Transaction__c</object>
        <recordTriggerType>Create</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
    </start>
    <status>Active</status>
</Flow>
`;
fs.writeFileSync(path.join(baseDir, 'flows', 'PaySphere_Transaction_Triggered_Flow.flow-meta.xml'), transactionFlowXml, 'utf8');

// ==========================================
// 2. REGISTRATION SCREEN FLOW
// ==========================================
const registrationFlowXml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <description>Screen Flow for new customer onboarding and register verification.</description>
    <label>PaySphere Customer Registration Flow</label>
    <processType>Flow</processType>
    <screens>
        <name>Register_Screen</name>
        <label>Customer Registration Form</label>
        <locationX>150</locationX>
        <locationY>150</locationY>
        <allowBack>false</allowBack>
        <allowFinish>true</allowFinish>
        <allowPause>false</allowPause>
        <connector>
            <targetReference>Create_Customer_Record</targetReference>
        </connector>
        <fields>
            <name>First_Name</name>
            <dataType>String</dataType>
            <fieldText>First Name</fieldText>
            <fieldType>InputField</fieldType>
            <isRequired>true</isRequired>
        </fields>
        <fields>
            <name>Last_Name</name>
            <dataType>String</dataType>
            <fieldText>Last Name</fieldText>
            <fieldType>InputField</fieldType>
            <isRequired>true</isRequired>
        </fields>
        <fields>
            <name>Email_Address</name>
            <dataType>String</dataType>
            <fieldText>Email Address</fieldText>
            <fieldType>InputField</fieldType>
            <isRequired>true</isRequired>
        </fields>
        <fields>
            <name>Mobile_Phone</name>
            <dataType>String</dataType>
            <fieldText>Mobile Phone</fieldText>
            <fieldType>InputField</fieldType>
            <isRequired>true</isRequired>
        </fields>
    </screens>
    <recordCreates>
        <name>Create_Customer_Record</name>
        <label>Create Customer Record</label>
        <locationX>300</locationX>
        <locationY>150</locationY>
        <inputAssignments>
            <field>First_Name__c</field>
            <value>
                <elementReference>First_Name</elementReference>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Last_Name__c</field>
            <value>
                <elementReference>Last_Name</elementReference>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Email__c</field>
            <value>
                <elementReference>Email_Address</elementReference>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Mobile_Number__c</field>
            <value>
                <elementReference>Mobile_Phone</elementReference>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Account_Status__c</field>
            <value>
                <stringValue>PENDING_VERIFICATION</stringValue>
            </value>
        </inputAssignments>
        <object>Customer__c</object>
    </recordCreates>
    <start>
        <locationX>50</locationX>
        <locationY>50</locationY>
        <connector>
            <targetReference>Register_Screen</targetReference>
        </connector>
    </start>
    <status>Active</status>
</Flow>
`;
fs.writeFileSync(path.join(baseDir, 'flows', 'PaySphere_Customer_Registration_Flow.flow-meta.xml'), registrationFlowXml, 'utf8');

// ==========================================
// 3. OTP FLOW (STATUS UPDATE)
// ==========================================
const otpFlowXml = `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <description>Triggers when OTP Log status updates (e.g. to VERIFIED) to log details and execute verification post-processing.</description>
    <label>PaySphere OTP Flow</label>
    <processType>AutoLaunchedFlow</processType>
    <recordCreates>
        <name>Create_OTP_Audit_Entry</name>
        <label>Create OTP Audit Entry</label>
        <locationX>150</locationX>
        <locationY>150</locationY>
        <inputAssignments>
            <field>Action__c</field>
            <value>
                <stringValue>OTP Status Updated</stringValue>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Details__c</field>
            <value>
                <stringValue>OTP Verification for Mobile {!$Record.Mobile_Number__c} status changed to {!$Record.OTP_Status__c}. Details: {!$Record.Details__c}</stringValue>
            </value>
        </inputAssignments>
        <inputAssignments>
            <field>Status__c</field>
            <value>
                <stringValue>SUCCESS</stringValue>
            </value>
        </inputAssignments>
        <object>Audit_Log__c</object>
    </recordCreates>
    <start>
        <locationX>50</locationX>
        <locationY>50</locationY>
        <connector>
            <targetReference>Create_OTP_Audit_Entry</targetReference>
        </connector>
        <object>OTP_Log__c</object>
        <recordTriggerType>CreateAndUpdate</recordTriggerType>
        <triggerType>RecordAfterSave</triggerType>
    </start>
    <status>Active</status>
</Flow>
`;
fs.writeFileSync(path.join(baseDir, 'flows', 'PaySphere_OTP_Flow.flow-meta.xml'), otpFlowXml, 'utf8');

console.log('Generated all Flows successfully!');
