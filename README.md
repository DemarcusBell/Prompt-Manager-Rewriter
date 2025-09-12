# Prompt Manager Rewriter

🚀 A FastAPI + Tampermonkey integration that rewrites ChatGPT prompts with multiple modes and styles.  
Useful for cybersecurity study notes, resume prep, and productivity workflows.

---

## ⚡ Quick Start

```bash
git clone https://github.com/DemarcusBell/Prompt-Manager-Rewriter.git
cd Prompt-Manager-Rewriter
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000


✨ Features

🔄 One-click rewriting via Tampermonkey button or hotkey (Alt+R)

📝 Multiple rewrite styles (study notes, resume bullet points, plain text, etc.)

⚡ FastAPI backend for local processing

📸 Screenshots

All screenshots are available in the [`docs/screenshots`](./docs/screenshots) folder:

📂 Project Structure
Prompt-Manager-Rewriter/
│── app/                # FastAPI backend
│── userscript/         # Tampermonkey userscript
│── docs/screenshots/   # Screenshots for documentation
│── requirements.txt    # Python dependencies
│── README.md           # This file

📜 License

MIT License © 2025 Demarcus Bell


---

💡 After saving, check your repo homepage — the images should render inline, no more links/attachments.  

Do you want me to also **add badges** (like Python version, license, GitHub stars) at the top of the README s
