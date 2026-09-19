import { useEffect, useRef, useState } from "react";
import adaptxLogo from "./assets/adaptx-logo.png";
import {
  exportPdf,
  generateFullAudio,
  summarizeFile,
} from "./services/api";
import "./App.css";

function App() {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [audioUrl, setAudioUrl] = useState("");
  const [audioStatus, setAudioStatus] = useState("idle");
  const [audioError, setAudioError] = useState("");

  const [pdfStatus, setPdfStatus] = useState("idle");
  const [pdfError, setPdfError] = useState("");

  const [page, setPage] = useState("home");
  const [supportMode, setSupportMode] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState("overview");
  const [activeMindMapBranch, setActiveMindMapBranch] = useState(0);
  const [practiceMode, setPracticeMode] = useState("flashcards");
  const [activePracticeIndex, setActivePracticeIndex] = useState(0);
  const [revealedFlashcard, setRevealedFlashcard] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [presentationStarted, setPresentationStarted] = useState(false);
  const [historyItems, setHistoryItems] = useState(() => {
    try {
      const stored = localStorage.getItem("adaptx-history");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("adaptx-history", JSON.stringify(historyItems));
    } catch {
      // History is a convenience feature; the lesson itself should keep working.
    }
  }, [historyItems]);

  const saveHistoryItem = (lessonData, selectedSupportMode, sourceFile) => {
    if (!lessonData) return;

    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      title: lessonData.title || sourceFile?.name || "Untitled lesson",
      fileName: sourceFile?.name || lessonData.source?.fileName || "Curriculum material",
      fileType: sourceFile?.type === "application/pdf" || lessonData.source?.fileType === "pdf" ? "pdf" : "txt",
      supportMode: selectedSupportMode,
      result: lessonData,
    };

    setHistoryItems((current) => [item, ...current.filter((entry) => entry.fileName !== item.fileName || entry.supportMode !== item.supportMode)].slice(0, 12));
  };

  const openHistoryItem = (item) => {
    if (!item?.result) return;

    setResult(item.result);
    setFile(null);
    setSupportMode(item.supportMode || "visual");
    setWorkspaceTab("overview");
    setActiveMindMapBranch(0);
    setPracticeMode("flashcards");
    setActivePracticeIndex(0);
    setRevealedFlashcard(false);
    setSelectedAnswers({});
    setPresentationIndex(0);
    setPresentationStarted(false);
    setStatus("success");
    setError("");
    setPage("workspace");

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl("");
    setAudioStatus("idle");
    setAudioError("");
    setPdfStatus("idle");
    setPdfError("");
  };

  const deleteHistoryItem = (id) => {
    setHistoryItems((current) => current.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    setHistoryItems([]);
  };

  const handleFile = (selectedFile) => {
    setError("");
    setResult(null);
    setSupportMode("");
    setWorkspaceTab("overview");
    setActiveMindMapBranch(0);
    setPracticeMode("flashcards");
    setActivePracticeIndex(0);
    setRevealedFlashcard(false);
    setSelectedAnswers({});
    setPdfStatus("idle");
    setPresentationIndex(0);
    setPresentationStarted(false);
    setPdfError("");

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl("");
    setAudioStatus("idle");
    setAudioError("");

    if (!selectedFile) {
      return;
    }

    const allowedTypes = ["application/pdf", "text/plain"];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please choose a PDF or TXT file.");
      setFile(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("The file must be smaller than 10 MB.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setStatus("idle");
  };

  const handleInputChange = (event) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleTransform = async () => {
    if (!file) {
      setError("Please select a PDF or TXT file first.");
      return;
    }

    if (!supportMode) {
      setError("Choose a learning support experience before generating.");
      return;
    }

    setStatus("loading");
    setError("");
    setResult(null);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl("");
    setAudioStatus("idle");
    setAudioError("");

    setPdfStatus("idle");
    setPdfError("");

    try {
      const data = await summarizeFile(file, supportMode);

      setResult(data);
      saveHistoryItem(data, supportMode, file);
      setActiveMindMapBranch(0);
      setPracticeMode("flashcards");
      setActivePracticeIndex(0);
      setRevealedFlashcard(false);
      setSelectedAnswers({});
      setPresentationIndex(0);
      setPresentationStarted(false);
      setStatus("success");
      setPage("workspace");
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setStatus("error");
    }
  };

  // ============================================================
  // FULL ACCESSIBLE LESSON AUDIO
  // ============================================================

  const handleGenerateAudio = async () => {
    if (!result) {
      return;
    }

    setAudioStatus("loading");
    setAudioError("");

    try {
      const newAudioUrl = await generateFullAudio(result);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(newAudioUrl);
      setAudioStatus("success");
    } catch (err) {
      setAudioError(
        err.message || "Failed to generate full lesson audio."
      );
      setAudioStatus("error");
    }
  };

  // ============================================================
  // DOWNLOAD MP3
  // ============================================================

  const handleDownloadAudio = () => {
    if (!audioUrl) {
      return;
    }

    const safeTitle = (result?.title || "lesson")
      .replace(/[^a-z0-9]/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    const link = document.createElement("a");

    link.href = audioUrl;
    link.download = `adaptx-${safeTitle || "lesson"}.mp3`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================
  // EXPORT PDF
  // ============================================================

  const handleExportPdf = async () => {
    if (!result) {
      return;
    }

    setPdfStatus("loading");
    setPdfError("");

    try {
      const pdfUrl = await exportPdf(result);

      const safeTitle = (result.title || "lesson")
        .replace(/[^a-z0-9]/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

      const link = document.createElement("a");

      link.href = pdfUrl;
      link.download = `adaptx-${safeTitle || "lesson"}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 1000);

      setPdfStatus("success");
    } catch (err) {
      setPdfError(
        err.message || "Failed to export the refined PDF."
      );
      setPdfStatus("error");
    }
  };

  // ============================================================
  // RESET
  // ============================================================

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setFile(null);
    setResult(null);
    setSupportMode("");
    setWorkspaceTab("overview");
    setActiveMindMapBranch(0);
    setPracticeMode("flashcards");
    setActivePracticeIndex(0);
    setRevealedFlashcard(false);
    setSelectedAnswers({});
    setPresentationIndex(0);
    setPresentationStarted(false);
    setError("");
    setStatus("idle");
    setPage("create");

    setAudioUrl("");
    setAudioStatus("idle");
    setAudioError("");

    setPdfStatus("idle");
    setPdfError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileTypeLabel = (fileType) => {
    return fileType === "pdf" ? "PDF" : "TXT";
  };

  // ============================================================
  // RESULTS PAGE
  // ============================================================

  const supportLabel =
    supportMode === "visual"
      ? "Visual Accessibility"
      : supportMode === "cognitive"
        ? "Cognitive & Learning"
        : "Hearing Accessibility";

  const workspaceTabs =
    supportMode === "visual"
      ? [
          { id: "overview", label: "Overview" },
          { id: "screen-reader", label: "Screen Reader" },
          { id: "visuals", label: "Visuals" },
          { id: "audio", label: "Audio" },
        ]
      : supportMode === "hearing"
        ? [
            { id: "overview", label: "Overview" },
            { id: "visual-lesson", label: "Visual Lesson" },
            { id: "connect-ideas", label: "Connect Ideas" },
            { id: "vocabulary", label: "Vocabulary" },
            { id: "hearing-practice", label: "Practice" },
          ]
        : [
            { id: "overview", label: "Overview" },
            { id: "learn", label: "Learn" },
            { id: "story", label: "Story" },
            { id: "mind-map", label: "Mind Map" },
            { id: "practice", label: "Practice" },
          ];

  const renderWorkspaceOverview = () => {
    const cognitive = result.cognitiveLearning || {};

    const learningChunks = Array.isArray(cognitive.learningChunks)
      ? cognitive.learningChunks
      : [];
    const realWorldExamples = Array.isArray(cognitive.realWorldExamples)
      ? cognitive.realWorldExamples
      : [];
    const analogies = Array.isArray(cognitive.analogies)
      ? cognitive.analogies
      : [];
    const rememberPoints = Array.isArray(cognitive.rememberPoints)
      ? cognitive.rememberPoints
      : [];
    const quickChecks = Array.isArray(cognitive.quickChecks)
      ? cognitive.quickChecks
      : [];
    const mindMapBranches = Array.isArray(cognitive.mindMap?.branches)
      ? cognitive.mindMap.branches
      : [];

    const hasStory = Boolean(
      cognitive.story?.title || cognitive.story?.content
    );

    const sourceKeyPoints = Array.isArray(result.keyPoints)
      ? result.keyPoints
      : [];

    const cognitiveMetrics = [
      { value: learningChunks.length, label: "Learning chunks" },
      { value: realWorldExamples.length, label: "Real-world examples" },
      { value: analogies.length, label: "Analogies" },
      { value: hasStory ? 1 : 0, label: "Guided story" },
      { value: mindMapBranches.length, label: "Mind-map branches" },
      { value: rememberPoints.length, label: "Remember points" },
      { value: quickChecks.length, label: "Quick checks" },
      { value: result.glossary?.length || 0, label: "Vocabulary terms" },
    ];

    const hearing = result.hearingAccessibility || {};
    const hearingVisualLesson = Array.isArray(hearing.visualLesson) ? hearing.visualLesson : [];
    const hearingBranches = Array.isArray(hearing.conceptMap?.branches) ? hearing.conceptMap.branches : [];
    const hearingVocabulary = Array.isArray(hearing.visualVocabulary) ? hearing.visualVocabulary : [];
    const hearingChecks = Array.isArray(hearing.visualQuickChecks) ? hearing.visualQuickChecks : [];

    const hearingMetrics = [
      { value: hearingVisualLesson.length, label: "Show-don't-tell cards" },
      { value: hearingBranches.length, label: "Connected concepts" },
      { value: hearingVocabulary.length, label: "Visual vocabulary" },
      { value: hearingChecks.length, label: "Visual quick checks" },
      { value: result.keyPoints?.length || 0, label: "Key concepts" },
      { value: result.simplifiedSections?.length || 0, label: "Learning sections" },
      { value: result.glossary?.length || 0, label: "Vocabulary terms" },
    ];

    const standardMetrics = [
      { value: result.keyPoints?.length || 0, label: "Key concepts" },
      {
        value: result.simplifiedSections?.length || 0,
        label: "Learning sections",
      },
      { value: result.glossary?.length || 0, label: "Vocabulary terms" },
      {
        value: result.imageDescriptions?.length || 0,
        label: "Visual descriptions",
      },
    ];

    const adaptationSteps =
      supportMode === "cognitive"
        ? [
            [
              "Original curriculum",
              "Multiple ideas can appear together in dense lesson text.",
              "Adapted experience",
              "AdaptX separates the lesson into manageable learning chunks.",
            ],
            [
              "Original curriculum",
              "Important ideas may be abstract or difficult to connect.",
              "Adapted experience",
              "AdaptX adds source-grounded examples and clearly labelled analogies.",
            ],
            [
              "Original curriculum",
              "Related concepts may be spread across different sections.",
              "Adapted experience",
              "AdaptX connects major ideas through a guided story and concept map.",
            ],
            [
              "Original curriculum",
              "Learning may rely mainly on reading and recall.",
              "Adapted experience",
              "AdaptX adds remember points and question-based practice.",
            ],
          ]
        : supportMode === "hearing"
          ? [
              [
                "Original curriculum",
                "Important ideas may be carried mainly by dense paragraphs or spoken-style explanations.",
                "Adapted experience",
                "AdaptX keeps a normal text summary while reorganizing key ideas into visual teaching cards.",
              ],
              [
                "Original curriculum",
                "Processes, comparisons, and relationships can be harder to see in ordinary text.",
                "Adapted experience",
                "AdaptX uses purpose-built visual structures and a Connect-the-Ideas map where useful.",
              ],
              [
                "Original curriculum",
                "Important terminology can interrupt understanding when its meaning is unclear.",
                "Adapted experience",
                "AdaptX prepares visual vocabulary cards with simple meanings and lesson connections.",
              ],
            ]
          : [
              [
                "Original curriculum",
                "Important information can be embedded in complex document structure.",
                "Adapted experience",
                "AdaptX creates structured, sequential content for assistive technology.",
              ],
              [
                "Original curriculum",
                "Meaningful diagrams and visual information may not be accessible to every learner.",
                "Adapted experience",
                "AdaptX provides descriptions of important visual information.",
              ],
              [
                "Original curriculum",
                "The lesson may not be available in an accessible spoken format.",
                "Adapted experience",
                "AdaptX can generate an accessible narrated version of the lesson.",
              ],
            ];

    return (
      <div className="workspace-overview">
        <section className="workspace-intro-card">
          <div>
            <div className="eyebrow">ADAPTX ADAPTED LESSON</div>
            <h2>{result.title}</h2>
            <p>{result.summary}</p>
          </div>
          <div className="workspace-intro-stat">
            <span>SUPPORT MODE</span>
            <strong>{supportLabel}</strong>
          </div>
        </section>

        <section className="workspace-review-grid">
          <article className="workspace-review-card source-review-card">
            <div className="workspace-card-topline">
              <span className="workspace-card-number">01</span>
              <span className="workspace-card-label">ORIGINAL LESSON</span>
            </div>
            <h3>{result.title || result.source.fileName}</h3>
            <p>
              This is the curriculum content AdaptX used as the source for the
              transformation. The original material remains the factual
              reference for the adapted experience.
            </p>

            {sourceKeyPoints.length > 0 && (
              <div className="workspace-review-points">
                <strong>What this lesson covers</strong>
                <ul>
                  {sourceKeyPoints.map((point, index) => (
                    <li key={`${point}-${index}`}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            <span className="workspace-card-meta">
              {getFileTypeLabel(result.source.fileType)} · {result.source.fileName}
            </span>
          </article>

          <article className="workspace-review-card adapted-review-card">
            <div className="workspace-card-topline">
              <span className="workspace-card-number">02</span>
              <span className="workspace-card-label">ADAPTED EXPERIENCE</span>
            </div>
            <h3>Built for {supportLabel}</h3>
            <p>
              AdaptX keeps the lesson facts intact and changes how the material
              is organized, presented, and experienced for the selected support.
            </p>

            <div className="workspace-review-points">
              <strong>What AdaptX prepared</strong>
              <ul>
                {supportMode === "cognitive" ? (
                  <>
                    <li>Smaller learning chunks for one idea at a time.</li>
                    <li>Real-world examples and clearly labelled analogies.</li>
                    <li>A guided story to connect the lesson concepts.</li>
                    <li>A concept map to show relationships between ideas.</li>
                    <li>Remember points and question-based practice.</li>
                  </>
                ) : supportMode === "hearing" ? (
                  <>
                    <li>A normal readable summary and key-point lesson.</li>
                    <li>A visual teaching sequence with “show, don't just tell” cards.</li>
                    <li>A Connect-the-Ideas concept map for relationships between ideas.</li>
                    <li>Visual vocabulary and visual quick checks.</li>
                    <li>A simple presentation mode for teaching the visual lesson.</li>
                  </>
                ) : (
                  <>
                    <li>Structured screen-reader-ready lesson sections.</li>
                    <li>Descriptions of meaningful visual information.</li>
                    <li>Accessible narration for listening and offline use.</li>
                  </>
                )}
              </ul>
            </div>

            <span className="workspace-card-meta">
              AI-generated · Review before teaching
            </span>
          </article>
        </section>

        <section className="workspace-summary-grid">
          <div className="workspace-summary-main">
            <div className="eyebrow">AT A GLANCE</div>
            <h3>
              {supportMode === "cognitive"
                ? "What AdaptX prepared for learning"
                : "What AdaptX prepared"}
            </h3>
            <div className="workspace-metrics">
              {(supportMode === "cognitive"
                ? cognitiveMetrics
                : supportMode === "hearing"
                  ? hearingMetrics
                  : standardMetrics
              ).map((metric) => (
                <div key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="workspace-summary-side">
            <div className="eyebrow">TEACHER REVIEW</div>
            <h3>Review before you teach.</h3>
            <p>
              AdaptX keeps the original curriculum as the source of truth while
              making the generated experience easier to inspect and use.
            </p>
            <button
              className="secondary-button"
              onClick={handleExportPdf}
              disabled={pdfStatus === "loading"}
              type="button"
            >
              {pdfStatus === "loading"
                ? "Preparing PDF..."
                : "Export adapted PDF →"}
            </button>
          </div>
        </section>

        {sourceKeyPoints.length > 0 && (
          <section className="workspace-content-card">
            <div className="workspace-content-heading">
              <div>
                <div className="eyebrow">LESSON ROADMAP</div>
                <h2>See the main ideas before you start.</h2>
                <p>
                  These key concepts give the teacher and learner a quick map of
                  what the lesson is about.
                </p>
              </div>
              <span className="workspace-count">
                {sourceKeyPoints.length} key concepts
              </span>
            </div>

            <div className="workspace-learning-list">
              {sourceKeyPoints.map((point, index) => (
                <article
                  className="workspace-learning-item"
                  key={`${point}-${index}`}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{point}</h3>
                    <p>
                      This concept is part of the lesson's main learning path.
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="workspace-content-card">
          <div className="workspace-content-heading">
            <div>
              <div className="eyebrow">TRANSFORMATION</div>
              <h2>How AdaptX changed the learning experience.</h2>
              <p>
                The transformation changes the presentation of the curriculum
                while keeping the underlying educational meaning intact.
              </p>
            </div>
          </div>

          <div className="workspace-review-grid">
            {adaptationSteps.map((step, index) => (
              <article className="workspace-review-card" key={index}>
                <div className="workspace-card-topline">
                  <span className="workspace-card-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="workspace-card-label">ADAPTATION</span>
                </div>
                <h3>{step[0]}</h3>
                <p>{step[1]}</p>
                <div className="workspace-adaptation-arrow">↓</div>
                <h3>{step[2]}</h3>
                <p>{step[3]}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  };

  const renderSimplifiedLearning = () => {
    const cognitive = result.cognitiveLearning || {};
    const cognitiveChunks = Array.isArray(cognitive.learningChunks)
      ? cognitive.learningChunks
      : [];
    const fallbackSections = Array.isArray(result.simplifiedSections)
      ? result.simplifiedSections
      : [];

    const chunks =
      cognitiveChunks.length > 0
        ? cognitiveChunks
        : fallbackSections.map((section) => ({
            heading: section.heading,
            explanation: section.content,
          }));

    const getChunkText = (chunk, ...keys) => {
      for (const key of keys) {
        if (typeof chunk?.[key] === "string" && chunk[key].trim()) {
          return chunk[key].trim();
        }
      }
      return "";
    };

    return (
      <article className="workspace-content-card">
        <div className="workspace-content-heading">
          <div>
            <div className="eyebrow">LEARN</div>
            <h2>Understand one idea at a time.</h2>
            <p>
              AdaptX breaks the lesson into meaningful concepts so the learner
              can focus, connect ideas, and remember what matters.
            </p>
          </div>
          <span className="workspace-count">
            {chunks.length} learning {chunks.length === 1 ? "chunk" : "chunks"}
          </span>
        </div>

        {chunks.length > 0 ? (
          <div className="workspace-learning-list">
            {chunks.map((chunk, index) => {
              const explanation = getChunkText(
                chunk,
                "explanation",
                "simpleExplanation",
                "content"
              );
              const example = getChunkText(
                chunk,
                "realWorldExample",
                "example"
              );
              const whyItMatters = getChunkText(
                chunk,
                "whyItMatters",
                "importance"
              );
              const remember = getChunkText(
                chunk,
                "remember",
                "rememberPoint"
              );

              return (
                <article
                  className="workspace-learning-item"
                  key={`${chunk.heading || "chunk"}-${index}`}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{chunk.heading || `Learning point ${index + 1}`}</h3>

                    {explanation && <p>{explanation}</p>}

                    {example && (
                      <div className="workspace-inline-note">
                        <strong>Real-world example</strong>
                        <p>{example}</p>
                      </div>
                    )}

                    {whyItMatters && (
                      <div className="workspace-inline-note">
                        <strong>Why it matters</strong>
                        <p>{whyItMatters}</p>
                      </div>
                    )}

                    {remember && (
                      <div className="workspace-inline-note">
                        <strong>Remember this</strong>
                        <p>{remember}</p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="workspace-empty">
            No cognitive learning chunks were generated for this material.
          </div>
        )}
      </article>
    );
  };

  const renderVisuals = () => (
    <article className="workspace-content-card">
      <div className="workspace-content-heading">
        <div>
          <div className="eyebrow">VISUAL SUPPORT</div>
          <h2>Make meaningful visuals easier to access.</h2>
          <p>Descriptions of diagrams, charts, tables and other visual information found in the source.</p>
        </div>
        <span className="workspace-count">{result.imageDescriptions?.length || 0} visuals</span>
      </div>

      {result.imageDescriptions?.length > 0 ? (
        <div className="workspace-visual-list">
          {result.imageDescriptions.map((item, index) => (
            <article className="workspace-visual-item" key={`${item.description}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>Visual {index + 1}</strong>
                <p>{item.description}</p>
                <small>Why it matters: {item.context}</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="workspace-empty">No meaningful visual elements were detected in this document.</div>
      )}
    </article>
  );

  const renderScreenReader = () => (
    <article className="workspace-content-card workspace-dark-card">
      <div className="workspace-content-heading">
        <div>
          <div className="eyebrow">SCREEN READER</div>
          <h2>Structured, linear lesson content.</h2>
          <p>Organized for learners using assistive technology and sequential reading.</p>
        </div>
      </div>
      <div className="workspace-screen-reader-list">
        {result.screenReaderSections?.length > 0 ? result.screenReaderSections.map((section, index) => (
          <section key={index}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{section.heading}</h3><p>{section.content}</p></div>
          </section>
        )) : <div className="workspace-empty dark-empty">No screen-reader sections were generated.</div>}
      </div>
    </article>
  );

  const renderAudio = () => (
    <article className="workspace-content-card workspace-audio-card">
      <div className="workspace-content-heading">
        <div>
          <div className="eyebrow">ACCESSIBLE AUDIO</div>
          <h2>Listen to the adapted lesson.</h2>
          <p>Generate a spoken version of the accessible lesson for listening and offline use.</p>
        </div>
        <div className="workspace-audio-symbol">▶</div>
      </div>

      {audioStatus !== "success" && (
        <button className="audio-button" onClick={handleGenerateAudio} disabled={audioStatus === "loading"} type="button">
          {audioStatus === "loading" ? <><span className="audio-spinner" /> Generating lesson audio...</> : <>▶ Listen to full lesson</>}
        </button>
      )}

      {audioStatus === "success" && audioUrl && (
        <div className="audio-player-wrapper">
          <audio className="audio-player" controls src={audioUrl} aria-label={`Full accessible audio lesson for ${result.title}`}>
            Your browser does not support audio playback.
          </audio>
          <div className="workspace-audio-actions">
            <button className="primary-button" onClick={handleDownloadAudio} type="button">↓ Download MP3</button>
            <button className="regenerate-audio-button" onClick={handleGenerateAudio} type="button">Generate again</button>
          </div>
        </div>
      )}
      {audioError && <div className="audio-error" role="alert"><span>!</span>{audioError}</div>}
    </article>
  );

  const getHearingData = () => {
    const hearing = result.hearingAccessibility || {};
    return {
      visualLesson: Array.isArray(hearing.visualLesson) ? hearing.visualLesson : [],
      conceptMap: hearing.conceptMap || { centralConcept: "", branches: [] },
      visualVocabulary: Array.isArray(hearing.visualVocabulary)
        ? hearing.visualVocabulary
        : [],
      visualQuickChecks: Array.isArray(hearing.visualQuickChecks)
        ? hearing.visualQuickChecks
        : [],
    };
  };

  const getVisualTypeLabel = (type) => {
    const labels = {
      "process": "Process",
      "cause-effect": "Cause → Effect",
      "comparison": "Compare",
      "timeline": "Timeline",
      "cycle": "Cycle",
      "sequence": "Sequence",
      "before-after": "Before → After",
      "classification": "Groups",
      "relationship": "Relationship",
      "text-focus": "Key idea",
    };

    return labels[String(type || "text-focus").toLowerCase()] || "Visual idea";
  };

  const getVisualTypeIcon = (type) => {
    const icons = {
      "process": "→",
      "cause-effect": "↳",
      "comparison": "⇄",
      "timeline": "⌁",
      "cycle": "↻",
      "sequence": "1→2",
      "before-after": "◌→●",
      "classification": "⊂",
      "relationship": "∞",
      "text-focus": "•",
    };

    return icons[String(type || "text-focus").toLowerCase()] || "•";
  };

  const getVisualSignal = (item) => {
    const type = String(item?.visualType || "text-focus").toLowerCase();
    const signals = {
      process: { emoji: "🔄", label: "Process" },
      sequence: { emoji: "🪜", label: "Sequence" },
      "cause-effect": { emoji: "🔗", label: "Cause → Effect" },
      comparison: { emoji: "⚖️", label: "Compare" },
      timeline: { emoji: "🗓️", label: "Timeline" },
      cycle: { emoji: "♻️", label: "Cycle" },
      "before-after": { emoji: "↔️", label: "Before → After" },
      classification: { emoji: "🗂️", label: "Groups" },
      relationship: { emoji: "🧩", label: "Relationship" },
      "text-focus": { emoji: "💡", label: "Key idea" },
    };
    return signals[type] || signals["text-focus"];
  };

  const getMindMapSignal = (label, index) => {
    const text = String(label || "").toLowerCase();
    if (/example|real|application|daily|life/.test(text)) return "🌍";
    if (/process|step|stage|how/.test(text)) return "🔄";
    if (/cause|effect|reason|result/.test(text)) return "🔗";
    if (/important|remember|key|main/.test(text)) return "🧠";
    if (/compare|difference|similar/.test(text)) return "⚖️";
    if (/definition|meaning|term/.test(text)) return "📌";
    if (/problem|question|check/.test(text)) return "❓";
    return ["💡", "🌱", "🔬", "🧩", "⭐", "📚"][index % 6];
  };

  const renderVisualStructure = (item) => {
    const steps = Array.isArray(item?.visualSteps) ? item.visualSteps : [];
    const visualType = String(item?.visualType || "text-focus").toLowerCase();

    if (steps.length === 0) {
      return (
        <div className="hearing-visual-text-focus">
          <span>{getVisualTypeIcon(visualType)}</span>
          <strong>Focus on the idea</strong>
        </div>
      );
    }

    return (
      <div className={`hearing-visual-structure visual-type-${visualType}`}>
        {steps.map((step, index) => (
          <div className="hearing-visual-step" key={`${step}-${index}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
            {index < steps.length - 1 && <i aria-hidden="true">→</i>}
          </div>
        ))}
      </div>
    );
  };

  const renderHearingVisualLesson = () => {
    const { visualLesson } = getHearingData();
    const cards = visualLesson;
    const safeIndex = cards.length > 0
      ? Math.min(Math.max(presentationIndex, 0), cards.length - 1)
      : 0;
    const activeCard = cards[safeIndex];
    const signal = activeCard ? getVisualSignal(activeCard) : null;

    const movePresentation = (nextIndex) => {
      if (!cards.length) return;
      setPresentationIndex(Math.min(Math.max(nextIndex, 0), cards.length - 1));
    };

    return (
      <article className="workspace-content-card hearing-visual-lesson-card">
        <div className="workspace-content-heading">
          <div>
            <div className="eyebrow">VISUAL-FIRST LESSON</div>
            <h2>Show the idea, don't just tell it.</h2>
            <p>
              AdaptX turns important lesson ideas into visual signals, structures,
              examples and memory cues that do not depend on audio.
            </p>
          </div>
          <div className="hearing-visual-heading-actions">
            <span className="workspace-count">{cards.length} visual cards</span>
            {cards.length > 0 && (
              <button
                className={presentationStarted ? "secondary-button" : "primary-button"}
                onClick={() => {
                  setPresentationStarted((current) => !current);
                  if (!presentationStarted) setPresentationIndex(0);
                }}
                type="button"
              >
                {presentationStarted ? "← Back to cards" : "▶ Start Presentation"}
              </button>
            )}
          </div>
        </div>

        {cards.length > 0 ? (
          presentationStarted ? (
            <div className="hearing-presentation-stage started embedded-presentation">
              <div className="hearing-presentation-progress">
                <span>VISUAL LESSON · {safeIndex + 1} OF {cards.length}</span>
                <div><i style={{ width: `${((safeIndex + 1) / cards.length) * 100}%` }} /></div>
              </div>
              <div className="hearing-presentation-content">
                <div className="hearing-presentation-type">
                  <span className="visual-signal-emoji" aria-hidden="true">{signal?.emoji}</span>
                  {signal?.label}
                </div>
                <h3>{activeCard.title || activeCard.concept}</h3>
                <p>{activeCard.explanation}</p>
                {renderVisualStructure(activeCard)}
                {activeCard.takeaway && (
                  <div className="hearing-takeaway presentation-takeaway">
                    <strong>🧠 Remember</strong>
                    <span>{activeCard.takeaway}</span>
                  </div>
                )}
              </div>
              <div className="hearing-presentation-controls">
                <button
                  className="secondary-button"
                  onClick={() => movePresentation(safeIndex - 1)}
                  disabled={safeIndex === 0}
                  type="button"
                >
                  ← Previous
                </button>
                <span>{safeIndex + 1} / {cards.length}</span>
                <button
                  className="primary-button"
                  onClick={() => movePresentation(safeIndex + 1)}
                  disabled={safeIndex === cards.length - 1}
                  type="button"
                >
                  Next →
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="visual-signal-legend" aria-label="Visual signal legend">
                <span>💡 Key idea</span>
                <span>🔄 Process</span>
                <span>🔗 Relationship</span>
                <span>⚖️ Compare</span>
                <span>🧠 Remember</span>
              </div>
              <div className="hearing-visual-card-list">
                {cards.map((card, index) => {
                  const cardSignal = getVisualSignal(card);
                  return (
                    <article className="hearing-visual-card" key={`${card.title || card.concept}-${index}`}>
                      <div className="hearing-visual-card-number">{String(index + 1).padStart(2, "0")}</div>
                      <div className="hearing-visual-card-body">
                        <div className="hearing-visual-card-topline">
                          <span className="hearing-visual-type">
                            <span className="visual-signal-emoji" aria-hidden="true">{cardSignal.emoji}</span>
                            {cardSignal.label}
                          </span>
                          <span className="visual-signal-chip">{cardSignal.emoji} Visual signal</span>
                        </div>
                        <h3>{card.title || card.concept || `Lesson concept ${index + 1}`}</h3>
                        {card.concept && <div className="hearing-concept-label">CONCEPT · {card.concept}</div>}
                        <p>{card.explanation}</p>
                        {renderVisualStructure(card)}
                        {card.takeaway && (
                          <div className="hearing-takeaway">
                            <strong>🧠 Remember</strong>
                            <span>{card.takeaway}</span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )
        ) : (
          <div className="workspace-empty">
            No visual lesson cards were generated for this material.
          </div>
        )}
      </article>
    );
  };

  const renderHearingConceptMap = () => {
    const { conceptMap } = getHearingData();
    const branches = Array.isArray(conceptMap.branches) ? conceptMap.branches : [];

    return (
      <article className="workspace-content-card">
        <div className="workspace-content-heading">
          <div>
            <div className="eyebrow">CONNECT THE IDEAS</div>
            <h2>See how the lesson fits together.</h2>
            <p>
              Start from the central idea and move through the major concepts and
              their supporting relationships.
            </p>
          </div>
          <span className="workspace-count">{branches.length} connected concepts</span>
        </div>

        {branches.length > 0 || conceptMap.centralConcept ? (
          <div className="hearing-concept-map">
            <div className="hearing-concept-root">
              <span>MAIN IDEA</span>
              <strong>{conceptMap.centralConcept || result.title}</strong>
            </div>

            <div className="hearing-concept-connector" aria-hidden="true" />

            <div className="hearing-concept-branches">
              {branches.map((branch, index) => (
                <article className="hearing-concept-branch" key={`${branch.label || "concept"}-${index}`}>
                  <div className="hearing-concept-branch-number">{String(index + 1).padStart(2, "0")}</div>
                  <h3>{branch.label || `Concept ${index + 1}`}</h3>
                  {Array.isArray(branch.points) && branch.points.length > 0 ? (
                    <ul>
                      {branch.points.map((point, pointIndex) => (
                        <li key={`${point}-${pointIndex}`}>{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>This concept is directly connected to the lesson's main idea.</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="workspace-empty">No concept map was generated for this material.</div>
        )}
      </article>
    );
  };

  const renderHearingVocabulary = () => {
    const { visualVocabulary } = getHearingData();

    return (
      <article className="workspace-content-card">
        <div className="workspace-content-heading">
          <div>
            <div className="eyebrow">VISUAL VOCABULARY</div>
            <h2>Make important words easier to understand.</h2>
            <p>
              Important terms are paired with simple meanings and visual cues so
              vocabulary does not become a hidden barrier to the lesson.
            </p>
          </div>
          <span className="workspace-count">{visualVocabulary.length} terms</span>
        </div>

        {visualVocabulary.length > 0 ? (
          <div className="hearing-vocabulary-grid">
            {visualVocabulary.map((item, index) => (
              <article className="hearing-vocabulary-card" key={`${item.term || "term"}-${index}`}>
                <div className="hearing-vocabulary-topline">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div className="hearing-vocabulary-cue" aria-hidden="true">{item.visualCue || "•"}</div>
                </div>
                <h3>{item.term || "Important term"}</h3>
                <p>{item.simpleMeaning}</p>
                {item.connection && (
                  <div className="hearing-vocabulary-connection">
                    <strong>In this lesson</strong>
                    <span>{item.connection}</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="workspace-empty">No visual vocabulary was generated for this material.</div>
        )}
      </article>
    );
  };

  const renderHearingPractice = () => {
    const { visualQuickChecks } = getHearingData();
    const checks = visualQuickChecks;
    const safeIndex = checks.length > 0
      ? Math.min(Math.max(activePracticeIndex, 0), checks.length - 1)
      : 0;
    const activeCheck = checks[safeIndex];
    const selected = selectedAnswers[safeIndex];
    const answered = selected !== undefined;

    const moveCheck = (nextIndex) => {
      if (!checks.length) return;
      setActivePracticeIndex(Math.min(Math.max(nextIndex, 0), checks.length - 1));
    };

    return (
      <article className="workspace-content-card hearing-practice-card">
        <div className="workspace-content-heading">
          <div>
            <div className="eyebrow">VISUAL QUICK CHECKS</div>
            <h2>Check understanding without relying on audio.</h2>
            <p>
              Each question is grounded in the lesson and uses clear, structured
              answer choices.
            </p>
          </div>
          <span className="workspace-count">{checks.length} questions</span>
        </div>

        {activeCheck ? (
          <div className="hearing-check-shell">
            <div className="hearing-check-number">QUESTION {String(safeIndex + 1).padStart(2, "0")}</div>
            <h3>{activeCheck.question}</h3>
            <div className="hearing-check-options">
              {(Array.isArray(activeCheck.options) ? activeCheck.options : []).map((option, optionIndex) => {
                const isSelected = selected === optionIndex;
                const isCorrect = optionIndex === activeCheck.answerIndex;
                const stateClass = answered
                  ? isCorrect
                    ? "correct"
                    : isSelected
                      ? "incorrect"
                      : ""
                  : isSelected
                    ? "selected"
                    : "";

                return (
                  <button
                    className={`hearing-check-option ${stateClass}`}
                    key={`${option}-${optionIndex}`}
                    onClick={() => {
                      if (!answered) {
                        setSelectedAnswers((current) => ({
                          ...current,
                          [safeIndex]: optionIndex,
                        }));
                      }
                    }}
                    type="button"
                    disabled={answered}
                  >
                    <span>{String.fromCharCode(65 + optionIndex)}</span>
                    <strong>{option}</strong>
                    {answered && isCorrect && <em>Correct</em>}
                    {answered && isSelected && !isCorrect && <em>Review</em>}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className={`hearing-check-feedback ${selected === activeCheck.answerIndex ? "success" : "review"}`}>
                <strong>{selected === activeCheck.answerIndex ? "Correct — nice work." : "Let's review this one."}</strong>
                <p>{activeCheck.explanation}</p>
              </div>
            )}

            <div className="practice-navigation">
              <button className="secondary-button" onClick={() => moveCheck(safeIndex - 1)} disabled={safeIndex === 0} type="button">
                ← Previous
              </button>
              <span>{safeIndex + 1} / {checks.length}</span>
              <button className="primary-button" onClick={() => moveCheck(safeIndex + 1)} disabled={safeIndex === checks.length - 1} type="button">
                Next →
              </button>
            </div>
          </div>
        ) : (
          <div className="workspace-empty">No visual quick checks were generated for this lesson.</div>
        )}
      </article>
    );
  };

  const renderCognitiveMindMap = () => {
    const cognitive = result.cognitiveLearning || {};
    const mindMap = cognitive.mindMap || {};
    const branches = Array.isArray(mindMap.branches) ? mindMap.branches : [];
    const fallbackBranches = (result.keyPoints || []).map((point) => ({
      label: point,
      points: [],
    }));
    const visibleBranches = branches.length > 0 ? branches : fallbackBranches;
    const safeBranchIndex =
      activeMindMapBranch >= 0 && activeMindMapBranch < visibleBranches.length
        ? activeMindMapBranch
        : 0;
    const activeBranch = visibleBranches[safeBranchIndex];

    return (
      <article className="workspace-content-card">
        <div className="workspace-content-heading">
          <div>
            <div className="eyebrow">CONCEPT MAP</div>
            <h2>See how the lesson connects.</h2>
            <p>
              Start with the central idea, then explore the major concepts and
              the supporting points underneath them.
            </p>
          </div>
          <span className="workspace-count">
            {visibleBranches.length} main branches
          </span>
        </div>

        {visibleBranches.length > 0 ? (
          <div className="mind-map-preview colorful-mind-map">
            <div className="mind-map-root">
              <span className="mind-map-root-emoji" aria-hidden="true">🧠</span>
              <span className="mind-map-root-label">MAIN IDEA</span>
              <strong>{mindMap.centralConcept || result.title}</strong>
            </div>

            <div className="mind-map-branches">
              {visibleBranches.map((branch, index) => (
                <button
                  className={`mind-map-branch mind-map-color-${index % 6} ${
                    safeBranchIndex === index ? "active" : ""
                  }`}
                  key={`${branch.label || "branch"}-${index}`}
                  onClick={() => setActiveMindMapBranch(index)}
                  type="button"
                  aria-pressed={safeBranchIndex === index}
                >
                  <span className="mind-map-branch-icon" aria-hidden="true">{getMindMapSignal(branch.label, index)}</span>
                  <div>
                    <span className="mind-map-branch-number">{String(index + 1).padStart(2, "0")}</span>
                    <strong>{branch.label || `Concept ${index + 1}`}</strong>
                    {Array.isArray(branch.points) && branch.points.length > 0 && (
                      <small>{branch.points.length} supporting points</small>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {activeBranch && (
              <div className="workspace-content-card mind-map-detail">
                <div className="eyebrow">SELECTED CONCEPT</div>
                <h3><span className="selected-concept-emoji" aria-hidden="true">{getMindMapSignal(activeBranch.label, safeBranchIndex)}</span>{activeBranch.label}</h3>

                {Array.isArray(activeBranch.points) &&
                activeBranch.points.length > 0 ? (
                  <ul className="workspace-review-points">
                    {activeBranch.points.map((point, index) => (
                      <li key={`${point}-${index}`}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    This concept is one of the main ideas identified from the
                    source lesson.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="workspace-empty">
            No concept map was generated for this material.
          </div>
        )}
      </article>
    );
  };

  const renderCognitiveStory = () => {
    const story = result.cognitiveLearning?.story || {};
    const keyConcepts = Array.isArray(story.keyConcepts)
      ? story.keyConcepts
      : [];

    const hasStory = Boolean(
      typeof story.title === "string" && story.title.trim()
        ? story.title.trim()
        : typeof story.content === "string" && story.content.trim()
    );

    return (
      <article className="workspace-content-card workspace-story-card">
        <div className="workspace-content-heading">
          <div>
            <div className="eyebrow">STORY MODE</div>
            <h2>Connect the ideas through a guided story.</h2>
            <p>
              Story Mode links the lesson concepts into one understandable
              sequence. It is a teaching aid, not a replacement for the source.
            </p>
          </div>
        </div>

        {hasStory ? (
          <>
            <div className="story-preview">
              <span>✦</span>
              <div>
                <strong>{story.title || "Guided lesson story"}</strong>
                <p>{story.content}</p>
              </div>
            </div>

            {keyConcepts.length > 0 && (
              <div className="workspace-content-card">
                <div className="workspace-content-heading">
                  <div>
                    <div className="eyebrow">CONCEPTS IN THE STORY</div>
                    <h3>What to notice while teaching</h3>
                  </div>
                  <span className="workspace-count">
                    {keyConcepts.length} concepts
                  </span>
                </div>

                <div className="workspace-learning-list">
                  {keyConcepts.map((concept, index) => (
                    <article
                      className="workspace-learning-item"
                      key={`${concept}-${index}`}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h3>{concept}</h3>
                        <p>
                          This concept is intentionally connected to the lesson
                          narrative so it can be recalled in context.
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="workspace-empty">
            The current generation did not return a guided story. Regenerate
            the material after the cognitive transformation is available.
          </div>
        )}
      </article>
    );
  };

  const renderCognitivePractice = () => {
    const cognitive = result.cognitiveLearning || {};
    const quickChecks = Array.isArray(cognitive.quickChecks)
      ? cognitive.quickChecks
      : [];
    const flashcards = Array.isArray(cognitive.flashcards)
      ? cognitive.flashcards
      : [];

    const recallCards =
      flashcards.length > 0
        ? flashcards
        : quickChecks.map((check) => ({
            question: check.question,
            answer:
              Array.isArray(check.options) &&
              Number.isInteger(check.answerIndex)
                ? check.options[check.answerIndex]
                : "",
            explanation: check.explanation || "",
          }));

    const practiceItems =
      practiceMode === "flashcards" ? recallCards : quickChecks;

    const safeIndex =
      activePracticeIndex >= 0 &&
      activePracticeIndex < practiceItems.length
        ? activePracticeIndex
        : 0;

    const activeItem = practiceItems[safeIndex];

    const goToPracticeItem = (nextIndex) => {
      const total = practiceItems.length;
      if (!total) return;

      const normalized = (nextIndex + total) % total;
      setActivePracticeIndex(normalized);
      setRevealedFlashcard(false);
    };

    const handleAnswer = (questionIndex, optionIndex) => {
      setSelectedAnswers((current) => ({
        ...current,
        [questionIndex]: optionIndex,
      }));
    };

    return (
      <article className="workspace-content-card">
        <div className="workspace-content-heading">
          <div>
            <div className="eyebrow">PRACTICE</div>
            <h2>Check understanding, one idea at a time.</h2>
            <p>
              Use recall first, then check the answer and explanation. Questions
              stay grounded in the generated lesson.
            </p>
          </div>
        </div>

        <div className="workspace-tabs practice-mode-tabs">
          <button
            className={`workspace-tab ${
              practiceMode === "flashcards" ? "active" : ""
            }`}
            onClick={() => {
              setPracticeMode("flashcards");
              setActivePracticeIndex(0);
              setRevealedFlashcard(false);
            }}
            type="button"
          >
            Recall Cards
          </button>
          <button
            className={`workspace-tab ${
              practiceMode === "checks" ? "active" : ""
            }`}
            onClick={() => {
              setPracticeMode("checks");
              setActivePracticeIndex(0);
              setRevealedFlashcard(false);
            }}
            type="button"
          >
            Quick Checks
          </button>
        </div>

        {practiceItems.length > 0 && activeItem ? (
          <div className="practice-preview">
            <span>{String(safeIndex + 1).padStart(2, "0")}</span>
            <div>
              {practiceMode === "flashcards" ? (
                <>
                  <strong>{activeItem.question || "Recall this idea"}</strong>

                  {!revealedFlashcard ? (
                    <button
                      className="secondary-button"
                      onClick={() => setRevealedFlashcard(true)}
                      type="button"
                    >
                      Reveal answer
                    </button>
                  ) : (
                    <div className="workspace-inline-note">
                      <strong>Answer</strong>
                      <p>
                        {activeItem.answer ||
                          "The generated material did not include an answer."}
                      </p>
                      {activeItem.explanation && (
                        <>
                          <strong>Why</strong>
                          <p>{activeItem.explanation}</p>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <strong>
                    {activeItem.question || "Check this concept"}
                  </strong>

                  {Array.isArray(activeItem.options) &&
                    activeItem.options.length > 0 && (
                      <div className="workspace-review-points">
                        {activeItem.options.map((option, optionIndex) => {
                          const selected =
                            selectedAnswers[safeIndex] === optionIndex;
                          const answered = selectedAnswers[safeIndex] !== undefined;
                          const correct =
                            Number.isInteger(activeItem.answerIndex) &&
                            optionIndex === activeItem.answerIndex;

                          return (
                            <button
                              key={`${option}-${optionIndex}`}
                              className={`practice-option ${
                                selected ? "selected" : ""
                              } ${answered && correct ? "correct" : ""}`}
                              onClick={() =>
                                handleAnswer(safeIndex, optionIndex)
                              }
                              type="button"
                            >
                              <span>
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    )}

                  {selectedAnswers[safeIndex] !== undefined && (
                    <div className="workspace-inline-note">
                      <strong>
                        {selectedAnswers[safeIndex] === activeItem.answerIndex
                          ? "Correct"
                          : "Let's review this one"}
                      </strong>
                      <p>
                        {activeItem.explanation ||
                          "Review the related learning chunk and try again."}
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="practice-navigation">
                <button
                  className="secondary-button"
                  onClick={() => goToPracticeItem(safeIndex - 1)}
                  type="button"
                  disabled={practiceItems.length <= 1}
                >
                  ← Previous
                </button>
                <span>
                  {safeIndex + 1} / {practiceItems.length}
                </span>
                <button
                  className="secondary-button"
                  onClick={() => goToPracticeItem(safeIndex + 1)}
                  type="button"
                  disabled={practiceItems.length <= 1}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="workspace-empty">
            No practice items were generated for this lesson yet.
          </div>
        )}
      </article>
    );
  };

  const renderWorkspaceTab = () => {
    if (workspaceTab === "overview") return renderWorkspaceOverview();
    if (workspaceTab === "screen-reader") return renderScreenReader();
    if (workspaceTab === "visuals") return renderVisuals();
    if (workspaceTab === "audio") return renderAudio();
    if (workspaceTab === "visual-lesson") return renderHearingVisualLesson();
    if (workspaceTab === "connect-ideas") return renderHearingConceptMap();
    if (workspaceTab === "vocabulary") return renderHearingVocabulary();
    if (workspaceTab === "hearing-practice") return renderHearingPractice();
    if (workspaceTab === "learn") return renderSimplifiedLearning();
    if (workspaceTab === "story") return renderCognitiveStory();
    if (workspaceTab === "mind-map") return renderCognitiveMindMap();
    if (workspaceTab === "practice") return renderCognitivePractice();
    return renderWorkspaceOverview();
  };

  if (status === "success" && result && page === "workspace") {
    return (
      <div className="app">
        <header className="topbar">
          <button className="brand brand-button" onClick={() => setPage("home")} type="button" aria-label="Go to AdaptX home">
            <img className="brand-logo" src={adaptxLogo} alt="AdaptX" />
          </button>

          <div className="header-right-stack">
            <nav className="topnav" aria-label="Primary navigation">
              <button className="nav-link" onClick={() => setPage("home")} type="button">Home</button>
              <button className="nav-link" onClick={handleReset} type="button">Create Material</button>
              <button className="nav-link" onClick={() => setPage("history")} type="button">History</button>
            </nav>
            <div className="header-pill">
              <span className="status-dot" />
              AI learning transformation
            </div>
          </div>
        </header>

        <main className="workspace-page">
          <div className="workspace-breadcrumb">
            <button onClick={() => setPage("create")} type="button">← Create Material</button>
            <span>/</span>
            <span>{supportLabel}</span>
          </div>

          <header className="workspace-header">
            <div>
              <div className="eyebrow">LESSON WORKSPACE</div>
              <h1>{result.title}</h1>
              <p>One curriculum source, presented through a focused {supportLabel.toLowerCase()} experience.</p>
            </div>
            <div className="result-meta-stack">
              <div className="source-badge">
                <span className="file-icon">▱</span>
                <div><strong>{result.source.fileName}</strong><span>{getFileTypeLabel(result.source.fileType)} document</span></div>
              </div>
              <div className="result-support-badge"><span>SUPPORT</span>{supportLabel}</div>
            </div>
          </header>

          <nav className="workspace-tabs" aria-label="Lesson workspace sections">
            {workspaceTabs.map((tab) => (
              <button
                key={tab.id}
                className={`workspace-tab ${workspaceTab === tab.id ? "active" : ""}`}
                onClick={() => setWorkspaceTab(tab.id)}
                type="button"
                aria-current={workspaceTab === tab.id ? "page" : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <section className="workspace-content">
            {renderWorkspaceTab()}
          </section>

          <section className="workspace-export-bar">
            <div>
              <div className="eyebrow">TEACHER REVIEW &amp; EXPORT</div>
              <strong>Ready to take this adapted lesson into the classroom?</strong>
              <p>Review the generated experience, then export the refined material.</p>
            </div>
            <div className="workspace-export-actions">
              <button className="secondary-button" onClick={handleExportPdf} disabled={pdfStatus === "loading"} type="button">
                {pdfStatus === "loading" ? "Preparing PDF..." : "↓ Export PDF"}
              </button>
              {audioUrl && <button className="secondary-button" onClick={handleDownloadAudio} type="button">↓ Download MP3</button>}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ============================================================
  // PRODUCT SHELL
  // ============================================================

  const renderTopbar = () => (
    <header className="topbar">
      <button
        className="brand brand-button"
        onClick={() => setPage("home")}
        type="button"
        aria-label="Go to AdaptX home"
      >
        <img className="brand-logo" src={adaptxLogo} alt="AdaptX" />
      </button>

      <div className="header-right-stack">
        <nav className="topnav" aria-label="Primary navigation">
          <button
            className={`nav-link ${page === "home" ? "active" : ""}`}
            onClick={() => setPage("home")}
            type="button"
          >
            Home
          </button>
          <button
            className={`nav-link ${page === "create" ? "active" : ""}`}
            onClick={() => {
              if (status === "success" || result || file) {
                handleReset();
              } else {
                setPage("create");
              }
            }}
            type="button"
          >
            Create Material
          </button>
          <button
            className={`nav-link ${page === "history" ? "active" : ""}`}
            onClick={() => setPage("history")}
            type="button"
          >
            History
          </button>
        </nav>

        <div className="header-pill">
          <span className="status-dot" />
          AI learning transformation
        </div>
      </div>
    </header>
  );

  const renderHome = () => (
    <>
      {renderTopbar()}

      <main className="home-page">
        <section className="home-hero">
          <div className="home-hero-copy">
            <div className="hero-badge">
            </div>

            <h1>
              One lesson.
              <br />
              <span>Many variants.</span>
            </h1>

            <p>
              AdaptX transforms standard curriculum content into accessible,
              structured learning experiences for different learner needs.
            </p>

            <div className="home-actions">
              <button
                className="primary-button"
                onClick={() => setPage("create")}
                type="button"
              >
                Create a material <span>→</span>
              </button>

              <button
                className="secondary-button"
                onClick={() => setPage("history")}
                type="button"
              >
                View history
              </button>
            </div>

            <div className="hero-proof">
              <span>Mutli Variant Support </span>
              <span>•</span>
              <span>Source-aware transformations</span>
              <span>•</span>
              <span>Interactive Features</span>
            </div>
          </div>

          <div className="home-visual" aria-label="AdaptX transformation overview">
            <div className="visual-window">
              <div className="visual-window-bar">
                <span className="window-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span>AdaptX Workflow</span>
                <span className="window-status">LIVE</span>
              </div>

              <div className="visual-source">
                <span className="mini-label">SOURCE</span>
                <strong>Standard curriculum</strong>
                <p>
                  A single lesson enters AdaptX and becomes structured
                  learning support.
                </p>
              </div>

              <div className="visual-arrow">↓</div>

              <div className="visual-grid">
                <div className="visual-output visual-blue">
                  <span>01</span>
                  <strong>Visual</strong>
                  <small>Audio · Screen reader</small>
                </div>
                <div className="visual-output visual-purple">
                  <span>02</span>
                  <strong>Cognitive</strong>
                  <small>Chunks · Story · Practice</small>
                </div>
                <div className="visual-output visual-orange">
                  <span>03</span>
                  <strong>Hearing</strong>
                  <small>Visual lesson · Practice</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="home-section">
          <div className="section-intro">
            <div>
              <div className="eyebrow">WHAT ADAPTX COVERS</div>
              <h2>Designed around different ways of accessing a lesson.</h2>
            </div>
            <p>
              Teachers start with the curriculum they already use. AdaptX
              creates a focused learning experience without forcing every
              learner into the same format.
            </p>
          </div>

          <div className="support-grid">
            <button className="support-card" onClick={() => { setSupportMode("visual"); setPage("create"); }} type="button">
              <div className="support-index">01</div>
              <div className="support-icon">◉</div>
              <h3>Visual Accessibility</h3>
              <p>
                Screen-reader-ready structure, meaningful visual
                descriptions, accessible narration, and exportable material.
              </p>
              <span className="support-link">Explore support →</span>
            </button>

            <button className="support-card featured" onClick={() => { setSupportMode("cognitive"); setPage("create"); }} type="button">
              <div className="support-index">02</div>
              <div className="support-icon">✦</div>
              <h3>Cognitive &amp; Learning</h3>
              <p>
                Smaller learning chunks, simple explanations, examples,
                stories, mind maps, vocabulary and quick checks.
              </p>
              <span className="support-link">Explore support →</span>
            </button>

            <button className="support-card" onClick={() => { setSupportMode("hearing"); setPage("create"); }} type="button">
              <div className="support-index">03</div>
              <div className="support-icon">≈</div>
              <h3>Hearing Accessibility</h3>
              <p>
                Visual-first lessons, concept maps, visual vocabulary,
                presentation mode and structured practice.
              </p>
              <span className="support-link">Explore support →</span>
            </button>
          </div>
        </section>

        <section className="workflow-strip">
          <div className="workflow-heading">
            <div className="eyebrow">THE ADAPTX FLOW</div>
            <h2>From source to learning.</h2>
          </div>

          <div className="workflow-steps">
            <div><span>01</span><strong>Upload</strong><small>Existing curriculum</small></div>
            <div className="workflow-line" />
            <div><span>02</span><strong>Select</strong><small>Learning support</small></div>
            <div className="workflow-line" />
            <div><span>03</span><strong>Generate</strong><small>Adapted experience</small></div>
            <div className="workflow-line" />
            <div><span>04</span><strong>Review</strong><small>Teach &amp; export</small></div>
          </div>
        </section>
      </main>
    </>
  );

  const renderHistory = () => (
    <>
      {renderTopbar()}

      <main className="simple-page">
        <section className="simple-page-header">
          <div>
            <div className="eyebrow">YOUR MATERIALS</div>
            <h1>History</h1>
            <p>
              Reopen generated lessons from this browser. AdaptX stores only the
              generated lesson data locally, so no account or database is needed.
            </p>
          </div>
          <div className="history-header-actions">
            {historyItems.length > 0 && (
              <button className="text-button danger-text" onClick={clearHistory} type="button">
                Clear history
              </button>
            )}
            <button className="primary-button" onClick={() => setPage("create")} type="button">
              + Create material
            </button>
          </div>
        </section>

        {historyItems.length > 0 ? (
          <section className="history-list" aria-label="Generated lesson history">
            {historyItems.map((item) => {
              const label =
                item.supportMode === "cognitive"
                  ? "Cognitive & Learning"
                  : item.supportMode === "hearing"
                    ? "Hearing Accessibility"
                    : "Visual Accessibility";
              const dateLabel = item.createdAt
                ? new Date(item.createdAt).toLocaleString([], {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recently generated";

              return (
                <article className="history-card" key={item.id}>
                  <div className="history-card-main">
                    <div className="history-card-icon" aria-hidden="true">
                      {item.supportMode === "cognitive" ? "✦" : item.supportMode === "hearing" ? "≈" : "◉"}
                    </div>
                    <div className="history-card-copy">
                      <div className="history-card-topline">
                        <span>{label}</span>
                        <span>{dateLabel}</span>
                      </div>
                      <h2>{item.title}</h2>
                      <p>{item.fileName} · {item.fileType?.toUpperCase() || "DOCUMENT"}</p>
                    </div>
                  </div>
                  <div className="history-card-actions">
                    <button className="secondary-button" onClick={() => openHistoryItem(item)} type="button">
                      Open lesson →
                    </button>
                    <button className="history-delete-button" onClick={() => deleteHistoryItem(item.id)} type="button" aria-label={`Delete ${item.title} from history`}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="history-empty">
            <div className="history-empty-mark">⌁</div>
            <div>
              <div className="eyebrow">READY WHEN YOU ARE</div>
              <h2>No materials yet</h2>
              <p>
                Upload a curriculum document to create your first accessible
                lesson. Your generated materials will appear here automatically.
              </p>
              <button className="secondary-button" onClick={() => setPage("create")} type="button">
                Start with a document →
              </button>
            </div>
          </section>
        )}
      </main>
    </>
  );

  const renderCreate = () => (
    <>
      {renderTopbar()}

      <main className="create-page">
        <section className="create-header">
          <div>
            <div className="eyebrow">CREATE / ADAPT MATERIAL</div>
            <h1>Start with the curriculum.</h1>
            <p>
              Upload a PDF or TXT lesson. We will transform the content into
              accessible learning material while keeping the original source
              in view.
            </p>
          </div>

          <div className="create-meta">
            <span>PDF</span>
            <span>TXT</span>
            <span>10 MB max</span>
          </div>
        </section>

        <section className="create-layout">
          <div className="upload-card">
            <div
              className={`drop-zone ${file ? "has-file" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload curriculum document"
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={handleInputChange}
                hidden
              />

              {!file ? (
                <>
                  <div className="upload-icon">
                    <span>↑</span>
                  </div>
                  <h2>Upload your curriculum</h2>
                  <p>
                    Drag and drop your document here, or{" "}
                    <span className="browse-text">browse files</span>
                  </p>
                  <div className="file-types">
                    <span>PDF</span>
                    <span>TXT</span>
                    <span>MAX 10 MB</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="selected-icon">✓</div>
                  <h2>{file.name}</h2>
                  <p>
                    {(file.size / 1024 / 1024).toFixed(2)} MB · Ready to
                    transform
                  </p>
                  <span className="change-file">
                    Click to choose a different file
                  </span>
                </>
              )}
            </div>

            {error && (
              <div className="error-message" role="alert">
                <span>!</span>
                {error}
              </div>
            )}

            <div className="upload-next-step">
              <span className="upload-next-step-number">02</span>
              <div>
                <strong>Choose a learning support</strong>
                <p>
                  Select an experience below before generating your adapted
                  lesson.
                </p>
              </div>
            </div>

            <p className="privacy-note">
              Your document is processed to generate the learning output.
            </p>
          </div>

          <section className="support-selection">
            <div className="support-selection-header">
              <div>
                <div className="eyebrow">STEP 2 · CHOOSE SUPPORT</div>
                <h2>How should this lesson be experienced?</h2>
                <p>
                  Select the learning experience you want AdaptX to prepare.
                  The same curriculum can be transformed for different students.
                </p>
              </div>

              {supportMode && (
                <span className="selection-status">
                  Selected:{" "}
                  {supportMode === "visual"
                    ? "Visual Accessibility"
                    : supportMode === "cognitive"
                      ? "Cognitive & Learning"
                      : "Hearing Accessibility"}
                </span>
              )}
            </div>

            <div className="support-choice-grid">
              <button
                className={`support-choice-card ${supportMode === "visual" ? "selected" : ""}`}
                onClick={() => {
                  setSupportMode("visual");
                  setError("");
                }}
                type="button"
                aria-pressed={supportMode === "visual"}
              >
                <span className="choice-number">01</span>
                <span className="choice-icon">◉</span>
                <span className="choice-content">
                  <strong>Visual Accessibility</strong>
                  <span>
                    Screen-reader structure, visual descriptions and
                    accessible narration.
                  </span>
                </span>
                <span className="choice-arrow">
                  {supportMode === "visual" ? "✓" : "→"}
                </span>
              </button>

              <button
                className={`support-choice-card ${supportMode === "cognitive" ? "selected" : ""}`}
                onClick={() => {
                  setSupportMode("cognitive");
                  setError("");
                }}
                type="button"
                aria-pressed={supportMode === "cognitive"}
              >
                <span className="choice-number">02</span>
                <span className="choice-icon">✦</span>
                <span className="choice-content">
                  <strong>Cognitive &amp; Learning</strong>
                  <span>
                    Smaller chunks, examples, stories, mind maps and guided
                    practice.
                  </span>
                </span>
                <span className="choice-arrow">
                  {supportMode === "cognitive" ? "✓" : "→"}
                </span>
              </button>

              <button
                className={`support-choice-card ${supportMode === "hearing" ? "selected" : ""}`}
                onClick={() => {
                  setSupportMode("hearing");
                  setError("");
                }}
                type="button"
                aria-pressed={supportMode === "hearing"}
              >
                <span className="choice-number">03</span>
                <span className="choice-icon">≈</span>
                <span className="choice-content">
                  <strong>Hearing Accessibility</strong>
                  <span>
                    Transcripts, captions and visual alternatives for
                    audio-dependent information.
                  </span>
                </span>
                <span className="choice-arrow">
                  {supportMode === "hearing" ? "✓" : "→"}
                </span>
              </button>
            </div>

            <div className="support-selection-footer">
              <span>
                {supportMode
                  ? "Ready to generate this learning experience."
                  : "Choose one support experience to continue."}
              </span>
              <button
                className="primary-button support-generate-button"
                onClick={handleTransform}
                disabled={!file || !supportMode || status === "loading"}
                type="button"
              >
                {status === "loading" ? (
                  <>
                    <span className="spinner" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate with AdaptX <span>→</span>
                  </>
                )}
              </button>
            </div>
          </section>

          <aside className="create-side">
            <div className="side-panel">
              <div className="eyebrow">WHAT HAPPENS NEXT</div>
              <div className="side-step">
                <span>01</span>
                <div>
                  <strong>Upload</strong>
                  <p>Start with the material your teacher already uses.</p>
                </div>
              </div>
              <div className="side-step">
                <span>02</span>
                <div>
                  <strong>Choose support</strong>
                  <p>Select the accessibility experience you want to create.</p>
                </div>
              </div>
              <div className="side-step">
                <span>03</span>
                <div>
                  <strong>Review &amp; teach</strong>
                  <p>Compare the source and adapted lesson before using it.</p>
                </div>
              </div>
            </div>

            <div className="side-note">
              <span>✦</span>
              <p>
                <strong>Source-aware by design.</strong> AdaptX is built to
                restructure curriculum content rather than replace its facts.
              </p>
            </div>
          </aside>
        </section>

        <section className="feature-row">
          <div>
            <span className="feature-number">01</span>
            <strong>Upload</strong>
            <p>Start with your existing curriculum.</p>
          </div>
          <div>
            <span className="feature-number">02</span>
            <strong>Transform</strong>
            <p>Adapt content for the selected support.</p>
          </div>
          <div>
            <span className="feature-number">03</span>
            <strong>Understand</strong>
            <p>Get clear, accessible learning content.</p>
          </div>
        </section>
      </main>

      {status === "loading" && (
        <div className="loading-overlay">
          <div className="loading-panel">
            <div className="loading-spinner" />
            <div className="eyebrow">ADAPTX AI</div>
            <h2>Transforming your content</h2>
            <p>
              We're analyzing your curriculum and preparing the selected
              accessible learning experience.
            </p>
            <div className="loading-bar">
              <div />
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (page === "history") {
    return <div className="app">{renderHistory()}</div>;
  }

  if (page === "create") {
    return <div className="app">{renderCreate()}</div>;
  }

  return <div className="app">{renderHome()}</div>;
}

export default App;
