from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
load_dotenv()

from RAG.llm_provider import get_embedding_model

embedding_model = None
async def startup_event():
    global embedding_model
    embedding_model = await get_embedding_model()

themes_eng = {
    "Gestion du cycle de vie du système": "System Lifecycle",
    "Gestion du cycle de vie de la donnée": "Data lifecycle",
    "Audit trail": "Audit Trail",
    "Rôles et responsabilités de l'administrateur": "Security and access control",
    "Sécurite & Contrôle d'accès des utilisateurs": "Security and access control",
    "Horodatage": None
}

def retrieve_relevant_context(vectordb_path, collection_name,query,llm, top_k=3,theme=None):

    retrieved_items = []  # List of {source, context} dicts
    translated_query = f"Translate this to English, keeping it concise and clear:\n{query}"
    retrieval_query_en = llm.invoke(translated_query).content
    print("RETRIEVAL QUERY EN:", retrieval_query_en)
    vector_store = Chroma(
    collection_name=collection_name, 
    embedding_function=embedding_model,
    persist_directory=vectordb_path
    )
    
    if theme is not None:
        filter = {"Theme": theme}
    else:
        filter = None

    results = vector_store.similarity_search_with_score(
    query=retrieval_query_en,
    k=top_k,
    filter=filter
    )

    threshold = 1.5
    filtered_results = [doc for doc, score in results if score <= threshold]

    if collection_name =="AP_collection":
        for doc in filtered_results:
                source_text = f"{doc.metadata.get('Source', 'N/A')} - Section: {doc.metadata.get('Section', 'N/A')} - Sub-section: {doc.metadata.get('subsection', 'N/A')} - Page: {doc.metadata.get('Page', 'N/A')}"
                retrieved_items.append({
                    "source": source_text,
                    "context": doc.page_content
                })
    else:
        for doc in filtered_results:
                source_text = f"{doc.metadata.get('Title', 'N/A')} - Page: {doc.metadata.get('Page', 'N/A')}"
                retrieved_items.append({
                    "source": source_text,
                    "context": doc.page_content
                })

    return retrieved_items