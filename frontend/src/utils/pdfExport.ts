import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { Chart as ChartType } from "chart.js";

export interface PDFExportOptions {
  filename: string;
  orientation?: "portrait" | "landscape";
  chartInstances?: ChartType[];
  title?: string;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function waitForCharts(charts: ChartType[] = []) {
  for (const chart of charts) {
    try {
      chart.update("none");
    } catch {}
  }
  await delay(300);
}

/**
 * Export a DOM element to a paginated PDF.
 * Intended for dashboards/reports containing Chart.js canvases.
 */
export async function exportToPDF(
  element: HTMLElement,
  options: PDFExportOptions
): Promise<void> {
  const orientation = options.orientation ?? "landscape";

  try {
    element.classList.add("pdf-export-mode");

    await waitForCharts(options.chartInstances);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY
    });

    const imgData = canvas.toDataURL("image/png", 1);

    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 10;

    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    // Add title to the first page if provided
    if (options.title) {
      pdf.setFontSize(16);
      pdf.text(options.title, margin, margin + 7);
      position = margin + 15; // Adjust position for title
    }

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);

    heightLeft -= usableHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;
    }

    pdf.save(options.filename);
  } finally {
    element.classList.remove("pdf-export-mode");
  }
}