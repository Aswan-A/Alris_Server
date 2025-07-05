def check_spam(text: str):
    return {
        "is_spam": "spam" in text.lower(),
        "confidence": 0.92  # dummy value
    }
