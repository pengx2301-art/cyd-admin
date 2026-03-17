with open('charts.js', 'rb') as f:
    f.seek(-200, 2)
    content = f.read()
    print('Last 200 bytes:')
    print(content)
    print('\nDecoded:')
    print(content.decode('utf-8', errors='replace'))
