with open('charts.js', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')
    
# 手动解析，忽略字符串和注释
brace_positions = []
depth = 0
in_single = False
in_double = False
in_backtick = False
in_line_comment = False
in_block_comment = False
i = 0

while i < len(content):
    c = content[i]
    
    # 处理注释
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
    
    # 处理转义字符
    if c == '\\':
        i += 2
        continue
    
    # 处理字符串
    if not in_double and not in_backtick:
        if c == "'":
            in_single = not in_single
    if not in_single and not in_backtick:
        if c == '"':
            in_double = not in_double
    if not in_single and not in_double:
        if c == '`':
            in_backtick = not in_backtick
    
    # 检查括号
    if not in_single and not in_double and not in_backtick and not in_line_comment and not in_block_comment:
        if c == '{':
            depth += 1
            brace_positions.append((i, depth, 'open'))
        elif c == '}':
            depth -= 1
            brace_positions.append((i, depth, 'close'))
    
    i += 1

print(f'Total depth: {depth}')
print(f'Last 10 brace positions:')

# 找到最后几个开括号
open_braces = [p for p in brace_positions if p[2] == 'open']
print(f'Total open braces: {len(open_braces)}')
if len(open_braces) > 0:
    print('Last open brace positions:')
    for pos, d, t in open_braces[-10:]:
        line_num = content[:pos].count('\n') + 1
        line_start = content.rfind('\n', 0, pos) + 1
        line_end = content.find('\n', pos)
        if line_end == -1:
            line_end = len(content)
        line_content = content[line_start:line_end].strip()
        print(f'  Line {line_num}, depth {d}: {line_content[:80]}...')
