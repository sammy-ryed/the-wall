import csv
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import ConfessionModel, ReplyModel, Base
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://walluser:wallpassword@127.0.0.1:3307/thewall")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate_confessions(session, csv_path):
    if not os.path.exists(csv_path):
        print(f"File not found: {csv_path}")
        return
    
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                cringe_score = float(row['cringe_score']) if row['cringe_score'] else 0.0
                survival = float(row['survival_probability']) if row['survival_probability'] else 0.0
                created_at = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')) if row.get('created_at') else None

                confession = ConfessionModel(
                    id=row['id'],
                    name=row.get('name'),
                    confession=row['confession'],
                    cringe_score=cringe_score,
                    survival_probability=survival,
                    roast=row['roast'],
                    verdict=row['verdict'],
                    era=row.get('era'),
                    target_name=row.get('target_name'),
                    created_at=created_at
                )
                session.merge(confession)
            except Exception as e:
                print(f"Error importing confession {row.get('id')}: {e}")
    session.commit()
    print("Confessions imported successfully.")

def migrate_replies(session, csv_path):
    if not os.path.exists(csv_path):
        print(f"File not found: {csv_path}")
        return
    
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                created_at = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')) if row.get('created_at') else None

                reply = ReplyModel(
                    id=row['id'],
                    confession_id=row['confession_id'],
                    user_id=row['user_id'],
                    display_name=row['display_name'],
                    body=row['body'],
                    created_at=created_at
                )
                session.merge(reply)
            except Exception as e:
                print(f"Error importing reply {row.get('id')}: {e}")
    session.commit()
    print("Replies imported successfully.")

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    print("Starting migration...")
    migrate_confessions(db, "confessions_rows.csv")
    migrate_replies(db, "replies_rows.csv")
    db.close()
    print("Migration complete!")
