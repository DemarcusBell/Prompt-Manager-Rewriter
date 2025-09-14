import typer
from rich.console import Console
from rich.panel import Panel
from dotenv import load_dotenv
from app.rewrite import rewrite_prompt
from app.ask import ask_with_upgraded_prompt

app = typer.Typer()
console = Console()
load_dotenv()


def _flatten_rewritten(rw: dict) -> str:
    rewritten = rw.get("rewritten", "")
    if isinstance(rewritten, dict):
        parts = []
        for k, v in rewritten.items():
            if v:
                parts.append(f"{k}: {v}")
        rewritten = "\n".join(parts)
    return rewritten


@app.command()
def rewrite(prompt: str):
    rw = rewrite_prompt(prompt)
    rewritten = _flatten_rewritten(rw)
    score = rw.get("score", 0)
    questions = rw.get("questions", [])
    qtxt = "\n".join(questions) if questions else "None"
    console.print(
        Panel.fit(
            f"[bold]Score:[/bold] {score}\n\n[bold]Rewritten:[/bold]\n{rewritten}\n\n[bold]Questions:[/bold]\n{qtxt}"
        )
    )


@app.command()
def ask(prompt: str, prefer_numbers: bool = True):
    rw = rewrite_prompt(prompt)
    rewritten = _flatten_rewritten(rw)
    rules = '\nRules: Number lists plainly like "1 2 3 4 5".' if prefer_numbers else ""
    upgraded = rewritten + rules
    ans = ask_with_upgraded_prompt(upgraded)
    score = rw.get("score", 0)
    console.print(
        Panel.fit(
            f"[bold]Score:[/bold] {score}\n\n[bold]Prompt Used:[/bold]\n{upgraded}"
        )
    )
    console.print(Panel.fit(f"[bold]Answer:[/bold]\n{ans.get('answer','')}"))


if __name__ == "__main__":
    app()
