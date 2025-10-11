/**
 * Export Service for generating PDF, Excel, and CSV reports
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, HeadingLevel, AlignmentType, WidthType, BorderStyle, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

class ExportService {
  /**
   * Export analysis data to CSV format
   */
  exportToCSV(data, filename = 'survey_report.csv') {
    if (!data || data.length === 0) {
      console.error('No data to export');
      return;
    }

    // Flatten the data structure for CSV
    const csvData = [];

    data.forEach((analysis, index) => {
      if (analysis.simplifiedData) {
        analysis.simplifiedData.forEach(item => {
          csvData.push({
            'Image': analysis.fileName || `Image ${index + 1}`,
            'Timestamp': analysis.timestamp || new Date().toISOString(),
            'Scene Type': analysis.sceneType || 'Unknown',
            'Category': item.identifier,
            'Details': item.details,
            'Estimated Cost': item.estimated_cost || '—',
            'Location Lat': analysis.location?.lat || '',
            'Location Lng': analysis.location?.lng || ''
          });
        });
      }
    });

    // Convert to CSV string
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Export analysis data to Excel format
   */
  exportToExcel(data, projectName = 'Survey Report') {
    if (!data || data.length === 0) {
      console.error('No data to export');
      return;
    }

    console.log('Excel Export - Raw data:', data); // Debug log

    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = data.map((analysis, index) => ({
      'Image': analysis.fileName || analysis.filename || `Image ${index + 1}`,
      'Timestamp': analysis.timestamp || analysis.analysis_timestamp || new Date().toISOString(),
      'Scene Type': analysis.scene_type || analysis.sceneType || 'Unknown',
      'Overview': analysis.scene_overview || analysis.sceneOverview || 'No overview available',
      'Items Detected': (analysis.simplified_data || analysis.simplifiedData)?.length || 0,
      'Location': analysis.location ? `${analysis.location.lat}, ${analysis.location.lng}` : 'N/A'
    }));

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Detailed Analysis Sheet
    const detailedData = [];
    data.forEach((analysis, imageIndex) => {
      const itemsData = analysis.simplified_data || analysis.simplifiedData;
      if (itemsData) {
        itemsData.forEach((item, itemIndex) => {
          detailedData.push({
            'Image #': imageIndex + 1,
            'Image Name': analysis.fileName || analysis.filename || `Image ${imageIndex + 1}`,
            'Item #': itemIndex + 1,
            'Category': item.identifier,
            'Details': item.details,
            'Estimated Cost': item.estimated_cost || '—',
            'Scene Type': analysis.scene_type || analysis.sceneType || 'Unknown',
            'Timestamp': analysis.timestamp || analysis.analysis_timestamp || new Date().toISOString()
          });
        });
      }
    });

    const detailSheet = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detailed Analysis');

    // Cost Estimation Sheet
    const costData = [];
    let totalMinCost = 0;
    let totalMaxCost = 0;

    data.forEach((analysis) => {
      if (analysis.simplifiedData) {
        analysis.simplifiedData.forEach(item => {
          if (item.estimated_cost && item.estimated_cost !== '—') {
            // Parse cost range (e.g., "₹80K - ₹1.4L")
            const costMatch = item.estimated_cost.match(/₹?([\d.]+)([KkLl]?)\s*[-–]\s*₹?([\d.]+)([KkLl]?)/);
            if (costMatch) {
              const min = parseFloat(costMatch[1]) * (costMatch[2].toLowerCase() === 'k' ? 1000 : costMatch[2].toLowerCase() === 'l' ? 100000 : 1);
              const max = parseFloat(costMatch[3]) * (costMatch[4].toLowerCase() === 'k' ? 1000 : costMatch[4].toLowerCase() === 'l' ? 100000 : 1);

              costData.push({
                'Item': item.identifier,
                'Details': item.details,
                'Min Cost (₹)': min,
                'Max Cost (₹)': max,
                'Average (₹)': (min + max) / 2
              });

              totalMinCost += min;
              totalMaxCost += max;
            }
          }
        });
      }
    });

    // Add totals row
    if (costData.length > 0) {
      costData.push({
        'Item': 'TOTAL',
        'Details': '',
        'Min Cost (₹)': totalMinCost,
        'Max Cost (₹)': totalMaxCost,
        'Average (₹)': (totalMinCost + totalMaxCost) / 2
      });
    }

    const costSheet = XLSX.utils.json_to_sheet(costData);
    XLSX.utils.book_append_sheet(workbook, costSheet, 'Cost Estimation');

    // Observations Sheet
    const observationsData = [];
    data.forEach((analysis, index) => {
      if (analysis.keyObservations && analysis.keyObservations.length > 0) {
        analysis.keyObservations.forEach((obs, obsIndex) => {
          observationsData.push({
            'Image': analysis.fileName || `Image ${index + 1}`,
            'Observation #': obsIndex + 1,
            'Description': obs
          });
        });
      }
    });

    if (observationsData.length > 0) {
      const obsSheet = XLSX.utils.json_to_sheet(observationsData);
      XLSX.utils.book_append_sheet(workbook, obsSheet, 'Key Observations');
    }

    // Generate and download Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Export analysis data to PDF format
   */
  exportToPDF(data, projectInfo = {}) {
    if (!data || data.length === 0) {
      console.error('No data to export');
      return;
    }

    console.log('PDF Export - Raw data:', data); // Debug log

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;

    // Helper function to check and add new page if needed
    const checkNewPage = (requiredSpace = 20) => {
      if (yPosition + requiredSpace > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };

    // Title Page
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Property Survey Report', 105, yPosition, { align: 'center' });
    yPosition += 15;

    // Project Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${projectInfo.name || 'Survey Report'}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Total Images Analyzed: ${data.length}`, 20, yPosition);
    yPosition += 8;

    if (projectInfo.location) {
      doc.text(`Location: ${projectInfo.location}`, 20, yPosition);
      yPosition += 8;
    }

    if (projectInfo.client) {
      doc.text(`Client: ${projectInfo.client}`, 20, yPosition);
      yPosition += 8;
    }

    yPosition += 10;

    // Executive Summary
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Scene types summary
    const sceneTypes = {};
    data.forEach(analysis => {
      const type = analysis.scene_type || analysis.sceneType || 'Unknown';
      sceneTypes[type] = (sceneTypes[type] || 0) + 1;
    });

    doc.text('Scene Types Analyzed:', 20, yPosition);
    yPosition += 6;

    Object.entries(sceneTypes).forEach(([type, count]) => {
      doc.text(`• ${type}: ${count} image(s)`, 25, yPosition);
      yPosition += 5;
    });

    yPosition += 10;

    // Detailed Analysis Section
    data.forEach((analysis, imageIndex) => {
      checkNewPage(60);

      // Image Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Image ${imageIndex + 1}: ${analysis.fileName || analysis.filename || 'Unnamed'}`, 20, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Scene Type: ${analysis.scene_type || analysis.sceneType || 'Unknown'}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Timestamp: ${analysis.timestamp || analysis.analysis_timestamp || 'N/A'}`, 20, yPosition);
      yPosition += 6;

      if (analysis.location) {
        doc.text(`Location: ${analysis.location.lat}, ${analysis.location.lng}`, 20, yPosition);
        yPosition += 6;
      }

      // Scene Overview
      const overview = analysis.scene_overview || analysis.sceneOverview;
      if (overview) {
        yPosition += 4;
        doc.setFont('helvetica', 'bold');
        doc.text('Overview:', 20, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');

        const overviewLines = doc.splitTextToSize(overview, 170);
        overviewLines.forEach(line => {
          checkNewPage(10);
          doc.text(line, 20, yPosition);
          yPosition += 5;
        });
      }

      // Narrative Report Section (if available)
      const narrativeReport = analysis.narrative_report || analysis.narrativeReport;
      if (narrativeReport) {
        yPosition += 8;
        checkNewPage(40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Detailed Analysis:', 20, yPosition);
        yPosition += 6;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        // Parse and format the narrative report
        const reportLines = narrativeReport.split('\n');
        reportLines.forEach(line => {
          // Handle emoji headers and formatting
          if (line.includes('**')) {
            checkNewPage(10);
            // Extract text between ** markers, remove emojis
            const cleanLine = line.replace(/\*\*/g, '').replace(/[^\x00-\x7F]/g, '• ');
            doc.setFont('helvetica', 'bold');
            doc.text(cleanLine.trim(), 20, yPosition);
            doc.setFont('helvetica', 'normal');
            yPosition += 6;
          } else if (line.trim()) {
            const textLines = doc.splitTextToSize(line, 170);
            textLines.forEach(textLine => {
              checkNewPage(10);
              doc.text(textLine, 20, yPosition);
              yPosition += 5;
            });
          } else {
            yPosition += 3; // Add space for empty lines
          }
        });
      }

      // Items Table - check both possible data fields
      const itemsData = analysis.simplified_data || analysis.simplifiedData;
      if (itemsData && itemsData.length > 0) {
        yPosition += 8;
        checkNewPage(40);

        const tableData = itemsData.map(item => [
          item.identifier || item.category || 'Item',
          item.details || item.description || '',
          item.estimated_cost || item.cost || '—'
        ]);

        doc.autoTable({
          head: [['Category', 'Details', 'Est. Cost']],
          body: tableData,
          startY: yPosition,
          margin: { left: 20, right: 20 },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] },
          didDrawPage: (data) => {
            yPosition = data.cursor.y + 10;
          }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
      }

      // Key Observations - check both possible fields
      const observations = analysis.key_observations || analysis.keyObservations;
      if (observations && observations.length > 0) {
        checkNewPage(30);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Observations:', 20, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');

        observations.forEach(obs => {
          const obsLines = doc.splitTextToSize(`• ${obs}`, 170);
          obsLines.forEach(line => {
            checkNewPage(10);
            doc.text(line, 20, yPosition);
            yPosition += 5;
          });
        });
      }

      yPosition += 10;
    });

    // Cost Summary Page
    const costItems = [];
    let totalMinCost = 0;
    let totalMaxCost = 0;

    data.forEach(analysis => {
      const itemsData = analysis.simplified_data || analysis.simplifiedData;
      if (itemsData) {
        itemsData.forEach(item => {
          if (item.estimated_cost && item.estimated_cost !== '—') {
            costItems.push(item);
            // Parse and sum costs
            const costMatch = item.estimated_cost.match(/₹?([\d.]+)([KkLl]?)\s*[-–]\s*₹?([\d.]+)([KkLl]?)/);
            if (costMatch) {
              const min = parseFloat(costMatch[1]) * (costMatch[2].toLowerCase() === 'k' ? 1000 : costMatch[2].toLowerCase() === 'l' ? 100000 : 1);
              const max = parseFloat(costMatch[3]) * (costMatch[4].toLowerCase() === 'k' ? 1000 : costMatch[4].toLowerCase() === 'l' ? 100000 : 1);
              totalMinCost += min;
              totalMaxCost += max;
            }
          }
        });
      }
    });

    if (costItems.length > 0) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Cost Estimation Summary', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      doc.text(`Total Estimated Range: ₹${(totalMinCost/1000).toFixed(0)}K - ₹${(totalMaxCost/100000).toFixed(1)}L`, 20, yPosition);
      yPosition += 15;

      const costTableData = costItems.map(item => [
        item.identifier,
        item.details,
        item.estimated_cost
      ]);

      doc.autoTable({
        head: [['Item', 'Details', 'Estimated Cost']],
        body: costTableData,
        startY: yPosition,
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] }
      });
    }

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Page ${i} of ${pageCount}`, 105, pageHeight - 10, { align: 'center' });
      doc.text(`Generated on ${new Date().toLocaleString()}`, 20, pageHeight - 10);
    }

    // Save PDF
    const filename = `${projectInfo.name || 'survey_report'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }

  /**
   * Export analysis data to Word document format (client-side)
   */
  async exportToWord(data, projectInfo = {}) {
    if (!data || data.length === 0) {
      console.error('No data to export');
      return;
    }

    console.log('Word Export - Raw data:', data);

    try {
      const sections = [];

      // Add title and project info
      const titleParagraphs = [
        new Paragraph({
          text: 'Property Survey Report',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Project: ', bold: true }),
            new TextRun(projectInfo.name || 'Survey Report')
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Date: ', bold: true }),
            new TextRun(new Date().toLocaleDateString())
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Images Analyzed: ', bold: true }),
            new TextRun(data.length.toString())
          ],
          spacing: { after: 200 }
        })
      ];

      if (projectInfo.client) {
        titleParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Client: ', bold: true }),
              new TextRun(projectInfo.client)
            ],
            spacing: { after: 400 }
          })
        );
      }

      const documentChildren = [...titleParagraphs];

      // Process each analysis
      for (let index = 0; index < data.length; index++) {
        const analysis = data[index];

        // Image header
        documentChildren.push(
          new Paragraph({
            text: `Image ${index + 1}: ${analysis.fileName || analysis.filename || 'Unnamed'}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          })
        );

        // Add the image if available
        if (analysis.imageFile) {
          try {
            const imageBuffer = await analysis.imageFile.arrayBuffer();
            documentChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: 600,
                      height: 400
                    }
                  })
                ],
                spacing: { after: 300 }
              })
            );
          } catch (err) {
            console.error('Error adding image to Word document:', err);
          }
        }

        // Basic info
        documentChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Scene Type: ', bold: true }),
              new TextRun(analysis.scene_type || analysis.sceneType || 'Unknown')
            ],
            spacing: { after: 100 }
          })
        );

        if (analysis.timestamp || analysis.analysis_timestamp) {
          documentChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Timestamp: ', bold: true }),
                new TextRun(analysis.timestamp || analysis.analysis_timestamp)
              ],
              spacing: { after: 100 }
            })
          );
        }

        if (analysis.location) {
          documentChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Location: ', bold: true }),
                new TextRun(`${analysis.location.lat}, ${analysis.location.lng}`)
              ],
              spacing: { after: 200 }
            })
          );
        }

        // Scene Overview
        const overview = analysis.scene_overview || analysis.sceneOverview;
        if (overview) {
          documentChildren.push(
            new Paragraph({
              text: 'Overview',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 }
            })
          );
          documentChildren.push(
            new Paragraph({
              text: overview,
              spacing: { after: 200 }
            })
          );
        }

        // Narrative Report
        const narrativeReport = analysis.narrative_report || analysis.narrativeReport;
        if (narrativeReport) {
          documentChildren.push(
            new Paragraph({
              text: 'Detailed Analysis',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 }
            })
          );

          // Split by lines and process
          const lines = narrativeReport.split('\n');
          lines.forEach(line => {
            const cleanLine = line.trim();
            if (cleanLine) {
              // Check if it's a heading (contains **)
              if (cleanLine.includes('**')) {
                const text = cleanLine.replace(/\*\*/g, '').replace(/[^\x00-\x7F]/g, '');
                documentChildren.push(
                  new Paragraph({
                    children: [new TextRun({ text: text.trim(), bold: true })],
                    spacing: { before: 150, after: 100 }
                  })
                );
              } else {
                documentChildren.push(
                  new Paragraph({
                    text: cleanLine,
                    spacing: { after: 100 }
                  })
                );
              }
            }
          });
        }

        // Items Table
        const itemsData = analysis.simplified_data || analysis.simplifiedData;
        if (itemsData && itemsData.length > 0) {
          documentChildren.push(
            new Paragraph({
              text: 'Detected Items & Features',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 300, after: 200 }
            })
          );

          // Create table
          const tableRows = [
            // Header row
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: '#', bold: true })],
                  width: { size: 10, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Category', bold: true })],
                  width: { size: 20, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Details', bold: true })],
                  width: { size: 50, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                  children: [new Paragraph({ text: 'Est. Cost', bold: true })],
                  width: { size: 20, type: WidthType.PERCENTAGE }
                })
              ]
            })
          ];

          // Data rows
          itemsData.forEach((item, idx) => {
            tableRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph((idx + 1).toString())],
                    width: { size: 10, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph(item.identifier || item.category || 'Item')],
                    width: { size: 20, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph(item.details || item.description || '')],
                    width: { size: 50, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph(item.estimated_cost || item.cost || '—')],
                    width: { size: 20, type: WidthType.PERCENTAGE }
                  })
                ]
              })
            );
          });

          documentChildren.push(
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          );
        }

        // Key Observations
        const observations = analysis.key_observations || analysis.keyObservations;
        if (observations && observations.length > 0) {
          documentChildren.push(
            new Paragraph({
              text: 'Key Observations',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 300, after: 200 }
            })
          );

          observations.forEach(obs => {
            documentChildren.push(
              new Paragraph({
                text: `• ${obs}`,
                spacing: { after: 100 }
              })
            );
          });
        }

        // Add page break between images (except last one)
        if (index < data.length - 1) {
          documentChildren.push(
            new Paragraph({
              text: '',
              pageBreakBefore: true
            })
          );
        }
      }

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: documentChildren
        }]
      });

      // Generate and download
      const blob = await Packer.toBlob(doc);
      const filename = `${projectInfo.name || 'survey_report'}_${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, filename);

      console.log('Word document generated successfully');
    } catch (error) {
      console.error('Error generating Word document:', error);
      throw error;
    }
  }

  /**
   * Export batch analysis summary
   */
  exportBatchSummary(data, format = 'excel') {
    const summary = {
      totalImages: data.length,
      sceneTypes: {},
      totalItems: 0,
      estimatedCosts: { min: 0, max: 0 },
      timestamp: new Date().toISOString()
    };

    data.forEach(analysis => {
      // Count scene types
      const type = analysis.sceneType || 'Unknown';
      summary.sceneTypes[type] = (summary.sceneTypes[type] || 0) + 1;

      // Count items
      if (analysis.simplifiedData) {
        summary.totalItems += analysis.simplifiedData.length;

        // Calculate costs
        analysis.simplifiedData.forEach(item => {
          if (item.estimated_cost && item.estimated_cost !== '—') {
            const costMatch = item.estimated_cost.match(/₹?([\d.]+)([KkLl]?)\s*[-–]\s*₹?([\d.]+)([KkLl]?)/);
            if (costMatch) {
              const min = parseFloat(costMatch[1]) * (costMatch[2].toLowerCase() === 'k' ? 1000 : costMatch[2].toLowerCase() === 'l' ? 100000 : 1);
              const max = parseFloat(costMatch[3]) * (costMatch[4].toLowerCase() === 'k' ? 1000 : costMatch[4].toLowerCase() === 'l' ? 100000 : 1);
              summary.estimatedCosts.min += min;
              summary.estimatedCosts.max += max;
            }
          }
        });
      }
    });

    switch (format) {
      case 'excel':
        this.exportToExcel(data, 'Batch Analysis');
        break;
      case 'pdf':
        this.exportToPDF(data, { name: 'Batch Analysis Summary' });
        break;
      case 'csv':
        this.exportToCSV(data, 'batch_analysis.csv');
        break;
      default:
        console.error('Unsupported format:', format);
    }

    return summary;
  }
}

// Create singleton instance
const exportService = new ExportService();
export default exportService;