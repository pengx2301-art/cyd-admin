with open('style.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    print(f'Total lines: {len(lines)}')
    print('Last 10 lines:')
    for line in lines[-10:]:
        print(line.rstrip())
