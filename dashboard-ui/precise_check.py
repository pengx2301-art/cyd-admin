with open('charts.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

depth = 0
open_braces = []
in_single = False
in_double = False
in_backtick = False
in_line_comment = False
in_block_comment = False

for i, line in enumerate(lines, 1):
    j = 0
    while j < len(line):
        c = line[j]
        
        # 处理注释
        if not in_single and not in_double and not in_backtick:
            if not in_block_comment and not in_line_comment:
                if j + 1 < len(line) and line[j:j+2] == '//':
                    in_line_comment = True
                    j += 2
                    continue
                elif j + 1 < len(line) and line[j:j+2] == '/*':
                    in_block_comment = True
                    j += 2
                    continue
            
            if in_line_comment and c == '\n':
                in_line_comment = False
            
            if in_block_comment and j + 1 < len(line) and line[j:j+2] == '*/':
                in_block_comment = False
                j += 2
                continue
            
            if in_line_comment or in_block_comment:
                j += 1
                continue
        
        # 处理转义
        if c == '\\':
            j += 2
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
                open_braces.append((i, j + 1, depth))
            elif c == '}':
                if open_braces:
                    open_braces.pop()
                depth -= 1
                if depth < 0:
                    print(f'ERROR: Line {i}, position {j+1}: Extra closing brace')
                    print(f'Context: {line[j:min(j+50,len(line))]}')
                    break
        
        j += 1
    
    if depth < 0:
        break

print(f'\nFinal depth: {depth}')
print(f'Unclosed braces: {len(open_braces)}')
if open_braces:
    print('\nLast 5 unclosed braces:')
    for line_num, pos, d in open_braces[-5:]:
        line_start = max(0, line_num - 1)
        line_end = min(len(lines), line_num + 2)
        print(f'\nLine {line_num}, depth {d}:')
        for k in range(line_start, line_end):
            print(f'  {k+1}: {lines[k].rstrip()}')
