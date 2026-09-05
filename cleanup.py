import re

def clean_app():
    with open('src/App.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove BlackjackGame import
    content = re.sub(r"import BlackjackGame from '\./components/BlackjackGame';\n", '', content)
    
    # Remove 'BET_MENU' from the view union type
    content = content.replace(" | 'BET_MENU'", "")
    
    # Remove bet mode states
    content = re.sub(r"^\s*// Bet mode state.*?\n", "", content, flags=re.MULTILINE)
    content = re.sub(r"^\s*const \[isBetModeUnlocked, setIsBetModeUnlocked\] = useState<boolean>\(false\);\n", "", content, flags=re.MULTILINE)
    content = re.sub(r"^\s*const \[isBetModeActive, setIsBetModeActive\] = useState<boolean>\(false\);\n", "", content, flags=re.MULTILINE)
    content = re.sub(r"^\s*const \[currentBet, setCurrentBet\] = useState<number>\(10\);\n", "", content, flags=re.MULTILINE)
    content = re.sub(r"^\s*const \[betResult, setBetResult\] = useState<\{[\s\S]*?\} \| null>\(null\);\n", "", content, flags=re.MULTILINE)
    
    # Remove handleGameOverBet and handleStartBetGame functions
    content = re.sub(r"^\s*const handleGameOverBet = \([\s\S]*?^\s*};\n\n", "", content, flags=re.MULTILINE)
    content = re.sub(r"^\s*const handleStartBetGame = \(\) => \{[\s\S]*?^\s*};\n\n", "", content, flags=re.MULTILINE)
    
    # Remove if (isBetModeActive) blocks inside updateHighscore
    # Too complex for regex, I'll let it be for now and see if I can do it manually or replace it
    
    # Remove the Bet button from the header
    bet_button_pattern = r"^\s*\{view !== 'MARKET' && view !== 'GAME' && isBetModeUnlocked && \([\s\S]*?^\s*\)\}\n"
    content = re.sub(bet_button_pattern, "", content, flags=re.MULTILINE)
    
    # Remove BET_MENU view entirely
    bet_menu_pattern = r"^\s*\{/\* Bet Menu View \*/\}[\s\S]*?\{/\* Bet Result Modal \*/\}"
    content = re.sub(bet_menu_pattern, "{/* Bet Result Modal */}", content, flags=re.MULTILINE)
    
    # Remove Bet Result Modal
    bet_modal_pattern = r"^\s*\{/\* Bet Result Modal \*/\}[\s\S]*?^\s*\}\)\}\n"
    # Actually just remove till the end of the return statement or until next comment
    
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

clean_app()
