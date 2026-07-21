import os
import dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


dotenv.load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()
		

def db_init():
	from .models import Base
	Base.metadata.create_all(bind=engine)

def db_drop():
	from .models import Base
	Base.metadata.drop_all(bind=engine)
