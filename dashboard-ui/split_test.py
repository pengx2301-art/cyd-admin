with open('charts.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    open('test1.js', 'w', encoding='utf-8').writelines(lines[:2500])
    open('test2.js', 'w', encoding='utf-8').writelines(lines[2500:])

print('Files split: test1.js (lines 1-2500), test2.js (lines 2501-end)')
