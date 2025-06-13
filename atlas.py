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

def getSystemPrompt():
    ## Pull all text from personality.txt
    with open('personality.txt', 'r', encoding='utf-8') as file:
        return file.read()

class PromptRequest(BaseModel):
    prompt: str
    system_prompt: str = getSystemPrompt()

@app.post("/chat")
async def chat_with_gemma(request: PromptRequest):
    print("Received request: ", request.prompt)
    try:
        # Assuming Ollama is running on the default host and port (http://localhost:11434)
        messages = [
            {'role': 'system', 'content': request.system_prompt},
            {'role': 'user', 'content': request.prompt}
        ]
        response = ollama.chat(model='gemma2:2b', messages=messages)
        if (response.message == None):
            print("no response")
            return {"response": "I'm sorry, I'm having trouble understanding you. Please try again."}
        return {"response": response['message']['content']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)