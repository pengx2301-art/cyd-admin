with open('charts.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    
depth = 0
for i, line in enumerate(lines, 1):
    # 跳过注释中的括号
    if '//' in line:
        comment_start = line.index('//')
        line = line[:comment_start]
    if '/*' in line:
        if '*/' in line:
            comment_start = line.index('/*')
            comment_end = line.index('*/') + 2
            line = line[:comment_start] + line[comment_end:]
        else:
            line = line[:line.index('/*')]
    
    # 跳过字符串中的括号
    in_single = False
    in_double = False
    in_backtick = False
    j = 0
    while j < len(line):
        if line[j:j+2] == '\\\\' or line[j:j+2] == '\\"' or line[j:j+2] == "\\'" or line[j:j+2] == '\\`':
            j += 2
            continue
        if line[j] == "'" and not in_double and not in_backtick:
            in_single = not in_single
        elif line[j] == '"' and not in_single and not in_backtick:
            in_double = not in_double
        elif line[j] == '`' and not in_single and not in_double:
            in_backtick = not in_backtick
        elif not in_single and not in_double and not in_backtick:
            if line[j] == '{':
                depth += 1
            elif line[j] == '}':
                depth -= 1
                if depth < 0:
                    print(f'Line {i}: Extra closing brace, depth = {depth}')
                    print(line)
        j += 1
    
    if depth < 0:
        print(f'Line {i}: Depth negative at {depth}')
        break
    elif i % 500 == 0:
        print(f'Line {i}: depth = {depth}')

print(f'Final depth = {depth}')
