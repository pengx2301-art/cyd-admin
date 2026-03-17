with open('charts.js', 'r', encoding='utf-8') as f:
    content = f.read()
    
# 简单地遍历，跟踪深度
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
            if depth == 1:
                line_num = content[:i].count('\n') + 1
                print(f'Depth 1 at line {line_num}: {content[i:min(i+100,len(content))]}')
        elif c == '}':
            depth -= 1
            if depth == 0:
                print(f'Closed at line {content[:i].count("\\n") + 1}')
    
    i += 1

print(f'Final depth: {depth}')
