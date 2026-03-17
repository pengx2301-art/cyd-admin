with open('charts.js', 'r', encoding='utf-8') as f:
    content = f.read()
    backticks = content.count('`')
    print(f'Backticks: {backticks}')
    
    # 检查括号
    open_paren = content.count('(')
    close_paren = content.count(')')
    print(f'Parentheses: open={open_paren}, close={close_paren}, diff={open_paren - close_paren}')
    
    open_brace = content.count('{')
    close_brace = content.count('}')
    print(f'Braces: open={open_brace}, close={close_brace}, diff={open_brace - close_brace}')
    
    open_bracket = content.count('[')
    close_bracket = content.count(']')
    print(f'Brackets: open={open_bracket}, close={close_bracket}, diff={open_bracket - close_bracket}')
    
    # 检查字符串
    single_quotes = content.count("'")
    double_quotes = content.count('"')
    print(f'Single quotes: {single_quotes}, Double quotes: {double_quotes}')
