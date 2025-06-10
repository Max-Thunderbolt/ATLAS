from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ollama

app = FastAPI()

# Configure CORS to allow your frontend to communicate with the backend
# For development, you can allow all origins. In production, restrict this to your frontend's URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

class PromptRequest(BaseModel):
    prompt: str

@app.post("/chat")
async def chat_with_gemma(request: PromptRequest):
    try:
        # Assuming Ollama is running on the default host and port (http://localhost:11434)
        response = ollama.chat(model='gemma2:2b', messages=[{'role': 'user', 'content': request.prompt}])
        return {"response": response['message']['content']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)