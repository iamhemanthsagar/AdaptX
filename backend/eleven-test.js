require("dotenv").config();

async function testElevenLabs() {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is missing.");
    }

    if (!process.env.ELEVENLABS_VOICE_ID) {
      throw new Error("ELEVENLABS_VOICE_ID is missing.");
    }

    console.log("Testing ElevenLabs...");
    console.log(
      "Voice ID:",
      process.env.ELEVENLABS_VOICE_ID
    );

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "Welcome to AdaptX. This is an accessible learning experience.",
          model_id: "eleven_multilingual_v2",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("ElevenLabs returned an error:");
      console.error(errorText);

      process.exit(1);
    }

    const audioBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    const fs = require("fs");

    fs.writeFileSync(
      "eleven-test.mp3",
      audioBuffer
    );

    console.log("SUCCESS!");
    console.log(
      `Created eleven-test.mp3 (${audioBuffer.length} bytes)`
    );
  } catch (error) {
    console.error("TEST FAILED:");
    console.error(error.message);
    process.exit(1);
  }
}

testElevenLabs();