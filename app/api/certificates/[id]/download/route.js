import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * =========================================================
 * FIXED SEMINAR CERTIFICATE CONFIGURATION
 * =========================================================
 *
 * This route intentionally supports ONLY:
 *
 *     Certificate of Seminar Completion
 *
 * There is no:
 * - certificate type selection
 * - template selection
 * - program selection
 * - internship/course logic
 * - bulk generation logic
 * - browser-side PDF generation
 *
 * One master certificate template is used for every seminar.
 */

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public",
  "certificates",
  "certificate-template.pdf",
);

const STAMP_PATH = path.join(
  process.cwd(),
  "public",
  "certificates",
  "stamp.png",
);

const ALLURA_FONT_PATH = path.join(
  process.cwd(),
  "public",
  "fonts",
  "Allura-Regular.ttf",
);

const NOTO_REGULAR_FONT_PATH = path.join(
  process.cwd(),
  "public",
  "fonts",
  "NotoSans-Regular.ttf",
);

const NOTO_BOLD_FONT_PATH = path.join(
  process.cwd(),
  "public",
  "fonts",
  "NotoSans-Bold.ttf",
);

/**
 * =========================================================
 * COLORS
 * =========================================================
 */

const COLORS = {
  navy: rgb(0.035, 0.1, 0.22),
  gold: rgb(0.67, 0.45, 0.12),
  gray: rgb(0.3, 0.32, 0.36),
  lightGray: rgb(0.42, 0.43, 0.46),
  white: rgb(1, 1, 1),
};

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function sanitizeFileName(value) {
  return (
    String(value || "certificate")
      .replace(/[^a-zA-Z0-9\s_-]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 100) || "certificate"
  );
}

function cleanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * =========================================================
 * CENTERED TEXT
 * =========================================================
 */

function drawCenteredText({
  page,
  text,
  font,
  fontSize,
  y,
  color,
  maxWidth,
  minFontSize = 8,
}) {
  if (!text) return;

  let size = fontSize;

  while (size > minFontSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }

  const textWidth = font.widthOfTextAtSize(text, size);

  page.drawText(text, {
    x: (page.getWidth() - textWidth) / 2,
    y,
    size,
    font,
    color,
  });
}

/**
 * =========================================================
 * CENTERED BOX TEXT
 * =========================================================
 */

function drawCenteredInBox({
  page,
  text,
  font,
  fontSize,
  centerX,
  y,
  maxWidth,
  color,
  minFontSize = 8,
}) {
  if (!text) return;

  let size = fontSize;

  while (size > minFontSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }

  const textWidth = font.widthOfTextAtSize(text, size);

  page.drawText(text, {
    x: centerX - textWidth / 2,
    y,
    size,
    font,
    color,
  });
}

/**
 * =========================================================
 * WORD WRAP
 * =========================================================
 */

function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [];

  const words = String(text).trim().split(/\s+/);

  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width <= maxWidth) {
      currentLine = testLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * =========================================================
 * CENTERED PARAGRAPH
 * =========================================================
 */

function drawCenteredParagraph({
  page,
  text,
  font,
  fontSize,
  centerX,
  startY,
  maxWidth,
  color,
  lineGap = 6,
  maxLines = 3,
  minFontSize = 10,
}) {
  if (!text) return;

  let size = fontSize;

  let lines = wrapText(text, font, size, maxWidth);

  while (lines.length > maxLines && size > minFontSize) {
    size -= 0.5;

    lines = wrapText(text, font, size, maxWidth);
  }

  lines = lines.slice(0, maxLines);

  lines.forEach((line, index) => {
    const width = font.widthOfTextAtSize(line, size);

    page.drawText(line, {
      x: centerX - width / 2,
      y: startY - index * (size + lineGap),
      size,
      font,
      color,
    });
  });
}

/**
 * =========================================================
 * CENTERED MIXED / RICH PARAGRAPH
 * =========================================================
 *
 * Makes selected text bold while keeping the rest regular.
 *
 * Used for:
 * - Student name
 * - Seminar name
 */
function drawCenteredRichParagraph({
  page,
  text,
  regularFont,
  boldFont,
  fallbackBoldFont,
  fontSize,
  centerX,
  startY,
  maxWidth,
  color,
  boldTexts = [],
  lineGap = 6,
  maxLines = 3,
  minFontSize = 15,
}) {
  if (!text) return;

  let size = fontSize;

  const escapedBoldTexts = boldTexts
    .filter(Boolean)
    .map((value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const pattern =
    escapedBoldTexts.length > 0
      ? new RegExp(`(${escapedBoldTexts.join("|")})`, "g")
      : null;

  const segments = pattern ? text.split(pattern) : [text];

  const tokens = [];

  for (const segment of segments) {
    if (!segment) continue;

    const isBold = boldTexts.some((boldText) => segment === boldText);

    const words = segment.trim().split(/\s+/).filter(Boolean);

    for (const word of words) {
      tokens.push({
        text: word,
        isBold,
      });
    }
  }

  /**
   * Check whether Canva Sans can encode the text.
   * If not, use Noto Sans Bold as fallback.
   */
  function getFontForToken(token) {
    if (!token.isBold) {
      return regularFont;
    }

    try {
      // Try encoding with Canva Sans Bold.
      boldFont.encodeText(token.text);
      return boldFont;
    } catch {
      // Canva doesn't support this character.
      // Use Noto Sans Bold instead.
      return fallbackBoldFont;
    }
  }

  function buildLines(currentSize) {
    const lines = [];
    let currentLine = [];
    let currentWidth = 0;

    for (const token of tokens) {
      const font = getFontForToken(token);

      const tokenWidth = font.widthOfTextAtSize(token.text, currentSize);

      const spaceWidth = regularFont.widthOfTextAtSize(" ", currentSize);

      const newWidth =
        currentLine.length === 0
          ? tokenWidth
          : currentWidth + spaceWidth + tokenWidth;

      if (currentLine.length > 0 && newWidth > maxWidth) {
        lines.push({
          tokens: currentLine,
          width: currentWidth,
        });

        currentLine = [
          {
            ...token,
            font,
          },
        ];

        currentWidth = tokenWidth;
      } else {
        currentLine.push({
          ...token,
          font,
        });

        currentWidth = newWidth;
      }
    }

    if (currentLine.length > 0) {
      lines.push({
        tokens: currentLine,
        width: currentWidth,
      });
    }

    return lines;
  }

  let lines = buildLines(size);

  while (lines.length > maxLines && size > minFontSize) {
    size -= 0.5;
    lines = buildLines(size);
  }

  lines = lines.slice(0, maxLines);

  lines.forEach((line, lineIndex) => {
    let x = centerX - line.width / 2;

    line.tokens.forEach((token, tokenIndex) => {
      const width = token.font.widthOfTextAtSize(token.text, size);

      page.drawText(token.text, {
        x,
        y: startY - lineIndex * (size + lineGap),
        size,
        font: token.font,
        color,
      });

      x += width;

      if (tokenIndex < line.tokens.length - 1) {
        x += regularFont.widthOfTextAtSize(" ", size);
      }
    });
  });
}

/**
 * =========================================================
 * LOAD LOCAL FILE
 * =========================================================
 */

async function loadFile(filePath, label) {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

/**
 * =========================================================
 * FETCH IMAGE
 * =========================================================
 */

async function fetchImageBytes(url) {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Certificate image request failed:", response.status, url);

      return null;
    }

    const contentType = response.headers.get("content-type") || "";

    if (
      !contentType.includes("image/png") &&
      !contentType.includes("image/jpeg") &&
      !contentType.includes("image/jpg")
    ) {
      console.error("Unsupported certificate image type:", contentType);

      return null;
    }

    const arrayBuffer = await response.arrayBuffer();

    return {
      bytes: new Uint8Array(arrayBuffer),
      contentType,
    };
  } catch (error) {
    console.error("Certificate image fetch error:", error);

    return null;
  }
}

/**
 * =========================================================
 * EMBED IMAGE
 * =========================================================
 */

async function embedImage(pdfDoc, imageData) {
  if (!imageData) return null;

  if (imageData.contentType.includes("png")) {
    return pdfDoc.embedPng(imageData.bytes);
  }

  return pdfDoc.embedJpg(imageData.bytes);
}

/**
 * =========================================================
 * DRAW IMAGE CONTAIN
 * =========================================================
 */

function drawImageContain({ page, image, x, y, width, height }) {
  if (!image) return;

  const scale = Math.min(width / image.width, height / image.height);

  const finalWidth = image.width * scale;
  const finalHeight = image.height * scale;

  page.drawImage(image, {
    x: x + (width - finalWidth) / 2,
    y: y + (height - finalHeight) / 2,
    width: finalWidth,
    height: finalHeight,
  });
}

/**
 * =========================================================
 * GET SEMINAR CERTIFICATE
 * =========================================================
 */

/**
 * =========================================================
 * CLEAN PDF TEXT
 * =========================================================
 *
 * Removes emoji and unsupported supplementary Unicode
 * characters that can appear as □ in PDF fonts.
 */
function cleanPdfText(value) {
  if (!value) return "";

  return (
    String(value)
      // Remove emoji / supplementary Unicode characters
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
      .replace(/[\u{2300}-\u{23FF}]/gu, "")
      .replace(/[\u{2600}-\u{27BF}]/gu, "")
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      // Normalize multiple spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

export async function GET(request, { params }) {
  try {
    /**
     * -------------------------------------------------------
     * REQUEST
     * -------------------------------------------------------
     */

    const { id } = await params;

    const { searchParams } = new URL(request.url);

    const accessToken = searchParams.get("accessToken")?.trim();

    /**
     * -------------------------------------------------------
     * VALIDATION
     * -------------------------------------------------------
     */

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Access token is required.",
        },
        {
          status: 401,
        },
      );
    }

    /**
     * -------------------------------------------------------
     * GET REGISTRATION
     * -------------------------------------------------------
     */

    const registration = await prisma.registration.findUnique({
      where: {
        id,
      },
      include: {
        student: true,
        seminar: true,
      },
    });

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration not found.",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * -------------------------------------------------------
     * VERIFY ACCESS TOKEN
     * -------------------------------------------------------
     */

    if (registration.accessToken !== accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid access token.",
        },
        {
          status: 403,
        },
      );
    }

    /**
     * -------------------------------------------------------
     * RELATED DATA
     * -------------------------------------------------------
     */

    const student = registration.student;

    const seminar = registration.seminar;

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: "Student information not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (!seminar) {
      return NextResponse.json(
        {
          success: false,
          error: "Seminar information not found.",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * =======================================================
     * SEMINAR DATA
     * =======================================================
     */

    const studentName = cleanText(student.name, "Student")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

    const seminarTitle = cleanPdfText(cleanText(seminar.title, "Seminar"));

    const duration = cleanText(seminar.duration, "1 Day");

    const seminarDate = formatDate(seminar.seminarDate);

    const speakerName = cleanText(seminar.speakerName, "Industry Trainer");

    /**
     * Certificate number.
     *
     * If your Registration model already has
     * certificateNumber, it will be used.
     *
     * Otherwise a stable certificate number
     * is generated from the registration ID.
     */

    const certificateNumber = cleanText(
      registration.certificateNumber,
      `ES26/SEM/${String(id)
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(-8)
        .toUpperCase()}`,
    );

    /**
     * =======================================================
     * LOAD MASTER TEMPLATE
     * =======================================================
     */

    const templateBytes = await loadFile(TEMPLATE_PATH, "Certificate template");

    /**
     * =======================================================
     * LOAD FONTS
     * =======================================================
     */

    const [alluraBytes, regularBytes, boldBytes] = await Promise.all([
      loadFile(ALLURA_FONT_PATH, "Allura font"),
      loadFile(NOTO_REGULAR_FONT_PATH, "Noto Sans regular font"),
      loadFile(NOTO_BOLD_FONT_PATH, "Noto Sans bold font"),
    ]);

    /**
     * =======================================================
     * LOAD PDF
     * =======================================================
     */

    const pdfDoc = await PDFDocument.load(templateBytes);

    pdfDoc.registerFontkit(fontkit);

    const pages = pdfDoc.getPages();

    if (!pages.length) {
      throw new Error("Certificate template has no pages.");
    }

    const page = pages[0];

    const pageWidth = page.getWidth();

    const pageHeight = page.getHeight();

    /**
     * =======================================================
     * EMBED FONTS
     * =======================================================
     */

    const nameFont = await pdfDoc.embedFont(alluraBytes);

    const regularFont = await pdfDoc.embedFont(regularBytes);

    const boldFont = await pdfDoc.embedFont(boldBytes);

    /**
     * =======================================================
     * CERTIFICATE NUMBER
     * =======================================================
     *
     * Top-right.
     */
    const certificateText = `Certificate No.: ${certificateNumber}`;
    page.drawText(certificateText, {
      x: pageWidth * 0.76,
      y: pageHeight * 0.91,
      font: boldFont,
      size: 15,
      color: COLORS.navy,
    });

    /**
     * =======================================================
     * SUBTITLE
     * =======================================================
     *
     * IMPORTANT:
     *
     * The template already contains:
     *
     * CERTIFICATE
     *
     * Therefore we only add:
     *
     * OF SEMINAR COMPLETION
     */

    drawCenteredText({
      page,
      text: "OF SEMINAR COMPLETION",
      font: boldFont,
      fontSize: 35,
      y: pageHeight * 0.621,
      maxWidth: pageWidth * 0.6,
      minFontSize: 25,
      color: COLORS.gold,
    });

    /**
     * =======================================================
     * STUDENT NAME
     * =======================================================
     *
     * Allura gives the same handwritten
     * certificate appearance.
     */

    drawCenteredText({
      page,
      text: studentName,
      font: nameFont,
      fontSize: 70,
      y: pageHeight * 0.475,
      maxWidth: pageWidth * 0.68,
      minFontSize: 70,
      color: COLORS.navy,
    });

    /**
     * =======================================================
     * CERTIFICATE DESCRIPTION
     * =======================================================
     *
     * This is specifically written for seminars.
     *
     * We do NOT mention:
     *
     * - internship
     * - course
     * - career guidance
     * - program
     * - subject
     */

    const description = `This is to certify that ${studentName} has successfully participated in and completed the seminar ${seminarTitle} conducted by Electrosoft System Pune. The participant actively engaged in the seminar sessions and demonstrated commitment, enthusiasm, and professional interest throughout the program.`;

    drawCenteredRichParagraph({
      page,
      text: description,

      regularFont,

      // Primary bold font
      boldFont: boldFont,

      // Fallback for unsupported characters
      fallbackBoldFont: boldFont,

      fontSize: 18,
      centerX: pageWidth / 2,
      startY: pageHeight * 0.415,
      maxWidth: pageWidth * 0.7,
      color: COLORS.navy,

      boldTexts: [studentName, seminarTitle],

      lineGap: 6,
      maxLines: 3,
      minFontSize: 15,
    });

    /**
     * =======================================================
     * SEMINAR DATE
     * =======================================================
     */

    /**
     * =======================================================
     * INFORMATION BOX
     * =======================================================
     *
     * Existing certificate has three columns.
     *
     * SEMINAR
     * SEMINAR TITLE
     * DURATION
     *
     * This replaces the old:
     *
     * Internship
     * Industrial Automation
     * 12 Weeks
     */

    const infoWidth = pageWidth * 0.59;
    const columnWidth = infoWidth / 3;

    // Centers of the three sections
    const firstCenter = pageWidth * 0.315;
    const secondCenter = pageWidth * 0.519;
    const thirdCenter = pageWidth * 0.721;

    // Keep all three values on exactly the same baseline
    const infoLabelY = pageHeight * 0.275;
    const infoValueY = pageHeight * 0.25;

    /**
     * -------------------------------------------------------
     * FIRST COLUMN
     * -------------------------------------------------------
     */

    // FIRST — SEMINAR
    drawCenteredInBox({
      page,
      text: "SEMINAR",
      font: boldFont,
      fontSize: 20,
      centerX: firstCenter,
      y: infoValueY,
      maxWidth: columnWidth * 0.82,
      minFontSize: 8,
      color: COLORS.navy,
    });

    /**
     * -------------------------------------------------------
     * SECOND COLUMN
     * -------------------------------------------------------
     */

    // SECOND — SEMINAR TITLE
    drawCenteredInBox({
      page,
      text: seminarTitle,
      font: boldFont,
      fontSize: 20,
      centerX: secondCenter,
      y: infoValueY,
      maxWidth: columnWidth * 0.82,
      minFontSize: 7.5,
      color: COLORS.navy,
    });

    /**
     * -------------------------------------------------------
     * THIRD COLUMN
     * -------------------------------------------------------
     */

    // THIRD — DATE
    drawCenteredInBox({
      page,
      text: seminarDate ?? duration,
      font: boldFont,
      fontSize: 20,
      centerX: thirdCenter,
      y: infoValueY,
      maxWidth: columnWidth * 0.82,
      minFontSize: 7.5,
      color: COLORS.navy,
    });

    /**
     * =======================================================
     * SIGNATURES + STAMP
     * =======================================================
     */

    const [trainerSignatureData, authorizedSignatureData, stampBytes] =
      await Promise.all([
        fetchImageBytes(seminar.trainerSignatureUrl),
        fetchImageBytes(seminar.authorizedSignatureUrl),
        loadFile(STAMP_PATH, "Certificate stamp"),
      ]);

    const [trainerSignature, authorizedSignature, stamp] = await Promise.all([
      embedImage(pdfDoc, trainerSignatureData),
      embedImage(pdfDoc, authorizedSignatureData),
      embedImage(pdfDoc, {
        bytes: new Uint8Array(stampBytes),
        contentType: "image/png",
      }),
    ]);

    /**
     * -------------------------------------------------------
     * STAMP
     * -------------------------------------------------------
     */

    if (stamp) {
      drawImageContain({
        page,
        image: stamp,
        x: pageWidth * 0.439,
        y: pageHeight * 0.1,
        width: pageWidth * 0.12,
        height: pageHeight * 0.129,
      });
    }

    /**
     * -------------------------------------------------------
     * TRAINER SIGNATURE
     * -------------------------------------------------------
     */

    if (trainerSignature) {
      drawImageContain({
        page,
        image: trainerSignature,
        x: pageWidth * 0.299,
        y: pageHeight * 0.137,
        width: pageWidth * 0.1,
        height: pageHeight * 0.09,
      });
    }

    /**
     * -------------------------------------------------------
     * AUTHORIZED SIGNATURE
     * -------------------------------------------------------
     */

    if (authorizedSignature) {
      drawImageContain({
        page,
        image: authorizedSignature,
        x: pageWidth * 0.565,
        y: pageHeight * 0.142,
        width: pageWidth * 0.16,
        height: pageHeight * 0.09,
      });
    }

    /**
     * =======================================================
     * PDF METADATA
     * =======================================================
     */

    pdfDoc.setTitle(`${studentName} - Certificate of Seminar Completion`);

    pdfDoc.setAuthor("Electrosoft System");

    pdfDoc.setSubject(`Certificate of Seminar Completion - ${seminarTitle}`);

    pdfDoc.setKeywords([
      "Electrosoft System",
      "Certificate",
      "Certificate of Seminar Completion",
      studentName,
      seminarTitle,
      duration,
      certificateNumber,
    ]);

    /**
     * =======================================================
     * SAVE PDF
     * =======================================================
     */

    const pdfBytes = await pdfDoc.save();

    /**
     * =======================================================
     * FILE NAME
     * =======================================================
     */

    const safeName = sanitizeFileName(studentName);

    const fileName = `${safeName}_Certificate_of_Seminar_Completion.pdf`;

    /**
     * =======================================================
     * RESPONSE
     * =======================================================
     */

    return new NextResponse(pdfBytes, {
      status: 200,

      headers: {
        "Content-Type": "application/pdf",

        "Content-Disposition": `attachment; filename="${fileName}"`,

        "Content-Length": String(pdfBytes.length),

        "Cache-Control": "private, no-store, max-age=0",

        Pragma: "no-cache",

        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("SEMINAR CERTIFICATE GENERATION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to generate seminar certificate.",
      },
      {
        status: 500,
      },
    );
  }
}
