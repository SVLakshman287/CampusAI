def classify_question(question: str):
    question = question.lower()

    categories = {
        "attendance": ["attendance", "absent", "present"],
        "examination": ["exam", "examination", "semester test", "marks"],
        "fees": ["fee", "fees", "payment", "pay"],
        "hostel": ["hostel", "room", "mess", "timings"],
        "certificates": ["certificate", "bonafide", "document"],
        "placements": ["placement", "job", "recruitment", "campus drive"],
        "scholarships": ["scholarship", "financial aid", "grant"],
        "academics": ["academic", "course", "subject", "class", "syllabus", "assignment"],
    }

    for category, keywords in categories.items():
        for keyword in keywords:
            if keyword in question:
                return category

    return "general"
