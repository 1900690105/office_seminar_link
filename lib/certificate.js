import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

function getTemplatePath() {
  return path.join(
    process.cwd(),
    "public",
    "certificates",
    "certificate-template.pdf",
  );
}

async function fetchImage(url) {
  if (!url) return null;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download certificate image: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function drawCenteredText(page, text, font, size, y, color) {
  const pageWidth = page.getWidth();

  const textWidth = font.widthOfTextAtSize(text, size);

  page.drawText(text, {
    x: (pageWidth - textWidth) / 2,
    y,
    size,
    font,
    color,
  });
}

export async function generateCertificate({ student, seminar, registration }) {
  const templatePath = getTemplatePath();

  if (!fs.existsSync(templatePath)) {
    throw new Error(
      "Certificate template not found at public/certificates/certificate-template.pdf",
    );
  }

  const templateBytes = fs.readFileSync(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes);

  const pages = pdfDoc.getPages();

  if (!pages.length) {
    throw new Error("Certificate template contains no pages");
  }

  const page = pages[0];

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const color = rgb(0.04, 0.12, 0.25);

  /*
   * ------------------------------------------------------
   * CERTIFICATE NUMBER
   * ------------------------------------------------------
   */

  page.drawText(`Certificate No.: ${registration.certificateNumber}`, {
    x: page.getWidth() - 190,
    y: page.getHeight() - 45,
    size: 9,
    font: boldFont,
    color,
  });

  /*
   * ------------------------------------------------------
   * STUDENT NAME
   * ------------------------------------------------------
   */

  drawCenteredText(page, student.name, boldFont, 30, 300, color);

  /*
   * ------------------------------------------------------
   * DESCRIPTION
   * ------------------------------------------------------
   */

  const description =
    `This is to certify that ${student.name} has successfully completed ` +
    `the seminar "${seminar.title}" for ${seminar.certificateDuration || "1 Day"} ` +
    `at ${seminar.collegeName}, demonstrating commitment, professionalism, ` +
    `and active participation.`;

  const maxWidth = page.getWidth() - 180;

  let fontSize = 12;

  while (
    regularFont.widthOfTextAtSize(description, fontSize) > maxWidth &&
    fontSize > 8
  ) {
    fontSize -= 0.5;
  }

  drawCenteredText(page, description, regularFont, fontSize, 250, color);

  /*
   * ------------------------------------------------------
   * SEMINAR DETAILS
   * ------------------------------------------------------
   */

  const detailsY = 175;

  drawCenteredText(page, "SEMINAR", boldFont, 11, detailsY, color);

  drawCenteredText(page, seminar.title, boldFont, 11, detailsY - 25, color);

  drawCenteredText(
    page,
    seminar.certificateDuration || "1 Day",
    regularFont,
    11,
    detailsY - 50,
    color,
  );

  /*
   * ------------------------------------------------------
   * SEMINAR DATE
   * ------------------------------------------------------
   */

  drawCenteredText(
    page,
    formatDate(seminar.seminarDate),
    regularFont,
    9,
    90,
    color,
  );

  /*
   * ------------------------------------------------------
   * TRAINER SIGNATURE
   * ------------------------------------------------------
   */

  if (seminar.trainerSignatureUrl) {
    try {
      const imageBytes = await fetchImage(seminar.trainerSignatureUrl);

      if (imageBytes) {
        let image;

        if (seminar.trainerSignatureUrl.toLowerCase().includes(".png")) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }

        page.drawImage(image, {
          x: 150,
          y: 65,
          width: 100,
          height: 35,
        });
      }
    } catch (error) {
      console.error("Trainer signature error:", error);
    }
  }

  /*
   * ------------------------------------------------------
   * AUTHORIZED SIGNATURE
   * ------------------------------------------------------
   */

  if (seminar.authorizedSignatureUrl) {
    try {
      const imageBytes = await fetchImage(seminar.authorizedSignatureUrl);

      if (imageBytes) {
        let image;

        if (seminar.authorizedSignatureUrl.toLowerCase().includes(".png")) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }

        page.drawImage(image, {
          x: page.getWidth() - 250,
          y: 65,
          width: 100,
          height: 35,
        });
      }
    } catch (error) {
      console.error("Authorized signature error:", error);
    }
  }

  /*
   * ------------------------------------------------------
   * STAMP
   * ------------------------------------------------------
   */

  if (seminar.stampUrl) {
    try {
      const imageBytes = await fetchImage(seminar.stampUrl);

      if (imageBytes) {
        let image;

        if (seminar.stampUrl.toLowerCase().includes(".png")) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }

        page.drawImage(image, {
          x: 55,
          y: 55,
          width: 85,
          height: 85,
          opacity: 0.9,
        });
      }
    } catch (error) {
      console.error("Stamp error:", error);
    }
  }

  const pdfBytes = await pdfDoc.save();

  return Buffer.from(pdfBytes);
}
