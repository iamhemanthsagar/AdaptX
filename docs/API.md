# AdaptX API Contract

## Base URL

http://localhost:5000/api

---

# POST /summarize

Transforms an uploaded educational document into accessible learning content.

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

Maximum file size:

10 MB

Example frontend:

```js
const formData = new FormData();

formData.append("file", selectedFile);

fetch("http://localhost:5000/api/summarize", {
  method: "POST",
  body: formData
});