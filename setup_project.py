import os

# Define the folder structure
folders = [
    "web-tool",
    "web-tool/static/css",
    "web-tool/static/js",
    "web-tool/templates",
    "web-tool/uploads",
    "web-tool/processed_files"
]

# Create the folders
for folder in folders:
    os.makedirs(folder, exist_ok=True)

# Create empty files
files = {
    "web-tool/app.py": "",
    "web-tool/requirements.txt": "",
    "web-tool/static/css/style.css": "",
    "web-tool/static/js/main.js": "",
    "web-tool/templates/index.html": "",
    "web-tool/templates/editor.html": ""
}

# Create the files
for filepath, content in files.items():
    with open(filepath, "w") as f:
        f.write(content)

print("Project structure and files created successfully!")
