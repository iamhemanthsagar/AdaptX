require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const PDFDocument = require("pdfkit");
const { GoogleGenAI } = require("@google/genai");
const app = express();
const PORT = process.env.PORT || 5000;
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
app.use(cors());
app.use(express.json({ limit: "5mb" }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});
app.post("/api/summarize", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: "EMPTY_FILE",
          message: "No file was uploaded.",
        },
      });
    }
    const allowedTypes = ["application/pdf", "text/plain"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_FILE",
          message: "Only PDF and TXT files are supported.",
        },
      });
    }
    let extractedText = "";
    if (req.file.mimetype === "text/plain") {
      extractedText = req.file.buffer.toString("utf-8");
    }
    if (req.file.mimetype === "application/pdf") {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
    }
    extractedText = extractedText.trim();
    if (!extractedText) {
      return res.status(400).json({
        success: false,
        error: {
          code: "EMPTY_FILE",
          message: "The uploaded file contains no readable text.",
        },
      });
    }
    console.log(
      `Extracted ${extractedText.length} characters from ${req.file.originalname}`
    );
    const requestedSupportMode = String(req.body?.supportMode || "visual").toLowerCase();
    const allowedSupportModes = ["visual", "cognitive", "hearing"];
    if (!allowedSupportModes.includes(requestedSupportMode)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_SUPPORT_MODE",
          message: "Choose visual, cognitive, or hearing accessibility.",
        },
      });
    }
    const prompt = `
You are AdaptX, an educational accessibility transformation engine.
Analyze the educational content provided to you.
Your job is to understand the actual educational meaning, structure, and visual information in the source.
Pay attention to:
- headings and sections
- paragraphs
- important concepts
- definitions
- examples
- tables
- diagrams
- images
- captions and labels
- scientific or technical terminology
- the logical order of the lesson
Return the following structured result:
1. title:
   A concise title describing the lesson.
2. summary:
   A clear summary of the most important ideas.
   Use simple, student-friendly language while preserving factual meaning.
3. keyPoints:
   An array containing 3 to 7 of the most important concepts or facts.
4. simplifiedSections:
   Convert the lesson into a sequence of short, clearly organized sections.
   Each section must contain:
   - heading: a short descriptive heading
   - content: one or two short paragraphs explaining that section
   Use simple student-friendly language.
   Keep important facts, concepts, examples, and terminology.
   Do not turn the entire lesson into one large paragraph.
   Prefer 4 to 8 meaningful sections.
   IMPORTANT:
   - Headings must describe the actual concept being taught.
   - Do not use generic headings such as "Introduction", "Section 1", or "Important Information" unless they genuinely fit.
   - Keep sections in the natural teaching order.
   - Each section should cover one main idea.
   - Avoid repeating the same information across sections.
5. glossary:
   Identify important or potentially difficult words and terms from the lesson.
   For each term, provide:
   - term: the word or phrase
   - explanation: a short, simple explanation based only on the source content
   Include useful scientific or technical terms.
6. imageDescriptions:
   Identify meaningful images, diagrams, charts, tables, or other visual elements.
   For each visual, provide:
   - description: what the visual represents
   - context: why the visual is relevant to the lesson
   Only describe information supported by the document.
   If there are no meaningful visual elements, return an empty array.
7. screenReaderSections:
   Create a properly organized, linear version of the lesson for a student using a screen reader.
   Break the lesson into logical sections.
   Each section must contain:
   - heading: a meaningful heading
   - content: concise but complete text for that section
   The output must follow the natural teaching order of the lesson.
   IMPORTANT SCREEN READER RULES:
   - Do not reproduce raw PDF extraction.
   - Do not copy page headers or footers.
   - Do not include page numbers unless they are educationally important.
   - Do not use ALL CAPS headings.
   - Do not concatenate the entire lesson into one paragraph.
   - Do not repeat the same information unnecessarily.
   - Use short, clearly separated sections.
   - Explain meaningful visual information in words where necessary.
   - If a diagram shows a process, explain the process in logical order.
   - If a table contains important information, describe the relevant relationships clearly.
   - Preserve the natural teaching sequence.
   - The result should sound like a teacher reading a well-organized lesson aloud to a student who cannot see the original document.
   Prefer 5 to 10 logical sections.
8. cognitiveLearning:
   Only when the selected support mode is "cognitive", generate the following source-grounded learning supports:
   learningChunks: 4 to 8 small learning chunks. Each contains:
   - heading: one clear idea
   - explanation: short, simple explanation of that idea
   realWorldExamples: 2 to 5 examples. Each contains:
   - concept: the lesson concept it supports
   - example: a familiar real-life example
   - connection: one short explanation connecting the example back to the source concept
   analogies: 1 to 4 carefully chosen analogies. Each contains:
   - concept: the source concept
   - analogy: the analogy
   - clarification: a short sentence explaining where the analogy is useful and that it is only a way to think about the concept
   story: one short teaching story with:
   - title
   - content
   - keyConcepts: array of concepts from the source covered by the story
   mindMap: a concept map with:
   - centralConcept
   - branches: 3 to 7 objects, each with label and points (array of short strings)
   rememberPoints: 3 to 7 concise takeaways.
   quickChecks: 3 to 6 checks. Each contains:
   - question
   - options: exactly 3 or 4 answer choices
   - answerIndex: zero-based index of the correct option
   - explanation: short explanation grounded in the source
   Cognitive rules:
   - Keep every fact faithful to the source.
   - Never invent facts just to make a story, analogy, example, or question.
   - Clearly distinguish an analogy from a factual statement.
   - Use familiar, age-appropriate language without assuming a specific disability or diagnosing a learner.
   - Keep each chunk focused on one idea.
   - Questions must have one defensible answer from the source.
9. hearingAccessibility:
   Only when the selected support mode is "hearing", generate a visual-first learning experience from the source lesson.
   IMPORTANT GOAL:
   Do not merely remove audio. Redesign the lesson so the important educational meaning can be understood through readable text and purposeful visual structures.
   visualLesson: 4 to 10 teaching cards in the natural teaching order. Each contains:
   - title: short concept title
   - concept: the main concept being taught
   - explanation: concise student-friendly explanation
   - visualType: choose the most useful structure from: process, cause-effect, comparison, timeline, cycle, sequence, before-after, classification, relationship, or text-focus
   - visualSteps: 2 to 6 short steps/items that visually express the concept. For text-focus, return an empty array.
   - takeaway: one short sentence stating what the learner should remember
   The visualLesson cards are also the "show, don't just tell" layer. Use them for concepts that genuinely benefit from a visual representation. Do not force a diagram when a normal explanation is clearer. Do not invent visual facts.
   conceptMap: a "connect the ideas" structure with:
   - centralConcept: the lesson's central idea
   - branches: 3 to 7 objects, each containing:
     - label: a major concept
     - points: 2 to 4 short supporting ideas or relationships from the source
   visualVocabulary: 4 to 10 important terms. Each contains:
   - term: the source term
   - simpleMeaning: a short, student-friendly meaning based on the source
   - visualCue: a short visual cue, symbol idea, or concrete representation that helps explain the term
   - connection: how the term connects to the lesson
   audioInformation: only if the source itself contains meaningful information that would normally depend on audio. Each contains:
   - topic
   - visualAlternative
   Otherwise return an empty array. Do not pretend a PDF has audio.
   visualQuickChecks: 3 to 6 source-grounded questions. Each contains:
   - question
   - options: exactly 3 or 4 answer choices
   - answerIndex: zero-based index of the correct option
   - explanation: short explanation grounded in the source
   Hearing accessibility rules:
   - Keep the normal summary and key points useful; hearing accessibility is not a replacement for ordinary text.
   - Prioritize visual structure for processes, sequences, comparisons, relationships, timelines, cycles, and cause/effect.
   - "Show, don't just tell" means represent the idea structurally when that improves understanding.
   - Visual steps must be short enough to fit comfortably in cards.
   - The visual structure must remain faithful to the source.
   - Do not claim that generated visuals are literal images from the source.
   - Do not create sign-language content or claim sign-language accuracy.
   - Do not infer or diagnose a learner's disability.
   - Questions must have one defensible answer from the source.
For non-hearing support modes, return empty arrays and an empty centralConcept/branches structure for hearingAccessibility.
For non-cognitive support modes, return empty arrays and an empty story/mindMap object for these cognitive fields.
General rules:
- Preserve the factual meaning of the source.
- Do not invent information.
- Do not add unsupported information.
- Do not ignore important educational content because it appears inside an image, diagram, table, or caption.
- Keep scientific and technical terminology accurate.
- Simplify language without changing the meaning.
- Glossary explanations must be understandable to students.
- Image descriptions must be useful to a student who cannot see the visual.
- Prefer completeness and educational usefulness over an overly short response.
- Organize information by teaching concept, not by PDF extraction order.
- Use meaningful headings.
- Use short paragraphs.
- Do not preserve formatting artifacts from the PDF.
- Do not repeat headers, footers, page numbers, or navigation text.
- Do not create one enormous paragraph.
- If the source contains a story followed by concepts, preserve that teaching flow.
- Return only the requested structured output.
- Do not include markdown or explanatory text outside the structured output.
SELECTED SUPPORT MODE:
${requestedSupportMode}
If the selected support mode is "cognitive", prioritize the cognitiveLearning outputs in addition to the common lesson structure.
If the selected support mode is "visual" or "hearing", keep cognitiveLearning fields empty.
If the selected support mode is "hearing", prioritize the hearingAccessibility outputs in addition to the common lesson structure.
If the selected support mode is "visual" or "cognitive", keep hearingAccessibility fields empty.
SOURCE TEXT:
<document>
${extractedText}
</document>
`;
    console.log("Sending document to Gemini...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents:
        req.file.mimetype === "application/pdf"
          ? [
              {
                text: prompt,
              },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: req.file.buffer.toString("base64"),
                },
              },
            ]
          : prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
            },
            summary: {
              type: "string",
            },
            keyPoints: {
              type: "array",
              items: {
                type: "string",
              },
            },
            simplifiedSections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: {
                    type: "string",
                  },
                  content: {
                    type: "string",
                  },
                },
                required: ["heading", "content"],
              },
            },
            glossary: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: {
                    type: "string",
                  },
                  explanation: {
                    type: "string",
                  },
                },
                required: ["term", "explanation"],
              },
            },
            imageDescriptions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                  },
                  context: {
                    type: "string",
                  },
                },
                required: ["description", "context"],
              },
            },
            cognitiveLearning: {
              type: "object",
              properties: {
                learningChunks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      explanation: { type: "string" },
                    },
                    required: ["heading", "explanation"],
                  },
                },
                                realWorldExamples: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      concept: { type: "string" },
                      example: { type: "string" },
                      connection: { type: "string" },
                    },
                    required: ["concept", "example", "connection"],
                  },
                },
                analogies: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      concept: { type: "string" },
                      analogy: { type: "string" },
                      clarification: { type: "string" },
                    },
                    required: ["concept", "analogy", "clarification"],
                  },
                },
                story: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    keyConcepts: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["title", "content", "keyConcepts"],
                },
                mindMap: {
                  type: "object",
                  properties: {
                    centralConcept: { type: "string" },
                    branches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          points: {
                            type: "array",
                            items: { type: "string" },
                          },
                        },
                        required: ["label", "points"],
                      },
                    },
                  },
                  required: ["centralConcept", "branches"],
                },
                rememberPoints: {
                  type: "array",
                  items: { type: "string" },
                },
                quickChecks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: {
                        type: "array",
                        items: { type: "string" },
                      },
                      answerIndex: { type: "integer" },
                      explanation: { type: "string" },
                    },
                    required: ["question", "options", "answerIndex", "explanation"],
                  },
                },
              },
              required: [
                "learningChunks",
                "realWorldExamples",
                "analogies",
                "story",
                "mindMap",
                "rememberPoints",
                "quickChecks",
              ],
            },
            hearingAccessibility: {
              type: "object",
              properties: {
                visualLesson: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      concept: { type: "string" },
                      explanation: { type: "string" },
                      visualType: { type: "string" },
                      visualSteps: {
                        type: "array",
                        items: { type: "string" },
                      },
                      takeaway: { type: "string" },
                    },
                    required: [
                      "title",
                      "concept",
                      "explanation",
                      "visualType",
                      "visualSteps",
                      "takeaway",
                    ],
                  },
                },
                conceptMap: {
                  type: "object",
                  properties: {
                    centralConcept: { type: "string" },
                    branches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          points: {
                            type: "array",
                            items: { type: "string" },
                          },
                        },
                        required: ["label", "points"],
                      },
                    },
                  },
                  required: ["centralConcept", "branches"],
                },
                visualVocabulary: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      term: { type: "string" },
                      simpleMeaning: { type: "string" },
                      visualCue: { type: "string" },
                      connection: { type: "string" },
                    },
                    required: [
                      "term",
                      "simpleMeaning",
                      "visualCue",
                      "connection",
                    ],
                  },
                },
                audioInformation: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      topic: { type: "string" },
                      visualAlternative: { type: "string" },
                    },
                    required: ["topic", "visualAlternative"],
                  },
                },
                visualQuickChecks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: {
                        type: "array",
                        items: { type: "string" },
                      },
                      answerIndex: { type: "integer" },
                      explanation: { type: "string" },
                    },
                    required: [
                      "question",
                      "options",
                      "answerIndex",
                      "explanation",
                    ],
                  },
                },
              },
              required: [
                "visualLesson",
                "conceptMap",
                "visualVocabulary",
                "audioInformation",
                "visualQuickChecks",
              ],
            },
            screenReaderSections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  heading: {
                    type: "string",
                  },
                  content: {
                    type: "string",
                  },
                },
                required: ["heading", "content"],
              },
            },
          },
          required: [
            "title",
            "summary",
            "keyPoints",
            "simplifiedSections",
            "glossary",
            "imageDescriptions",
            "screenReaderSections",
            "cognitiveLearning",
            "hearingAccessibility",
          ],
        },
      },
    });
    const aiResult = JSON.parse(response.text);
    console.log("Gemini transformation completed successfully.");
    return res.json({
      success: true,
      data: {
        title: aiResult.title,
        summary: aiResult.summary,
        keyPoints: aiResult.keyPoints,
        simplifiedSections: aiResult.simplifiedSections,
        glossary: aiResult.glossary,
        imageDescriptions: aiResult.imageDescriptions,
        screenReaderSections: aiResult.screenReaderSections,
        cognitiveLearning: aiResult.cognitiveLearning || {
          learningChunks: [],
          realWorldExamples: [],
          analogies: [],
          story: { title: "", content: "", keyConcepts: [] },
          mindMap: { centralConcept: "", branches: [] },
          rememberPoints: [],
          quickChecks: [],
        },
        hearingAccessibility: aiResult.hearingAccessibility || {
          visualLesson: [],
          conceptMap: { centralConcept: "", branches: [] },
          visualVocabulary: [],
          audioInformation: [],
          visualQuickChecks: [],
        },
        supportMode: requestedSupportMode,
        source: {
          fileName: req.file.originalname,
          fileType:
            req.file.mimetype === "application/pdf" ? "pdf" : "txt",
        },
      },
    });
  } catch (error) {
    console.error("Summarization error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "AI_FAILED",
        message: "Failed to process the document.",
      },
    });
  }
});
function validateAudioConfiguration(res) {
  if (!process.env.ELEVENLABS_API_KEY) {
    res.status(500).json({
      success: false,
      error: {
        code: "MISSING_API_KEY",
        message: "ElevenLabs API key is not configured.",
      },
    });
    return false;
  }
  if (!process.env.ELEVENLABS_VOICE_ID) {
    res.status(500).json({
      success: false,
      error: {
        code: "MISSING_VOICE_ID",
        message: "ElevenLabs voice ID is not configured.",
      },
    });
    return false;
  }
  return true;
}
async function generateElevenLabsAudio(
  text,
  modelId = "eleven_multilingual_v2"
) {
  const elevenLabsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: modelId,
      }),
    }
  );
  if (!elevenLabsResponse.ok) {
    const errorText = await elevenLabsResponse.text();
    console.error("ElevenLabs error:", errorText);
    throw new Error("ElevenLabs audio generation failed.");
  }
  return Buffer.from(await elevenLabsResponse.arrayBuffer());
}
app.post("/api/audio", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: "EMPTY_TEXT",
          message: "Text is required for audio generation.",
        },
      });
    }
    if (!validateAudioConfiguration(res)) {
      return;
    }
    console.log("Generating summary audio with ElevenLabs...");
    const audioBuffer = await generateElevenLabsAudio(text);
    console.log(
      `Summary audio generated successfully (${audioBuffer.length} bytes)`
    );
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
      "Content-Disposition": 'inline; filename="adaptx-summary.mp3"',
      "Cache-Control": "no-store",
    });
    return res.send(audioBuffer);
  } catch (error) {
    console.error("Audio generation error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "AUDIO_GENERATION_FAILED",
        message: "Failed to generate audio.",
      },
    });
  }
});
function buildAccessibleNarration(data) {
  const parts = [];
  const title = data.title || "Accessible Lesson";
  parts.push(`AdaptX Accessible Lesson. ${title}.`);
  if (data.summary) {
    parts.push(`Summary. ${data.summary}`);
  }
  if (
    Array.isArray(data.screenReaderSections) &&
    data.screenReaderSections.length > 0
  ) {
    parts.push("Screen Reader Version.");
    data.screenReaderSections.forEach((section, index) => {
      if (!section) return;
      const heading =
        section.heading || `Screen reader section ${index + 1}`;
      parts.push(`${heading}. ${section.content || ""}`);
    });
  }
  if (
    Array.isArray(data.imageDescriptions) &&
    data.imageDescriptions.length > 0
  ) {
    parts.push("Visual Descriptions.");
    data.imageDescriptions.forEach((item, index) => {
      if (!item) return;
      parts.push(
        `Visual ${index + 1}. ${
          item.description || "Visual description unavailable."
        }. Context. ${item.context || "No additional context available."}`
      );
    });
  }
  if (Array.isArray(data.keyPoints) && data.keyPoints.length > 0) {
    parts.push("Key Points.");
    data.keyPoints.forEach((point, index) => {
      if (!point) return;
      parts.push(`Key point ${index + 1}. ${point}`);
    });
  }
  return parts.join("\n\n");
}
app.post("/api/audio/full", async (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== "object") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_LESSON",
          message: "Lesson data is required.",
        },
      });
    }
    if (!data.title && !data.summary) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_LESSON",
          message: "Lesson title or summary is required.",
        },
      });
    }
    if (!validateAudioConfiguration(res)) {
      return;
    }
    const narration = buildAccessibleNarration(data);
    if (!narration.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: "EMPTY_LESSON",
          message: "There is no content available for audio generation.",
        },
      });
    }
    console.log(
      `Generating full accessible lesson audio (${narration.length} characters)...`
    );
    const audioBuffer = await generateElevenLabsAudio(
      narration,
      "eleven_flash_v2_5"
    );
    console.log(
      `Full accessible lesson audio generated successfully (${audioBuffer.length} bytes)`
    );
    const safeTitle = String(data.title || "lesson")
      .replace(/[^a-z0-9]/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
      "Content-Disposition": `attachment; filename="adaptx-${safeTitle || "lesson"}.mp3"`,
      "Cache-Control": "no-store",
    });
    return res.send(audioBuffer);
  } catch (error) {
    console.error("Full lesson audio error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "AUDIO_GENERATION_FAILED",
        message: "Failed to generate the full lesson audio.",
      },
    });
  }
});
function safeFileName(title) {
  return String(title || "lesson")
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "lesson";
}
function addPdfTitle(doc, title) {
  doc
    .font("Helvetica-Bold")
    .fontSize(24)
    .fillColor("#172136")
    .text(title, {
      align: "left",
    });
  doc.moveDown(0.5);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#667085")
    .text("Generated by AdaptX — Accessible Learning Transformation");
  doc.moveDown(1.5);
}
function addPdfHeading(doc, heading) {
  doc.moveDown(0.8);
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#3157a6")
    .text(heading);
  doc.moveDown(0.4);
}
function addPdfSubheading(doc, heading) {
  doc.moveDown(0.5);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#172136")
    .text(heading);
  doc.moveDown(0.25);
}
function addPdfParagraph(doc, content) {
  if (!content) return;
  doc
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor("#3f4c63")
    .text(String(content), {
      align: "left",
      lineGap: 4,
    });
  doc.moveDown(0.6);
}
function addPdfBullet(doc, content) {
  if (!content) return;
  doc
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor("#3f4c63")
    .text(`• ${String(content)}`, {
      indent: 10,
      lineGap: 4,
    });
  doc.moveDown(0.35);
}
app.post("/api/export-pdf", async (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== "object") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_LESSON",
          message: "Lesson data is required.",
        },
      });
    }
    if (!data.title && !data.summary) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_LESSON",
          message: "Lesson title or summary is required.",
        },
      });
    }
    console.log("Generating refined AdaptX PDF...");
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 50,
        bottom: 50,
        left: 55,
        right: 55,
      },
      info: {
        Title: data.title || "AdaptX Accessible Lesson",
        Author: "AdaptX",
        Subject: "Accessible educational content",
        Creator: "AdaptX",
      },
    });
    const fileName = `adaptx-${safeFileName(data.title)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader("Cache-Control", "no-store");
    doc.pipe(res);
    addPdfTitle(
      doc,
      data.title || "AdaptX Accessible Lesson"
    );
    if (data.source?.fileName) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#667085")
        .text(
          `Source file: ${data.source.fileName}`
        );
      doc.moveDown(1);
    }
    if (data.summary) {
      addPdfHeading(doc, "Summary");
      addPdfParagraph(doc, data.summary);
    }
    if (
      Array.isArray(data.simplifiedSections) &&
      data.simplifiedSections.length > 0
    ) {
      addPdfHeading(doc, "Simplified Learning");
      data.simplifiedSections.forEach((section, index) => {
        if (!section) return;
        addPdfSubheading(
          doc,
          `${index + 1}. ${
            section.heading || "Learning Section"
          }`
        );
        addPdfParagraph(doc, section.content);
      });
    }
    if (Array.isArray(data.glossary) && data.glossary.length > 0) {
      addPdfHeading(doc, "Difficult Words");
      data.glossary.forEach((item) => {
        if (!item) return;
        addPdfSubheading(
          doc,
          item.term || "Term"
        );
        addPdfParagraph(
          doc,
          item.explanation
        );
      });
    }
    if (
      Array.isArray(data.imageDescriptions) &&
      data.imageDescriptions.length > 0
    ) {
      addPdfHeading(doc, "Visual Descriptions");
      data.imageDescriptions.forEach((item, index) => {
        if (!item) return;
        addPdfSubheading(
          doc,
          `Visual ${index + 1}`
        );
        if (item.description) {
          addPdfParagraph(
            doc,
            `Description: ${item.description}`
          );
        }
        if (item.context) {
          addPdfParagraph(
            doc,
            `Context: ${item.context}`
          );
        }
      });
    }
    if (
      Array.isArray(data.screenReaderSections) &&
      data.screenReaderSections.length > 0
    ) {
      addPdfHeading(doc, "Screen Reader Version");
      data.screenReaderSections.forEach((section, index) => {
        if (!section) return;
        addPdfSubheading(
          doc,
          section.heading ||
            `Screen Reader Section ${index + 1}`
        );
        addPdfParagraph(
          doc,
          section.content
        );
      });
    }
    const hearing = data.hearingAccessibility || {};
    if (Array.isArray(hearing.visualLesson) && hearing.visualLesson.length > 0) {
      addPdfHeading(doc, "Visual Lesson");
      hearing.visualLesson.forEach((card, index) => {
        if (!card) return;
        addPdfSubheading(doc, `${index + 1}. ${card.title || card.concept || "Visual Lesson Card"}`);
        if (card.explanation) {
          addPdfParagraph(doc, card.explanation);
        }
        if (Array.isArray(card.visualSteps) && card.visualSteps.length > 0) {
          card.visualSteps.forEach((step) => addPdfBullet(doc, step));
        }
        if (card.takeaway) {
          addPdfParagraph(doc, `Takeaway: ${card.takeaway}`);
        }
      });
    }
    if (hearing.conceptMap?.centralConcept) {
      addPdfHeading(doc, "Connect the Ideas");
      addPdfSubheading(doc, hearing.conceptMap.centralConcept);
      if (Array.isArray(hearing.conceptMap.branches)) {
        hearing.conceptMap.branches.forEach((branch) => {
          if (!branch) return;
          addPdfSubheading(doc, branch.label || "Concept");
          if (Array.isArray(branch.points)) {
            branch.points.forEach((point) => addPdfBullet(doc, point));
          }
        });
      }
    }
    if (Array.isArray(hearing.visualVocabulary) && hearing.visualVocabulary.length > 0) {
      addPdfHeading(doc, "Visual Vocabulary");
      hearing.visualVocabulary.forEach((item) => {
        if (!item) return;
        addPdfSubheading(doc, item.term || "Term");
        if (item.simpleMeaning) addPdfParagraph(doc, `Meaning: ${item.simpleMeaning}`);
        if (item.visualCue) addPdfParagraph(doc, `Visual cue: ${item.visualCue}`);
        if (item.connection) addPdfParagraph(doc, `Connection: ${item.connection}`);
      });
    }
    if (Array.isArray(data.keyPoints) && data.keyPoints.length > 0) {
      addPdfHeading(doc, "Key Points");
      data.keyPoints.forEach((point) => {
        addPdfBullet(doc, point);
      });
    }
    doc
      .moveDown(1)
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#8a94a6")
      .text(
        "AdaptX — Educational accessibility transformation prototype",
        {
          align: "center",
        }
      );
    doc.end();
    console.log("Refined AdaptX PDF generated successfully.");
  } catch (error) {
    console.error("PDF export error:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: {
          code: "PDF_GENERATION_FAILED",
          message: "Failed to generate the PDF.",
        },
      });
    }
  }
});
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});