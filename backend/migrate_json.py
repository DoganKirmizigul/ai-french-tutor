"""One-time migration of Streamlit data/*.json files to SQLite.

Usage: python migrate_json.py /Users/dogan/Downloads/fransizca_app/data
"""
import json
import sys
from pathlib import Path

import db


def migrate(data_dir: Path):
    conn = db.get_conn()

    # Profile
    profile_file = data_dir / "profil.json"
    if profile_file.exists():
        p = json.loads(profile_file.read_text(encoding="utf-8"))
        # Map old Turkish field names to new English ones
        mapped = {
            "level": p.get("seviye", "A1"),
            "total_exercises": p.get("toplam_egzersiz", 0),
            "total_correct": p.get("toplam_dogru", 0),
            "streak": p.get("streak", 0),
            "last_session": p.get("son_oturum", ""),
            "placement_done": p.get("placement_yapildi", False),
            "weak_topics": p.get("zayif_konular", {}),
            "badges": p.get("rozetler", []),
        }
        db.write_profile(mapped)
        print(f"✅ profile: level={mapped['level']}, exercises={mapped['total_exercises']}")

    # SRS items
    srs_file = data_dir / "srs.json"
    if srs_file.exists():
        items = json.loads(srs_file.read_text(encoding="utf-8")).get("items", [])
        n = 0
        for i in items:
            with conn:
                try:
                    conn.execute(
                        """INSERT OR IGNORE INTO srs_items
                           (word, meaning, example, source, interval, ease, reps, next_review, added)
                           VALUES (?,?,?,?,?,?,?,?,?)""",
                        (i["kelime"], i["anlam"], i.get("ornek", ""), i.get("kaynak", "manual"),
                         i.get("interval", 1), i.get("ease", 2.5), i.get("tekrar", 0),
                         i["sonraki_tekrar"], i.get("eklendi", i["sonraki_tekrar"])),
                    )
                    n += 1
                except Exception as e:
                    print(f"  ⚠️ {i.get('kelime')}: {e}")
        print(f"✅ srs_items: {n}/{len(items)} words")

    # Sessions
    sessions_file = data_dir / "sessions.json"
    if sessions_file.exists():
        sessions = json.loads(sessions_file.read_text(encoding="utf-8")).get("sessions", [])
        with conn:
            conn.executemany(
                "INSERT INTO sessions (date, exercises, correct, accuracy) VALUES (?,?,?,?)",
                [(s["tarih"], s["egzersiz"], s["dogru"], s["dogruluk"]) for s in sessions],
            )
        print(f"✅ sessions: {len(sessions)} sessions")

    # Topic progress
    topic_file = data_dir / "konu_ilerleme.json"
    if topic_file.exists():
        topics = json.loads(topic_file.read_text(encoding="utf-8"))
        n = 0
        with conn:
            for topic_id, data in topics.items():
                for attempt in data.get("denemeler", []):
                    conn.execute(
                        "INSERT INTO topic_attempts (topic_id, topic_name, date, correct, total, score) VALUES (?,?,?,?,?,?)",
                        (topic_id, topic_id.replace("ozel_", "").replace("_", " "),
                         attempt["tarih"], attempt["dogru"], attempt["toplam"], attempt["puan"]),
                    )
                    n += 1
        print(f"✅ topic_attempts: {n} attempts")

    print("\n🎉 Migration complete.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python migrate_json.py <data_directory>")
        sys.exit(1)
    migrate(Path(sys.argv[1]))
