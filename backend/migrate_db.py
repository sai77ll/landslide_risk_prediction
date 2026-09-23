import sqlite3

conn = sqlite3.connect('landslide.db')
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE message_logs ADD COLUMN language VARCHAR(10) DEFAULT 'en'")
    print("Added language to message_logs")
except Exception as e:
    print(f"message_logs.language: {e}")

try:
    cur.execute("ALTER TABLE residents ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en'")
    print("Added preferred_language to residents")
except Exception as e:
    print(f"residents.preferred_language: {e}")

conn.commit()
conn.close()
print("DB migration done.")
