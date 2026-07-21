from pydantic import BaseModel

class SiteCreate(BaseModel):
    id: int | None = None
    name: str | None = None
    activity_type: str | None = None
    address: str | None = None

    class Config:
        from_attributes = True

class LocalSystems(BaseModel):
    site_id: int
    systems_names: list[str]
    systems_descriptions: list[str]
    systems_categories: list[int]
    systems_sectors: list[str]
    systems_owners: list[str]
    systems_users: list[str]
    criticalities: list[bool]
    systems_admins: list[str]
    systems_admin_backups: list[str]
    systems_access_managers: list[str]

class ManualDataEntry(BaseModel):
    site_id: int
    system_id: int
    question_id: list[int]
    conformity_to_criteria: list[bool | None] = []
    gap_description: list[str] = []
    effect: list[str] = []
    detectability: list[int] = []
    occurrence: list[int] = []
    comment: list[str] = []

class LLMRequest(BaseModel):
    system_name: str
    system_category : int
    theme: str
    sub_theme: str
    gap: str
    effect: str
    detectability: int
    occurrence: int
    system_criticality: bool
    risk_level : str

detectability_dict = {1: "Toujours détecté avant la libération du lot",
                        2: "Probablement détectable avant la libération du lot",
                        3: "Probablement détectable après la libération du lot",
                        4: "Aucun mécanisme de détection"
                        }

occurrence_dict = {0: "Techniquement Impossible",
                    1: "Probabilité très faible, aucun antécédent de tels événements",
                    2: "Probabilité faible",
                    3: "Possible, mais pas fréquent",
                    4: "Très possible, s'est déjà produit"}
criticality_dict = {True: "Critique",
                    False: "Système non critique"}

category_description_dict = {1: "Un système non électronique",
                              2: "Un système électronique où les données GxP générées ne sont pas stockées et sont transférées manuellement sur papier",
                              3: "Un système électronique avec certaines données d’entrée ajustables manuellement et les données GxP générées ne sont pas stockées mais imprimées",
                              4: "Un système électronique avec certaines données d’entrée ajustables manuellement et les données GxP générées ne sont pas stockées mais envoyées via une interface à un autre système",
                              5: "Un système électronique où les données GxP sont stockées de manière permanente, et ces données GxP ne peuvent pas être modifiées par l’utilisateur pour générer des résultats (données statiques)",
                              6: "Un système électronique où les données GxP sont stockées de manière permanente et peuvent être traitées par l’utilisateur pour générer des résultats",
                            }