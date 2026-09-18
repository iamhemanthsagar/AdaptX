import { useRef, useState } from "react";
import { summarizeFile } from "./services/api";
import "./App.css";

function App() {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFile = (selectedFile) => {
    setError("");
    setResult(null);

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

    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const data = await summarizeFile(file);

      setResult(data);
      setStatus("success");
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError("");
    setStatus("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileTypeLabel = (fileType) => {
    return fileType === "pdf" ? "PDF" : "TXT";
  };

  if (status === "success" && result) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">A</div>
            <span>AdaptX</span>
          </div>

          <button className="text-button" onClick={handleReset}>
            ← New document
          </button>
        </header>

        <main className="results-page">
          <div className="results-header">
            <div>
              <div className="eyebrow">TRANSFORMED CURRICULUM</div>

              <h1>{result.title}</h1>

              <p className="results-subtitle">
                AI-generated learning support based on your uploaded document.
              </p>
            </div>

            <div className="source-badge">
              <span className="file-icon">▱</span>
              <div>
                <strong>{result.source.fileName}</strong>
                <span>{getFileTypeLabel(result.source.fileType)} document</span>
              </div>
            </div>
          </div>

          <section className="summary-card">
            <div className="card-label">
              <span className="label-dot" />
              AI-GENERATED SUMMARY
            </div>

            <p>{result.summary}</p>
          </section>

          <section className="key-points-section">
            <div className="section-heading">
              <div>
                <div className="eyebrow">CORE CONCEPTS</div>
                <h2>Key points</h2>
              </div>

              <span className="points-count">
                {result.keyPoints.length} concepts
              </span>
            </div>

            <div className="points-grid">
              {result.keyPoints.map((point, index) => (
                <article className="point-card" key={`${point}-${index}`}>
                  <span className="point-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <p>{point}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="next-step-card">
            <div>
              <div className="eyebrow">ADAPTX</div>
              <h3>Ready for another document?</h3>
              <p>
                Transform another piece of curriculum into accessible
                learning content.
              </p>
            </div>

            <button className="primary-button" onClick={handleReset}>
              Transform another
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <span>AdaptX</span>
        </div>

        <div className="header-pill">
          <span className="status-dot" />
          AI learning transformation
        </div>
      </header>

      <main className="hero">
        <section className="hero-copy">
          <div className="hero-badge">
            <span>✦</span>
            ACCESSIBLE LEARNING
          </div>

          <h1>
            Make every lesson
            <br />
            <span>easier to access.</span>
          </h1>

          <p>
            Upload standard curriculum content and transform it into clear,
            student-friendly learning material with AI.
          </p>
        </section>

        <section className="upload-card">
          <div
            className={`drop-zone ${file ? "has-file" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
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

          <button
            className="primary-button transform-button"
            onClick={handleTransform}
            disabled={!file || status === "loading"}
          >
            {status === "loading" ? (
              <>
                <span className="spinner" />
                Transforming...
              </>
            ) : (
              <>
                Transform content
                <span>→</span>
              </>
            )}
          </button>

          <p className="privacy-note">
            Your document is processed to generate the learning output.
          </p>
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
            <p>AI identifies the important ideas.</p>
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
              We're analyzing your curriculum and preparing a clearer
              learning version.
            </p>

            <div className="loading-bar">
              <div />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;