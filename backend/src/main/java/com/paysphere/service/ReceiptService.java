package com.paysphere.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.paysphere.model.*;
import com.paysphere.repository.ReceiptRepository;
import com.paysphere.util.QrCodeGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Service
public class ReceiptService {
    private static final Logger log = LoggerFactory.getLogger(ReceiptService.class);
    
    @Autowired
    private ReceiptRepository receiptRepository;

    private final String receiptDir = "receipts";

    public Receipt generateReceipt(Transaction transaction) throws Exception {
        log.info("Generating receipt for transaction ID: {}", transaction.getId());
        
        // 1. Check if receipt already exists for this transaction
        Optional<Receipt> existing = receiptRepository.findByTransactionId(transaction.getId());
        if (existing.isPresent()) {
            log.info("Receipt already exists for transaction {}, returning existing.", transaction.getId());
            return existing.get();
        }

        User user = transaction.getUser();
        TransferRequest transferRequest = transaction.getTransferRequest();
        Payment payment = transaction.getPayment();

        if (user == null || transferRequest == null || payment == null) {
            throw new IllegalArgumentException("Transaction is missing required user, transferRequest, or payment info.");
        }

        // 2. Auto-generate receipt number
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randStr = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String receiptNumber = "REC-" + dateStr + "-" + randStr;

        // 3. Create Receipt Entity
        Receipt receipt = new Receipt();
        receipt.setReceiptNumber(receiptNumber);
        receipt.setUser(user);
        receipt.setTransaction(transaction);
        receipt.setPayment(payment);
        
        // 4. Ensure directories exist
        File dir = new File(receiptDir);
        if (!dir.exists()) {
            dir.mkdirs();
        }

        String pdfFileName = receiptNumber + ".pdf";
        String pdfFilePath = receiptDir + File.separator + pdfFileName;

        // 5. Generate PDF
        generatePdfInvoice(receipt, pdfFilePath);

        // 6. Set relative URL placeholder, update once saved
        receipt.setReceiptPdfUrl("/api/receipts/" + receiptNumber + "/pdf");

        Receipt saved = receiptRepository.save(receipt);
        saved.setReceiptPdfUrl("/api/receipts/" + saved.getId() + "/pdf");
        receiptRepository.save(saved);

        log.info("Receipt successfully generated and saved. Number: {}, ID: {}", receiptNumber, saved.getId());
        return saved;
    }

    public String generateQrCodeBase64(Receipt receipt) throws Exception {
        String qrContent = getQrContent(receipt);
        byte[] qrBytes = QrCodeGenerator.generateQrCodeImage(qrContent, 200, 200);
        return Base64.getEncoder().encodeToString(qrBytes);
    }

    public byte[] getPdfFileBytes(Receipt receipt) throws IOException {
        String pdfFilePath = receiptDir + File.separator + receipt.getReceiptNumber() + ".pdf";
        File file = new File(pdfFilePath);
        if (!file.exists()) {
            throw new IOException("Receipt PDF file not found at " + pdfFilePath);
        }
        return Files.readAllBytes(Paths.get(pdfFilePath));
    }

    private String getQrContent(Receipt receipt) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        String formattedId = String.format("%06d", receipt.getTransaction().getId());
        return String.format(
            "Receipt Number: %s\nTransaction ID: %s\nPayment ID: %s\nAmount: %s %s\nDate & Time: %s",
            receipt.getReceiptNumber(),
            "TXN_PS_" + formattedId,
            receipt.getPayment().getPaymentId(),
            receipt.getTransaction().getAmount(),
            receipt.getTransaction().getCurrency(),
            receipt.getCreatedTimestamp().format(formatter)
        );
    }

    private void generatePdfInvoice(Receipt receipt, String filePath) throws Exception {
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        FileOutputStream fos = new FileOutputStream(filePath);
        PdfWriter.getInstance(document, fos);
        document.open();

        // Styles
        Font brandFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 24, new java.awt.Color(6, 182, 212)); // Cyan color
        Font invoiceTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, java.awt.Color.DARK_GRAY);
        Font sectionTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new java.awt.Color(6, 182, 212));
        Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 10, java.awt.Color.DARK_GRAY);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.DARK_GRAY);
        Font footerFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, java.awt.Color.GRAY);
        Font successFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(16, 185, 129)); // Green SUCCESS

        // 1. Header (Table with Brand and Invoice metadata)
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setWidths(new float[]{60, 40});

        PdfPCell brandCell = new PdfPCell(new Paragraph("PaySphere", brandFont));
        brandCell.setBorder(Rectangle.NO_BORDER);
        headerTable.addCell(brandCell);

        PdfPCell invoiceCell = new PdfPCell(new Paragraph("PAYMENT RECEIPT", invoiceTitleFont));
        invoiceCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        invoiceCell.setBorder(Rectangle.NO_BORDER);
        headerTable.addCell(invoiceCell);

        document.add(headerTable);
        document.add(new Paragraph("\n"));

        // Divider
        PdfPTable divider = new PdfPTable(1);
        divider.setWidthPercentage(100);
        PdfPCell divCell = new PdfPCell();
        divCell.setBorder(Rectangle.BOTTOM);
        divCell.setBorderColor(new java.awt.Color(226, 232, 240));
        divCell.setBorderWidth(1.5f);
        divider.addCell(divCell);
        document.add(divider);
        document.add(new Paragraph("\n"));

        // 2. Details Layout (Customer Details and Receipt Details side by side)
        PdfPTable detailsTable = new PdfPTable(2);
        detailsTable.setWidthPercentage(100);
        detailsTable.setWidths(new float[]{50, 50});

        // Customer Details
        PdfPCell customerCell = new PdfPCell();
        customerCell.setBorder(Rectangle.NO_BORDER);
        customerCell.addElement(new Paragraph("CUSTOMER DETAILS", sectionTitleFont));
        customerCell.addElement(new Paragraph(receipt.getUser().getFirstName() + " " + receipt.getUser().getLastName(), boldFont));
        customerCell.addElement(new Paragraph("Email: " + receipt.getUser().getEmail(), regularFont));
        customerCell.addElement(new Paragraph("Mobile: " + receipt.getUser().getMobile(), regularFont));
        detailsTable.addCell(customerCell);

        // Receipt Details
        PdfPCell receiptCell = new PdfPCell();
        receiptCell.setBorder(Rectangle.NO_BORDER);
        receiptCell.addElement(new Paragraph("RECEIPT DETAILS", sectionTitleFont));
        receiptCell.addElement(new Paragraph("Receipt Number: " + receipt.getReceiptNumber(), boldFont));
        receiptCell.addElement(new Paragraph("Date & Time: " + receipt.getCreatedTimestamp().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), regularFont));
        receiptCell.addElement(new Paragraph("Status: SUCCESS", successFont));
        detailsTable.addCell(receiptCell);

        document.add(detailsTable);
        document.add(new Paragraph("\n"));

        // 3. Transaction Details (A clean table of itemized costs)
        PdfPTable txTable = new PdfPTable(2);
        txTable.setWidthPercentage(100);
        txTable.setWidths(new float[]{50, 50});

        String formattedTxId = String.format("%06d", receipt.getTransaction().getId());
        addTableRow(txTable, "Transaction ID", "TXN_PS_" + formattedTxId, boldFont, regularFont);
        addTableRow(txTable, "Razorpay Payment ID", receipt.getPayment().getPaymentId(), boldFont, regularFont);
        addTableRow(txTable, "Razorpay Order ID", receipt.getPayment().getOrderId(), boldFont, regularFont);
        addTableRow(txTable, "Transfer Request ID", receipt.getTransaction().getTransferRequest().getId().toString(), boldFont, regularFont);
        addTableRow(txTable, "Beneficiary Name", receipt.getTransaction().getTransferRequest().getBeneficiary().getName(), boldFont, regularFont);
        addTableRow(txTable, "Amount Sent", receipt.getTransaction().getTransferRequest().getAmount() + " " + receipt.getTransaction().getTransferRequest().getSourceCurrency(), boldFont, regularFont);
        addTableRow(txTable, "Exchange Rate", "1 " + receipt.getTransaction().getTransferRequest().getSourceCurrency() + " = " + receipt.getTransaction().getTransferRequest().getExchangeRate() + " " + receipt.getTransaction().getTransferRequest().getDestinationCurrency(), boldFont, regularFont);
        addTableRow(txTable, "Amount Received", receipt.getTransaction().getTransferRequest().getReceiverAmount() + " " + receipt.getTransaction().getTransferRequest().getDestinationCurrency(), boldFont, regularFont);
        addTableRow(txTable, "Transaction Fee", receipt.getTransaction().getTransferRequest().getTransferFee() + " " + receipt.getTransaction().getTransferRequest().getSourceCurrency(), boldFont, regularFont);
        addTableRow(txTable, "Total Amount Paid", receipt.getPayment().getAmount() + " " + receipt.getTransaction().getTransferRequest().getSourceCurrency(), boldFont, regularFont);
        addTableRow(txTable, "Payment Method", "Razorpay (Online)", boldFont, regularFont);

        document.add(txTable);
        document.add(new Paragraph("\n"));

        // 4. QR Code integration
        String qrContent = getQrContent(receipt);
        byte[] qrBytes = QrCodeGenerator.generateQrCodeImage(qrContent, 140, 140);
        Image qrImage = Image.getInstance(qrBytes);
        qrImage.setAlignment(Element.ALIGN_CENTER);
        document.add(qrImage);

        Paragraph qrLabel = new Paragraph("Scan to verify receipt details", footerFont);
        qrLabel.setAlignment(Element.ALIGN_CENTER);
        document.add(qrLabel);
        document.add(new Paragraph("\n\n"));

        // Divider
        document.add(divider);
        document.add(new Paragraph("\n"));

        // 5. Footer (Support email & Terms & Conditions)
        Paragraph footerTitle = new Paragraph("THANK YOU FOR YOUR BUSINESS", boldFont);
        footerTitle.setAlignment(Element.ALIGN_CENTER);
        document.add(footerTitle);

        Paragraph supportInfo = new Paragraph("For support, please contact us at: support@paysphere.com", regularFont);
        supportInfo.setAlignment(Element.ALIGN_CENTER);
        document.add(supportInfo);

        Paragraph terms = new Paragraph("Terms and Conditions: This is a secure digital invoice generated by PaySphere. All remittances are processed subject to AML compliance and local banking guidelines.", footerFont);
        terms.setAlignment(Element.ALIGN_CENTER);
        document.add(terms);

        document.close();
        fos.close();
    }

    private void addTableRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Paragraph(label, labelFont));
        labelCell.setPadding(8);
        labelCell.setBorderColor(new java.awt.Color(241, 245, 249));
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Paragraph(value, valueFont));
        valueCell.setPadding(8);
        valueCell.setBorderColor(new java.awt.Color(241, 245, 249));
        table.addCell(valueCell);
    }
}
