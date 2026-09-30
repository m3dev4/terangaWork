import os
from functools import lru_cache
from huggingface_hub import AsyncInferenceClient
from dotenv import load_dotenv

load_dotenv()

@lru_cache(maxsize=1)
def get_hf_client():
    return AsyncInferenceClient(
        api_key=os.getenv("HF_TOKEN")
    )

