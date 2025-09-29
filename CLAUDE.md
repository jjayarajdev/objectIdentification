**Project Title:**
📸 *Image Object Detection + EXIF Metadata + Cost Estimation Web App (Single & Batch Upload)*

---

## 1. Objective

To build a **web application** that:

* Allows users to upload **single images** or an **entire folder of images**
* Performs **object detection** using GPT‑4o vision
* Extracts and displays **EXIF metadata** for each image
* Displays bounding boxes on the images
* Estimates **token usage** and **cost per image** and for the **whole batch**
* Supports **downloadable outputs** in JSON, COCO, YOLO, and CSV

---

## 2. System Components

### 2.1 Frontend (Client Side)

| Component           | Description                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| Image Upload UI     | Drag‑and‑drop/file picker for single images; folder picker for batch mode   |
| Gallery Viewer ✅    | Shows thumbnails of all uploaded images with navigation arrows              |
| Image Viewer        | Displays selected image + bounding boxes                                    |
| Object List         | Lists detected objects per image                                            |
| Token/Cost Panel    | Shows token usage and cost per image & total batch cost                     |
| EXIF Metadata Panel | Displays metadata per image                                                 |
| Export Options      | Download detection + metadata results in multiple formats (batch or single) |

**Frontend Stack Options:** React.js + TailwindCSS recommended

---

### 2.2 Backend (API Server)

| Endpoint                   | Description                                                                                   |      |      |                                                |
| -------------------------- | --------------------------------------------------------------------------------------------- | ---- | ---- | ---------------------------------------------- |
| `POST /upload`             | Accepts single image upload                                                                   |      |      |                                                |
| `POST /upload-folder` ✅    | Accepts zipped folder or multi-image upload, processes all images sequentially or in parallel |      |      |                                                |
| `GET /results`             | Returns detection results per image or combined                                               |      |      |                                                |
| `GET /exif`                | Returns EXIF metadata per image or combined                                                   |      |      |                                                |
| `GET /estimate-tokens`     | Returns token usage per image or batch                                                        |      |      |                                                |
| `GET /estimate-cost`       | Returns cost estimation per image or batch                                                    |      |      |                                                |
| `GET /download?format=json | yolo                                                                                          | coco | csv` | Download labeled results per image or combined |

**Backend Stack Options:** Python (FastAPI) or Node.js (Express)

---

### 2.3 GPT‑4o Integration

| Element         | Description                                   |
| --------------- | --------------------------------------------- |
| Model           | GPT‑4o Vision                                 |
| Input           | Image(s) + prompt                             |
| Output          | Labeled objects with bounding boxes per image |
| Token Logging   | Use OpenAI `.usage` metadata per image        |
| Cost Estimation | Per image + aggregated for batch              |

---

## 3. Functional Requirements

| ID  | Requirement                                   | Priority |
| --- | --------------------------------------------- | -------- |
| FR1 | Upload **single** JPEG/PNG images             | High     |
| FR2 | Upload **folder** (multiple images at once) ✅ | High     |
| FR3 | Detect objects + bounding boxes per image     | High     |
| FR4 | Show labeled overlay per image                | High     |
| FR5 | Export detection results (batch or single)    | Medium   |
| FR6 | Estimate token usage per image & total        | High     |
| FR7 | Estimate cost per image & total               | High     |
| FR8 | Extract and display EXIF metadata per image   | High     |
| FR9 | Download EXIF + detection results combined    | Medium   |

---

## 4. Non‑Functional Requirements

| Category       | Description                                           |
| -------------- | ----------------------------------------------------- |
| Performance    | Detection + EXIF extraction under 10s per image       |
| Batch Handling | Parallelize image requests (configurable concurrency) |
| Security       | File size/type restrictions (reject >20MB/image)      |
| UX             | Clean gallery UI to switch between images easily      |

---

## 5. Token & Cost Estimation

| Type          | Rate (per 1K tokens)    | Formula                          |
| ------------- | ----------------------- | -------------------------------- |
| Input         | $0.0025                 | `(input_tokens / 1000) * 0.0025` |
| Output        | $0.01                   | `(output_tokens / 1000) * 0.01`  |
| Total (Batch) | Sum of all images’ cost |                                  |

**Example:**

* 10 images × (200 input tokens + 400 output tokens) = ~6,000 tokens
* Cost = input + output combined

---

## 6. EXIF Metadata Handling

Extract EXIF metadata per image & aggregate for batch download:

### API Response Example (Batch)

```json
{
  "images": [
    {
      "filename": "image1.jpg",
      "objects": [...],
      "exif": {...},
      "token_estimate": {...},
      "cost_estimate": 0.00625
    },
    {
      "filename": "image2.jpg",
      "objects": [...],
      "exif": {...},
      "token_estimate": {...},
      "cost_estimate": 0.0071
    }
  ],
  "total_cost_estimate": 0.065
}
```

---

## 7. Export Options

| Format    | Description                            |
| --------- | -------------------------------------- |
| JSON      | All images’ detection + EXIF metadata  |
| YOLO TXT  | One file per image or combined         |
| COCO JSON | Multi-image COCO format                |
| CSV       | Flat list of all objects across images |

---

## 8. Tech Stack

| Layer           | Tools                                           |
| --------------- | ----------------------------------------------- |
| Frontend        | React.js + TailwindCSS                          |
| Backend         | Python + FastAPI                                |
| GPT API         | OpenAI GPT-4o Vision                            |
| EXIF Parser     | Python `Pillow` + `ExifRead` (loop over images) |
| Hosting         | Vercel (UI) + AWS Lambda/EC2 (API)              |
| Auth (optional) | Firebase or Auth0                               |

---

## 9. Timeline (Revised)

| Phase                             | Duration |
| --------------------------------- | -------- |
| UI + Upload (single & folder)     | Week 1–2 |
| GPT Integration                   | Week 2–3 |
| Token/Cost/Bounding Boxes         | Week 3–4 |
| EXIF Metadata (per image + batch) | Week 4   |
| Export + Testing                  | Week 5   |
| Deployment + Docs                 | Week 6   |

---

Would you like me to draw a **simple architecture diagram** (frontend ↔ backend ↔ GPT‑4o + EXIF extraction) for this final version? (It will help your developers visualise the flow).
