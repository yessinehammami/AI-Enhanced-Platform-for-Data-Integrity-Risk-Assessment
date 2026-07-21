import os 
import re
import pandas as pd 
from pathlib import Path
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from llm_provider import get_embedding_model


CHROMA_DIR = str((Path(__file__).resolve().parent / "chroma_langchain_db"))

embedding_model = None
async def startup_event():
    global embedding_model
    embedding_model = await get_embedding_model()

kb_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Annex files/Knowledge_base.xlsx"))
kb = pd.read_excel(kb_path)
requirements = kb["Requirement body"].astype(str).tolist()
metadatas = kb.drop(columns=["Requirement body"]).to_dict(orient="records")

vector_store = Chroma.from_texts(
    texts=requirements,
    metadatas=metadatas,
    collection_name="AP_collection",
    embedding=embedding_model,
    persist_directory=CHROMA_DIR,
)

def clean_text(text):
    text = re.sub(r'\s+\d+\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'(?<=[a-zA-Z])\s+\d+\s+(?=[a-zA-Z])', ' ', text)
    text = re.sub(r' +', ' ', text)
    
    return text.strip()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""]
)
all_chunks=[]

folder = Path("../../../Annex files/Reglementation")
for document in folder.iterdir():
    loader= PyPDFLoader(document)
    loaded_document=loader.load()
    for page in loaded_document:
        page.page_content = clean_text(page.page_content)
        page.metadata["title"] = str(document)[41:-4]
    chunks = text_splitter.split_documents(loaded_document)
    all_chunks.extend(chunks)


texts2 = [all_chunks[i].page_content for i in range(len(all_chunks))]

metadatas2 = [ {"Title": all_chunks[i].metadata["title"],
                "Page": all_chunks[i].metadata["page_label"]} for i in range(len(all_chunks))]

vector_store = Chroma.from_texts(
    texts=texts2,
    metadatas=metadatas2,
    collection_name="conv_collection",
    embedding=embedding_model,
    persist_directory=CHROMA_DIR,
)