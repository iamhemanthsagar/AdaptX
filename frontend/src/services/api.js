const API_BASE_URL = "http://localhost:5000/api";

export async function summarizeFile(file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/summarize`, {
    method: "POST",
    body: formData,
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error?.message || "Failed to transform the document."
    );
  }

  return result.data;
}