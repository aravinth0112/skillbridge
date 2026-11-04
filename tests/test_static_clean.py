import os

FORBIDDEN_TOKENS = [
    "alert(",
    "confirm(",
    "Aarav",
    "Welcome back",
    "Career Readiness",
    "Learning Progress",
    "74%",
    "88%",
    "My Learning",
    "Roadmap",
    "Certificates",
    "Community",
    "Job Opportunities",
    "Career Assistant",
    'href="#"',
    "javascript:void",
]

def test_static_files_clean():
    """
    Guard test ensuring app/static contains no fake or out-of-scope UI,
    no browser alert/confirm calls, and no hardcoded demo values.
    """
    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "static")
    violations = []

    for root, _, files in os.walk(static_dir):
        # Exclude external vendor libraries
        if "vendor" in root.replace("\\", "/").split("/"):
            continue
        for file in files:
            if file.endswith((".html", ".js")):
                filepath = os.path.join(root, file)
                relpath = os.path.relpath(filepath, static_dir).replace("\\", "/")
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    for token in FORBIDDEN_TOKENS:
                        if token.lower() in content.lower():
                            violations.append(f"{relpath} contains '{token}'")

    assert not violations, "Found forbidden tokens in static files:\n" + "\n".join(violations)
