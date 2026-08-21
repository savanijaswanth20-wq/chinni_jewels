import re


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    return re.sub(r'[\W_]+', '-', text.lower()).strip('-')
