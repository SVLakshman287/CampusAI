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


def find_best_answer(question, category, knowledge_base):
    question_words = {
        word.strip(".,!?;:") for word in question.lower().split()
    }
    category_data = knowledge_base.get(category, {})
    faq_questions = category_data.get("common_questions", {})

    best_answer = None
    highest_match_count = 0

    for faq_question, answer in faq_questions.items():
        faq_words = {
            word.strip(".,!?;:") for word in faq_question.lower().split()
        }
        match_count = len(question_words & faq_words)

        if match_count > highest_match_count:
            highest_match_count = match_count
            best_answer = answer

    return best_answer
