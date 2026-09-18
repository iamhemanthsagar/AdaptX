import { useState } from "react";

function App() {
  const [backendStatus, setBackendStatus] = useState("Not connected");

  async function checkBackend() {
    try {
      const response = await fetch("http://localhost:5000/api/health");

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();

      if (data.status === "ok") {
        setBackendStatus("Backend connected");
      }
    } catch (error) {
      console.error(error);
      setBackendStatus("Backend connection failed");
    }
  }

  return (
    <div>
      <h1>AdaptX</h1>

      <p>
        Accessible Content Transformer
      </p>

      <button onClick={checkBackend}>
        Test Backend Connection
      </button>

      <p>{backendStatus}</p>
    </div>
  );
}

export default App;