import re

# Clean Market.tsx
with open('src/components/Market.tsx', 'r', encoding='utf-8') as f:
    market = f.read()

market = re.sub(r"\s*onUnlockBetMode\?: \(\) => void;\n", "\n", market)
market = market.replace(", onUnlockBetMode", "")
market = re.sub(r"\s*\} else if \(\(adminCode === 'BLACKJACK' \|\| adminCode === 'DEATHGAME' \|\| adminCode === 'BAHIS'\) && onUnlockBetMode\) \{\s*onUnlockBetMode\(\);\s*alert\(t\('market\.admin\.success_bet'\)\);\s*", " ", market)
with open('src/components/Market.tsx', 'w', encoding='utf-8') as f:
    f.write(market)

# Clean App.tsx completely
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

app = re.sub(r"\s*onUnlockBetMode=\{\(\) => \{[\s\S]*?\}\}\n", "\n", app)
app = re.sub(r"\{/\* Bet Result Modal \*/\}[\s\S]*?(?=\{/\* Footer \*/\})", "", app)

app = app.replace("if (isBetModeActive) {\n          setIsBetModeActive(false);\n        }", "")
app = app.replace("setView(isBetModeActive || view === 'BET_MENU' ? 'BET_MENU' : 'ANALYZE');", "setView('ANALYZE');")
app = app.replace("onGameOver: handleGameOverBet", "")
app = re.sub(r"\{isBetModeActive \? \([\s\S]*?\) : \(\s*<div", "<div", app)
app = re.sub(r"onGameOver=\{handleGameOverBet\}\s*currentBet=\{currentBet\}\s*", "", app)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

