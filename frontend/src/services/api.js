const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function summarizeFile(file, supportMode = "visual") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("supportMode", supportMode);

  const response = await fetch(`${API_BASE_URL}/summarize`, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.error?.message || "Failed to summarize file."
    );
  }

  return result.data;
}

export async function generateAudio(text) {
  const response = await fetch(`${API_BASE_URL}/audio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
    }),
  });

  if (!response.ok) {
    let message = "Failed to generate audio.";

    try {
      const result = await response.json();
      message = result.error?.message || message;
    } catch {
      // Keep the default error message if the response is not JSON.
    }

    throw new Error(message);
  }

  const audioBlob = await response.blob();

  return URL.createObjectURL(audioBlob);
}

// ============================================================
// FULL ACCESSIBLE LESSON AUDIO
// ============================================================

export async function generateFullAudio(lessonData) {
  const response = await fetch(`${API_BASE_URL}/audio/full`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(lessonData),
  });

  if (!response.ok) {
    let message = "Failed to generate full lesson audio.";

    try {
      const result = await response.json();
      message = result.error?.message || message;
    } catch {
      // Keep the default error message if the response is not JSON.
    }

    throw new Error(message);
  }

  const audioBlob = await response.blob();

  return URL.createObjectURL(audioBlob);
}

// ============================================================
// EXPORT REFINED LESSON AS PDF
// ============================================================

export async function exportPdf(lessonData) {
  const response = await fetch(`${API_BASE_URL}/export-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(lessonData),
  });

  if (!response.ok) {
    let message = "Failed to export PDF.";

    try {
      const result = await response.json();
      message = result.error?.message || message;
    } catch {
      // Keep the default error message if the response is not JSON.
    }

    throw new Error(message);
  }

  const pdfBlob = await response.blob();

  return URL.createObjectURL(pdfBlob);
}
// ============================================================
// YOUTUBE VISUAL COMPANION
// ============================================================

export async function analyzeYouTubeVideo(url) {
  const response = await fetch(`${API_BASE_URL}/youtube/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.error?.message || "Failed to analyze YouTube video."
    );
  }

  return result.data;
}