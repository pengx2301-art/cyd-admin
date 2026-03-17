with open('charts.js', 'r', encoding='utf-8') as f:
    content = f.read()
    
depth = 0
in_single = False
in_double = False
in_backtick = False
in_line_comment = False
in_block_comment = False
i = 0

unclosed_braces = []

while i < len(content):
    c = content[i]
    
    if not in_single and not in_double and not in_backtick:
        if not in_block_comment and not in_line_comment:
            if i + 1 < len(content) and content[i:i+2] == '//':
                in_line_comment = True
                i += 2
                continue
            elif i + 1 < len(content) and content[i:i+2] == '/*':
                in_block_comment = True
                i += 2
                continue
        
        if in_line_comment and c == '\n':
            in_line_comment = False
        
        if in_block_comment and i + 1 < len(content) and content[i:i+2] == '*/':
            in_block_comment = False
            i += 2
            continue
        
        if in_line_comment or in_block_comment:
            i += 1
            continue
    
    if c == '\\':
        i += 2
        continue
    
    if not in_double and not in_backtick:
        if c == "'":
            in_single = not in_single
    if not in_single and not in_backtick:
        if c == '"':
            in_double = not in_double
    if not in_single and not in_double:
        if c == '`':
            in_backtick = not in_backtick
    
    if not in_single and not in_double and not in_backtick and not in_line_comment and not in_block_comment:
        if c == '{':
            depth += 1
            if depth > 0:
                line_num = content[:i].count('\n') + 1
                unclosed_braces.append((line_num, depth, i))
        elif c == '}':
            depth -= 1
            if unclosed_braces and unclosed_braces[-1][1] == depth + 1:
                unclosed_braces.pop()
    
    i += 1

print(f'Final depth: {depth}')
print(f'Unclosed braces count: {len(unclosed_braces)}')
if unclosed_braces:
    print('Unclosed braces:')
    for line_num, d, pos in unclosed_braces[-5:]:
        line_start = content.rfind('\n', 0, pos) + 1
        line_end = content.find('\n', pos)
        if line_end == -1:
            line_end = len(content)
        line_content = content[line_start:line_end]
        print(f'  Line {line_num}, depth {d}')
        try:
            print(f'    {line_content[:100]}')
        except:
            print('    (encoding error)')
