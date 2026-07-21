from sqlalchemy import Column, Integer, String, ForeignKey , Boolean, Text ,DateTime, func
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Site(Base):
    __tablename__ = 'site'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    activity_type = Column(String(50))
    address = Column(String(50))

    system_relation = relationship("SystemSite", back_populates="site_relation", passive_deletes=True)

class System(Base):
    __tablename__ = 'system'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text,nullable=False)
    description = Column(Text)
    category = Column(Integer)
    local = Column(Boolean)

    site_relation = relationship("SystemSite", back_populates="system_relation", passive_deletes=True)

class SystemSite(Base):
    __tablename__ = 'system_site'

    id = Column(Integer, primary_key=True, autoincrement=True)
    site_id = Column(Integer, ForeignKey("site.id", ondelete="CASCADE"))
    system_id = Column(Integer, ForeignKey("system.id", ondelete="CASCADE"))
    sector = Column(Text)
    critical=Column(Boolean, default=False,server_default='false')
    sys_owner = Column(Text)
    sys_user = Column(Text)
    admin = Column(Text)
    admin_backup = Column(Text)
    access_manager = Column(Text)

    site_relation = relationship("Site", back_populates="system_relation", passive_deletes=True)
    system_relation = relationship("System", back_populates="site_relation", passive_deletes=True)
    answers = relationship("Answers", back_populates="system", passive_deletes=True)


class Checklist(Base):
    __tablename__ = 'checklist'

    id = Column(Integer, primary_key=True, autoincrement=True)
    theme = Column(String(100))
    sub_theme = Column(String(100))
    question = Column(Text)
    category = Column(String(20))
    acceptance_criteria = Column(Text)

    answers = relationship("Answers", back_populates="question", passive_deletes=True) 
    english_question = relationship("Checklist_english", back_populates="french_question", passive_deletes=True)
class Checklist_english(Base):
    __tablename__ = 'checklist_en'

    id = Column(Integer, ForeignKey('checklist.id', ondelete='CASCADE'), primary_key=True)
    theme = Column(String(100))
    sub_theme = Column(String(100))
    question = Column(Text)
    category = Column(String(20))
    acceptance_criteria = Column(Text)

    french_question = relationship("Checklist", back_populates="english_question", passive_deletes=True)

class Answers(Base):
    __tablename__ = 'answers'

    id = Column(Integer, primary_key=True,autoincrement=True)
    system_site_id = Column(Integer, ForeignKey('system_site.id', ondelete="CASCADE"))
    question_id = Column(Integer, ForeignKey('checklist.id', ondelete="CASCADE"))
    conformity_to_criteria = Column(Boolean, nullable=True)
    gap_description = Column(Text, nullable=True)
    effect = Column(Text, nullable=True)
    detectability = Column(Integer, nullable=True)
    occurrence = Column(Integer, nullable=True)
    is_current = Column(Boolean, default=True,nullable=False)
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    system = relationship("SystemSite", back_populates="answers")
    question = relationship("Checklist", back_populates="answers")
    capa = relationship("Capa", back_populates="answer", passive_deletes=True)

class Capa(Base):
    __tablename__ = 'capa'

    id = Column(Integer, primary_key=True, autoincrement=True)
    answer_id = Column(Integer, ForeignKey('answers.id', ondelete="CASCADE"))
    action_description = Column(Text, nullable=False)
    responsible_person = Column(String(100), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default='Open', nullable=True)

    answer = relationship("Answers", back_populates="capa")

