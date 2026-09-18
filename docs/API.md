# AdaptX API Contract

## Base URL

http://localhost:5000/api

---

# POST /summarize

Summarizes an uploaded educational document.

## Request

Method:

POST

Content-Type:

multipart/form-data

Field:

file

Supported files:

- PDF
- TXT

Example frontend:

```js
const formData = new FormData();
formData.append("file", selectedFile);

fetch("http://localhost:5000/api/summarize", {
  method: "POST",
  body: formData
});