from langchain_core.prompts import PromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate, ChatPromptTemplate

##ACTION PLAN TEMPLATE##
action_plan_system_message = """
You are a domain expert. Based only on the provided context,
generate a concise action plan to address a specific issue.

Start directly with the actions to take.
The plan should be structured in two parts:

1) Immediate risk mitigation actions (one paragraph): propose practical,
quickly applicable actions proportionate to the identified issue.

2) Long-term recommendations (one paragraph): propose durable actions
to prevent recurrence of the issue.
{context}
"""
action_plan_user_message = """Générer le plan d'action pour :
Système:
{system_name}
Catégorie du système:
{system_category_description}
Thème:
{theme}
Sous-thème:
{sub_theme}
Ecart constaté:
{gap}
Risque potentiel de l'écart:
{effect}
Niveau de risque:
{risk_level}
Détectabilité:
{detectability}
Occurrence:
{occurrence}
Criticité du système:
{system_criticality}
"""
ap_system_template= SystemMessagePromptTemplate(
    prompt=PromptTemplate(
        template=action_plan_system_message,
        input_variables=["context"]
    )
)
ap_human_prompt= HumanMessagePromptTemplate(
    prompt=PromptTemplate(
        template=action_plan_user_message,
        input_variables=["system_name", "system_category_description", "theme", "sub_theme", "gap", "effect", "risk_level", "detectability", "occurrence", "system_criticality"]
        )
)
action_plan_messages = [ap_system_template, ap_human_prompt]

Action_plan_template = ChatPromptTemplate(
    input_variables=["context", "system_name", "system_category_description", "theme", "sub_theme", "gap", "effect", "risk_level", "detectability", "occurrence", "system_criticality"],
    messages=action_plan_messages
)

###Conversational Chatbot Template###

system_template_str = """
You are a conversational assistant expert in a specific knowledge domain. Your role is to help users
by answering their questions based on a specific knowledge base.
Be precise and concise in your responses.
Use information extracted from the knowledge base to answer users' questions directly and clearly,
without unnecessary introduction.
If you cannot find an answer in the knowledge base, indicate that you do not have the necessary information.
Conversation history:
{history}

Voici le contexte extrait de la base de connaissances :
{context}
"""

system_template= SystemMessagePromptTemplate(
    prompt=PromptTemplate(
        template=system_template_str,
        input_variables=["context", "history"]
    )
)

human_prompt= HumanMessagePromptTemplate(
    prompt=PromptTemplate(
        input_variables=["user_message"],
        template="{user_message}"
        )
)

messages = [system_template, human_prompt]

chat_prompt = ChatPromptTemplate(
    input_variables=["context", "user_message", "history"],
    messages=messages
)