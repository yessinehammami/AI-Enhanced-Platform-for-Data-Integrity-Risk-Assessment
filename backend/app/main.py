import dotenv
from pathlib import Path
import datetime
from typing import Optional

from fastapi import  FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from sqlalchemy.orm import Session
from sqlalchemy import func, case
from db.db import get_db
from db.models import Site, System, Checklist, Checklist_english, Answers, SystemSite, Capa
from schemas import LocalSystems, LLMRequest, ManualDataEntry, category_description_dict, detectability_dict, occurrence_dict, criticality_dict

from RAG.llm_provider import get_llm
from RAG.prompt_template import Action_plan_template, chat_prompt
from RAG.retrieval import retrieve_relevant_context, themes_eng

dotenv.load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LLM at startup instead of module level
VECTORDB_PATH = str(Path(__file__).resolve().parent / "RAG" / "chroma_langchain_db")

llm = None

async def initialize_llm_safe():
    """Initialize LLM with error handling - doesn't block startup"""
    global llm
    try:
        llm = await get_llm()
        print("✓ LLM initialized successfully at startup")
    except Exception as e:
        print(f"⚠ LLM initialization failed at startup: {e}")
        print("  LLM will be initialized on first request")

@app.on_event("startup")
async def startup_event():
    """Non-blocking startup that doesn't require LLM to be available"""
    await initialize_llm_safe()

async def ensure_llm_initialized():
    """Ensure LLM is initialized before use, with on-demand initialization if needed"""
    global llm
    if llm is None:
        print("Initializing LLM on first request...")
        await initialize_llm_safe()
    if llm is None:
        raise HTTPException(
            status_code=503,
            detail="LLM service is currently unavailable. Please try again later."
        )
    return llm

@app.get("/api/get_sites/")
def get_sites(db: Session = Depends(get_db)):
    sites = db.query(Site).all()
    return [{"id": s.id, "nom_du_site": s.name} for s in sites]

@app.get("/api/get_central_systems/")
def get_systems(db: Session = Depends(get_db)):
    systems = db.query(System).filter_by(local=False).all()
    return [{"id": s.id, "name": s.name} for s in systems]

@app.get("/api/get_systems_by_site/")
def get_systems_by_site(site_id: int, db: Session = Depends(get_db)):
    links = db.query(SystemSite).filter_by(site_id=site_id).all()
    systems = []
    for link in links:
        system_info = db.query(System).filter_by(id=link.system_id).first()
        if system_info:
            systems.append({"id": system_info.id, "name": system_info.name, "critical": link.critical, "local": system_info.local,"sys_user": link.sys_user})
    return systems

@app.delete("/api/delete_system/{site_id}/{system_id}")
def delete_system(site_id: int, system_id: int, db: Session = Depends(get_db)):
    system = db.query(System).filter_by(id=system_id).first()
    if system.local:
        db.delete(system)
    else:
        link = db.query(SystemSite).filter_by(site_id=site_id, system_id=system_id).first()
        db.delete(link)

    db.commit()
    return {"detail": f"System with id '{system_id}' deleted successfully"}

#Create System
@app.post("/api/add_local_system/")
def create_system(link: LocalSystems, db: Session = Depends(get_db)):
    n = len(link.systems_names)

    for i in range(n):
        name = link.systems_names[i]
        description = link.systems_descriptions[i]
        category = link.systems_categories[i]
        sector = link.systems_sectors[i]
        owner = link.systems_owners[i]
        user = link.systems_users[i]
        critical = link.criticalities[i]
        admin = link.systems_admins[i]
        admin_backup = link.systems_admin_backups[i]
        access_manager = link.systems_access_managers[i]

        # Check if system exists
        existing_system = db.query(System).filter_by(name=name).first()
        if existing_system:
            existing_link = db.query(SystemSite).filter_by(site_id=link.site_id, system_id=existing_system.id).first()
            if not existing_link:
                new_link = SystemSite(
                    site_id=link.site_id,
                    system_id=existing_system.id,
                    sector=sector,
                    critical=critical,
                    sys_owner=owner,
                    sys_user=user,
                    admin=admin,
                    admin_backup=admin_backup,
                    access_manager=access_manager
                )
                db.add(new_link)
            else:
                raise HTTPException(status_code=400, detail=f"Le système '{name}' est déjà lié au site '{link.site_id}'.")
        else:
            new_system = System(
                name=name,
                description=description,
                category=category,
                local=True
            )
            db.add(new_system)
            db.flush()  # get new_system.id
            new_link = SystemSite(
                site_id=link.site_id,
                system_id=new_system.id,
                sector=sector,
                critical=critical,
                sys_owner=owner,
                sys_user=user,
                admin=admin,
                admin_backup=admin_backup,
                access_manager=access_manager
            )
            db.add(new_link)
    db.commit()
    return {"detail": "Systems linked successfully"}

##Save manual data entry for a system

@app.get("/api/get_checklist_by_system_category/")
def get_checklist_by_system_category(system_name: str, language: str = "fr", db: Session = Depends(get_db)):
    system_record = db.query(System).filter_by(name=system_name).first()
    category_to_find = str(system_record.category)
    
    if language.lower() == "en":
        # Get English version with fallback to French if not translated
        # Search for category number within the comma-separated string using LIKE
        checklist_items = (db.query(Checklist.id,
                                   func.coalesce(Checklist_english.question, Checklist.question).label("question"),
                                   func.coalesce(Checklist_english.theme, Checklist.theme).label("theme"),
                                   func.coalesce(Checklist_english.sub_theme, Checklist.sub_theme).label("sub_theme"),
                                   func.coalesce(Checklist_english.acceptance_criteria, Checklist.acceptance_criteria).label("acceptance_criteria"))
                          .outerjoin(Checklist_english, Checklist.id == Checklist_english.id)
                          .filter(Checklist.category.like(f"%{category_to_find}%"))
                          .all())
    else:
        # Get French version (default)
        checklist_items = (db.query(Checklist.id, Checklist.question, Checklist.theme, Checklist.sub_theme, Checklist.acceptance_criteria)
                          .filter(Checklist.category.like(f"%{category_to_find}%"))
                          .all())
    
    return [{"ID": item.id,
            "Question": item.question,
            "Theme": item.theme,
            "Sub-theme": item.sub_theme,
            "Acceptance Criteria": item.acceptance_criteria} for item in checklist_items]
            
@app.post("/api/manual_data_entry/")
def manual_data_entry(data: ManualDataEntry, db: Session = Depends(get_db)):
    try:
        system_site = db.query(SystemSite).filter_by(site_id=data.site_id, system_id=data.system_id).first()

        system_site_id = system_site.id
        for question_id, conformity, gap, effect, detectability, occurrence in zip(data.question_id, data.conformity_to_criteria, data.gap_description, data.effect, data.detectability, data.occurrence):
            new_response = Answers(
                system_site_id=system_site_id,
                question_id=question_id,
                conformity_to_criteria=conformity,
                gap_description=gap,
                effect=effect,
                detectability=detectability,
                occurrence=occurrence,
                is_current=True
            )
            existing_response = db.query(Answers).filter_by(system_site_id=system_site_id, question_id=question_id).first()
            if existing_response:
                existing_response.is_current = False
                db.merge(existing_response)
            db.add(new_response)
        db.commit()
        return {"detail": "Responses saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving responses: {str(e)}")

##APIS for visualization dashboard###

@app.get("/api/get_global_info/")
def get_global_info(db: Session = Depends(get_db)):
    total_sites = db.query(Site).count()
    total_systems = db.query(System).count()
    count_by_locality = db.query(System.local, func.count(System.id)).group_by(System.local).all()
    count_by_criticity = db.query(SystemSite.critical, func.count(SystemSite.id)).join(System, SystemSite.system_id == System.id).filter(System.local == True).group_by(SystemSite.critical).all()
    
    count_by_category = db.query(System.category, func.count(System.id)).group_by(System.category).all()
    count_systems_by_site = db.query(Site.name, func.count(SystemSite.system_id)).join(SystemSite, Site.id == SystemSite.site_id).group_by(Site.id).all()
    count_analyzed_local_systems= (db.query(SystemSite)
                                    .join(Answers, SystemSite.id == Answers.system_site_id)
                                    .join(System, SystemSite.system_id == System.id)
                                    .filter(Answers.is_current == True,System.local == True)
                                    .distinct(SystemSite.id).count())
    global_conformity_rate =(db.query(func.sum(case((Answers.conformity_to_criteria == True, 1), else_=0)) / func.nullif(func.count(Answers.conformity_to_criteria), 0) * 100)
                                .join(SystemSite, Answers.system_site_id == SystemSite.id)
                                .filter(Answers.is_current == True).scalar())
    conformity_rate_by_site = (db.query(Site.name, (func.sum(case((Answers.conformity_to_criteria == True, 1), else_=0)) / func.nullif(func.count(Answers.conformity_to_criteria), 0)) * 100)
                                .join(SystemSite, Site.id == SystemSite.site_id)
                                .join(Answers, SystemSite.id == Answers.system_site_id)
                                .filter(Answers.is_current == True)
                                .group_by(Site.id)).all()
    questions_by_gap_count = (db.query(Checklist.id,Checklist.theme, Checklist.sub_theme, func.count(Answers.id).label("gap_count"))
                                .join(Answers, Checklist.id == Answers.question_id)
                                .filter(Answers.is_current == True, Answers.conformity_to_criteria == False)
                                .group_by(Checklist.id)
                                .order_by(func.count(Answers.id).desc())
                                .all())
    return {
        "total_sites": total_sites,
        "total_systems": total_systems,
        "count_by_locality": [{"local": local, "count": count} for local, count in count_by_locality],
        "count_by_criticity": [{"critical": critical, "count": count} for critical, count in count_by_criticity],
        "count_systems_by_site": [{"site": site, "count": count} for site, count in count_systems_by_site],
        "count_by_category": [{"category": category, "count": count} for category, count in count_by_category],
        "count_analyzed_local_systems": count_analyzed_local_systems,
        "conformity_rate_by_site": [{"site": site, "conformity_rate": rate} for site, rate in conformity_rate_by_site],
        "global_conformity_rate": global_conformity_rate,
        "questions_by_gap_count": [{"question_id": q.id, "theme": q.theme, "sub_theme": q.sub_theme, "gap_count": q.gap_count} for q in questions_by_gap_count]
    }

@app.get("/api/get_site_info/")
def get_system_count(site_id : int, language: str = "fr", db: Session = Depends(get_db)):
    all_count = (db.query(SystemSite)
                    .filter(SystemSite.site_id == site_id)
                    .count())
    
    local_count = (db.query(System)
                    .join(SystemSite, System.id == SystemSite.system_id)
                    .filter(SystemSite.site_id == site_id, System.local == True)
                    .count())

    critical_count = (db.query(SystemSite)
                        .join(System, SystemSite.system_id == System.id)
                        .filter(System.local == True)
                        .filter(SystemSite.site_id == site_id, SystemSite.critical == True)
                        .count())
        
    count_by_category = (db.query(System.category, func.count(System.id))
                            .join(SystemSite, System.id == SystemSite.system_id)
                            .filter(SystemSite.site_id == site_id, System.local == True)
                            .group_by(System.category).all())
    
    count_by_sector = (db.query(SystemSite.sector, func.count(SystemSite.system_id))
                        .join(System, SystemSite.system_id == System.id)
                        .filter(SystemSite.site_id == site_id, System.local == True)
                        .group_by(SystemSite.sector).all())
    
    count_analyzed_systems= (db.query(SystemSite)
                                .join(Answers, SystemSite.id == Answers.system_site_id)
                                .join(System, SystemSite.system_id == System.id)
                                .filter(SystemSite.site_id == site_id,System.local==True, Answers.is_current == True)
                                .group_by(SystemSite.id).count())
    
    nb_conform_qestions = (db.query(func.count(Answers.id))
                            .join(SystemSite, Answers.system_site_id == SystemSite.id)
                            .filter(SystemSite.site_id == site_id, Answers.is_current == True, Answers.conformity_to_criteria == True).scalar())
    
    nb_total_questions = (db.query(func.count(Answers.conformity_to_criteria))
                            .join(SystemSite, Answers.system_site_id == SystemSite.id)
                            .filter(SystemSite.site_id == site_id, Answers.is_current == True).scalar())
    
    conformity_rate = (nb_conform_qestions / nb_total_questions * 100) if nb_total_questions > 0 else 0

    if language.lower() == "en":
        # Get English version with fallback to French if not translated
        most_divergent_questions = (db.query(Checklist.id, 
                                    func.coalesce(Checklist_english.theme, Checklist.theme).label("theme"), 
                                    func.coalesce(Checklist_english.sub_theme, Checklist.sub_theme).label("sub_theme"), 
                                    func.count(Answers.id).label("nc_count"))
                                    .outerjoin(Checklist_english, Checklist.id == Checklist_english.id)
                                    .join(Answers, Checklist.id == Answers.question_id)
                                    .join(SystemSite, Answers.system_site_id == SystemSite.id)
                                    .filter(SystemSite.site_id == site_id, Answers.is_current == True, Answers.conformity_to_criteria == False)
                                    .group_by(Checklist.id)
                                    .order_by(func.count(Answers.id).desc()).all())
    else:
        # Get French version (default)
        most_divergent_questions = (db.query(Checklist.id, Checklist.theme, Checklist.sub_theme, func.count(Answers.id)
                                    .label("nc_count"))
                                    .join(Answers, Checklist.id == Answers.question_id)
                                    .join(SystemSite, Answers.system_site_id == SystemSite.id)
                                    .filter(SystemSite.site_id == site_id, Answers.is_current == True, Answers.conformity_to_criteria == False)
                                    .group_by(Checklist.id)
                                    .order_by(func.count(Answers.id).desc()).all())
    
    conformity_expr = (func.sum(case((Answers.conformity_to_criteria == True, 1), else_=0)) / func.nullif(func.count(Answers.conformity_to_criteria), 0)) * 100  
    # Fix: Remove Answers.conformity_to_criteria == False from filter to get all answers for conformity rate calculation
    worst_systems = (
        db.query(System.name, (conformity_expr).label("conformity_rate"),SystemSite.critical)
        .join(SystemSite, System.id == SystemSite.system_id)
        .join(Answers, SystemSite.id == Answers.system_site_id)
        .filter(SystemSite.site_id == site_id, Answers.is_current == True, System.local == True)  # Consider only local systems for worst systems ranking
        .having(func.count(Answers.id) > 0)  # Ensure we only consider systems with answers
        .group_by(System.id, SystemSite.critical)
        .order_by(conformity_expr.asc())
        .limit(5)
        .all()
    )
    systems_ranking_by_conformity_rate = (
    db.query(
        System.id,
        System.name,
        System.local,
        SystemSite.critical,
        SystemSite.sys_user,
        (conformity_expr).label("conformity_rate")
    )
    .join(SystemSite, System.id == SystemSite.system_id)
    .join(Answers, SystemSite.id == Answers.system_site_id)
    .filter(
        SystemSite.site_id == site_id,
        Answers.is_current == True
    )
    .group_by(System.id, System.name, System.local, SystemSite.critical, SystemSite.sys_user)
    .order_by(conformity_expr.desc())
    .all()
    )
    return {
        "all_count": all_count,
        "critical_count": critical_count,
        "local_count": local_count,
        "count_by_category": [{"category": category, "count": count} for category, count in count_by_category],
        "count_by_sector": [{"sector": sector, "count": count} for sector, count in count_by_sector],
        "count_analyzed_systems": count_analyzed_systems,
        "conformity_rate": conformity_rate,
        "most_divergent_questions": [{"question_id": q.id, "theme": q.theme, "sub_theme": q.sub_theme, "nc_count": q.nc_count} for q in most_divergent_questions],
        "worst_systems": [{"name": w.name, "conformity_rate": w.conformity_rate, "critical": w.critical} for w in worst_systems],
        "systems_ranking_by_conformity_rate": [{"id": s.id, "name": s.name,"local": s.local,"critical": s.critical, "sys_user": s.sys_user, "conformity_rate": s.conformity_rate} for s in systems_ranking_by_conformity_rate]
    }

@app.get("/api/get_system_info/")
def get_system_info(site_id:int, system_id:int, language: str = "fr", db: Session = Depends(get_db)):
    system_site_record= db.query(SystemSite).filter_by(site_id=site_id, system_id=system_id).first()
    system_record= db.query(System).filter_by(id=system_id).first()
    locality= "Local" if system_record.local else "Central"
    criticality= "Critical" if system_site_record.critical else "Non-Critical"
    category= db.query(System.category).filter_by(id=system_id).scalar()
    sector=system_site_record.sector
    sys_user=system_site_record.sys_user

    conformity_rate = (db.query(func.sum(case((Answers.conformity_to_criteria == True, 1), else_=0)) * 100 / func.nullif(func.count(Answers.conformity_to_criteria), 0))
                        .join(SystemSite, Answers.system_site_id == SystemSite.id)
                        .filter(SystemSite.id == system_site_record.id, Answers.is_current == True).scalar())
    
    gap_count = (db.query(func.count(Answers.id))
                    .join(SystemSite, Answers.system_site_id == SystemSite.id)
                    .filter(SystemSite.id == system_site_record.id, Answers.is_current == True, Answers.conformity_to_criteria == False).scalar())

    if language.lower() == "en":
        from sqlalchemy import func as sqla_func
        gaps_details = (db.query(Answers.id,Answers.gap_description,Answers.effect, Answers.detectability, Answers.occurrence, 
                                sqla_func.coalesce(Checklist_english.theme, Checklist.theme).label("theme"), 
                                sqla_func.coalesce(Checklist_english.sub_theme, Checklist.sub_theme).label("sub_theme"))
                        .join(SystemSite, Answers.system_site_id == SystemSite.id)
                        .join(Checklist, Answers.question_id == Checklist.id)
                        .outerjoin(Checklist_english, Checklist.id == Checklist_english.id)
                        .filter(SystemSite.id == system_site_record.id, Answers.is_current == True, Answers.conformity_to_criteria == False).all())
    else:
        # Get French version (default)
        gaps_details = (db.query(Answers.id,Answers.gap_description,Answers.effect, Answers.detectability, Answers.occurrence, Checklist.theme, Checklist.sub_theme)
                        .join(SystemSite, Answers.system_site_id == SystemSite.id)
                        .join(Checklist, Answers.question_id == Checklist.id)
                        .filter(SystemSite.id == system_site_record.id, Answers.is_current == True, Answers.conformity_to_criteria == False).all())

    if system_site_record.critical:
        c=5
    else:
        c=1
    gaps=[]
    for gap in gaps_details:
        gaps.append({
            "id": gap.id,
            "gap_description": gap.gap_description,
            "effect": gap.effect,
            "RPN": (gap.detectability) * (gap.occurrence) * c,
            "theme": gap.theme,
            "sub_theme": gap.sub_theme,
            "detectability": gap.detectability,
            "occurrence": gap.occurrence
        })
    return {
        "locality": locality,
        "criticality": criticality,
        "category": category,
        "sector": sector,
        "user": sys_user,
        "conformity_rate": conformity_rate,
        "gap_count": gap_count,
        "gaps_details": gaps
    }

@app.get("/api/get_capas/")
def get_capas(nc_id:int, site_id:int, system_id:int, db: Session = Depends(get_db)):
    system_site_id = db.query(SystemSite.id).filter_by(site_id=site_id, system_id=system_id).scalar()
    capas = (db.query(Capa.id, Capa.action_description, Capa.responsible_person, Capa.due_date, Capa.status)
                .join(Answers, Capa.answer_id == Answers.id)
                .filter(Answers.system_site_id == system_site_id, Answers.id == nc_id)
                .all())
    
    return [{"id": capa.id,
            "action_description": capa.action_description,
            "responsible_person": capa.responsible_person,
            "due_date": capa.due_date,
            "status": capa.status} for capa in capas]

@app.post("/api/save_proposed_action/")
def save_proposed_action(
    nc_id: int,
    proposed_action: str,
    responsible_person: Optional[str] = None,
    due_date: Optional[datetime.datetime] = None,
    capa_id: Optional[int] = None,  # NEW: Add this parameter
    db: Session = Depends(get_db)
):
    nc_record = db.query(Answers).filter_by(id=nc_id).first()
    if not nc_record:
        raise HTTPException(status_code=404, detail="Non-conformity record not found")
    
    if capa_id:  # NEW: Check if updating existing CAPA
        capa_record = db.query(Capa).filter_by(id=capa_id).first()
        if not capa_record:
            raise HTTPException(status_code=404, detail="CAPA record not found")
        
        # Update existing CAPA
        capa_record.action_description = proposed_action
        capa_record.responsible_person = responsible_person
        capa_record.due_date = due_date
    else:  # NEW: Create new CAPA
        capa_record = Capa(
            answer_id=nc_record.id,
            action_description=proposed_action,
            responsible_person=responsible_person,
            due_date=due_date,
        )
        db.add(capa_record)
    
    db.commit()
    return {"detail": "CAPA saved successfully"}

#####Action Plan Assistant####
@app.post("/api/call_capa_assistant/")
async def call_llm_capa(data: LLMRequest, db: Session = Depends(get_db)):
    llm_instance = await ensure_llm_initialized()
    
    system_name=data.system_name
    system_category_description=category_description_dict[data.system_category]
    theme=data.theme
    sub_theme=data.sub_theme
    gap=data.gap
    effect=data.effect
    risk_level=data.risk_level
    detectability=detectability_dict[data.detectability]
    occurrence=occurrence_dict[data.occurrence]
    system_criticality=criticality_dict[data.system_criticality]


    retrieval_query = f"Thème: {theme}, Sous-thème: {sub_theme}, Ecart constaté: {gap}"
    retrieved_items = retrieve_relevant_context(vectordb_path=VECTORDB_PATH,
                                                collection_name="AP_collection",
                                                query=retrieval_query,
                                                llm=llm_instance,
                                                top_k=5,
                                                theme=themes_eng.get(theme)
                                                )
    # Build context string for the prompt (concatenated for LLM)
    context = "\n".join([item["context"] for item in retrieved_items])
    
    prompt = Action_plan_template.format(
        system_name=system_name,
        system_category_description=system_category_description,
        theme=theme,
        sub_theme=sub_theme,
        gap=gap,
        effect=effect,
        detectability=detectability,
        occurrence=occurrence,
        system_criticality=system_criticality,
        risk_level=risk_level,
        context=context,
    )
    def stream():
        for chunk in llm_instance.stream(prompt):
            text = getattr(chunk, "text", None)
            if text:
                yield text
        # Stream paired source-context items
        for item in retrieved_items:
            yield f"\n\nSOURCE:\n{item['source']}"
            yield f"\n\nCONTEXT:\n{item['context']}"
    return StreamingResponse(stream(), media_type="text/event-stream")


####Conversastional Chatbot####
session_histories = {} 
MAX_TURNS = 3

@app.post("/api/call_chatbot/")
async def call_llm_chatbot(user_message: str, request: Request):
    llm_instance = await ensure_llm_initialized()

    session_id=request.client.host
    history = session_histories.get(session_id, [])
    history = history[-MAX_TURNS:]

    retrieved_items = retrieve_relevant_context(vectordb_path=VECTORDB_PATH,
                                                                        collection_name="conv_collection",
                                                                        query=user_message,
                                                                        llm=llm_instance,
                                                                        top_k=5)
    # Build context string for the prompt (concatenated for LLM)
    context = "\n".join([item["context"] for item in retrieved_items])
    
    prompt = chat_prompt.format(
        context=context,
        user_message=user_message,
        history="\n".join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in history])
    )
    def stream():
        response=""
        for chunk in llm_instance.stream(prompt):
            text = getattr(chunk, "text", None)
            response+=text
            yield text
        # Stream paired source-context items
        for item in retrieved_items:
            yield f"\n\nSOURCE:\n{item['source']}"
            yield f"\n\nCONTEXT:\n{item['context']}"
        history.append({"role": "Human", "content": user_message})
        history.append({"role": "Assistant", "content": response})
        session_histories[session_id] = history
        
    return StreamingResponse(stream(), media_type="text/event-stream")

@app.post("/api/close_capa/")
def close_capa(answer_id:int, capa_id: int, db: Session = Depends(get_db)):
    answer_record = db.query(Answers).filter_by(id=answer_id).first()
    answer_record.is_current=False
    db.merge(answer_record)

    capa_record = db.query(Capa).filter_by(id=capa_id).first()
    capa_record.status = "Closed"
    db.commit()
    return {"detail": "CAPA closed successfully"}