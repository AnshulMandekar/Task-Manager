import os
import io
import json
import re
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import google.generativeai as genai

load_dotenv()

app = FastAPI(title="Task Classifier LLM Service", version="1.0.0")

# CORS — allow the Express backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

MODEL_NAME = 'gemini-3.5-flash'
gemini_model = genai.GenerativeModel(MODEL_NAME)

SYSTEM_PROMPT = """You are a task classification assistant. Given the user's input (text or image of a task/assignment), extract the following fields:

1. title — a short, clear task title (max 100 chars)
2. description — optional longer description of the task (max 500 chars, or empty string if not applicable)
3. category — exactly one of: "College", "Job", "Study"
4. dueDate — ISO 8601 date string (e.g., "2026-08-20T23:59:00") if a due date is mentioned or can be inferred. Use null if no date is mentioned. Today's date is {today}.

Classification rules:
- "College": coursework, assignments, exams, class projects, campus activities, university-related tasks, homework, lab reports, lectures
- "Job": work tasks, office work, interviews, job applications, professional deadlines, meetings with employers, freelance projects, work emails
- "Study": self-study, reading books, online courses, certifications, practice problems, skill-building, tutorials, research for personal knowledge

If the input is ambiguous, make your best guess based on context clues.
If the input contains multiple tasks, extract only the most prominent/first one.

Respond ONLY with valid JSON in this exact format, no explanation, no markdown:
{{"title": "...", "description": "...", "category": "...", "dueDate": "..." or null}}"""


def parse_llm_response(text: str) -> dict:
    """Parse the LLM response, handling potential formatting issues."""
    text = text.strip()

    # Remove markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON from the text
        json_match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            raise ValueError(f"Could not parse LLM response as JSON: {text}")

    # Validate and normalize
    title = str(result.get("title", "Untitled Task"))[:200]
    description = str(result.get("description", ""))[:1000]
    category = str(result.get("category", "Study"))

    # Ensure category is valid
    if category not in ("College", "Job", "Study"):
        # Try case-insensitive matching
        category_lower = category.lower()
        if "college" in category_lower or "university" in category_lower:
            category = "College"
        elif "job" in category_lower or "work" in category_lower:
            category = "Job"
        else:
            category = "Study"

    due_date = result.get("dueDate")
    if due_date and due_date != "null":
        # Validate it's a parseable date
        try:
            datetime.fromisoformat(str(due_date).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            due_date = None
    else:
        due_date = None

    return {
        "title": title,
        "description": description,
        "category": category,
        "dueDate": due_date,
    }


@app.get("/")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/classify")
async def classify(
    text: str = Form(None),
    image: UploadFile = File(None),
):
    """
    Classify a task from text and/or image input.
    Accepts either:
      - JSON body with {"text": "..."} (Content-Type: application/json)
      - Multipart form with text and/or image fields
    """
    if not text and not image:
        raise HTTPException(
            status_code=400,
            detail="Provide 'text' and/or 'image' to classify.",
        )

    today = datetime.now().strftime("%Y-%m-%d (%A)")
    prompt = SYSTEM_PROMPT.format(today=today)

    contents = [prompt]

    if text:
        contents.append(f"\nUser input:\n{text}")

    if image:
        # Read and convert image
        image_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(image_bytes))
        # Convert to RGB if necessary (e.g., RGBA PNGs)
        if pil_image.mode not in ("RGB", "L"):
            pil_image = pil_image.convert("RGB")
        contents.append(pil_image)
        if not text:
            contents.append(
                "\nThe above image contains a task or assignment. Extract and classify it."
            )

    try:
        response = gemini_model.generate_content(contents)
        result = parse_llm_response(response.text)
        return result
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse LLM response: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM classification failed: {str(e)}",
        )


@app.post("/classify-json")
async def classify_json(body: dict):
    """Alternative endpoint that accepts JSON body with text field."""
    text = body.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="Provide 'text' to classify.")

    today = datetime.now().strftime("%Y-%m-%d (%A)")
    prompt = SYSTEM_PROMPT.format(today=today)

    try:
        response = gemini_model.generate_content([prompt, f"\nUser input:\n{text}"])
        result = parse_llm_response(response.text)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM classification failed: {str(e)}",
        )
