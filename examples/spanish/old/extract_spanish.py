def is_last_vowel_mid(root):
    r = range(len(root))
    r.reverse()
    hit_last_vowel = False
    for i in r:
        if root[i] in ['a', 'i', 'u', 'e', 'o', 'y', 'q', 'A', 'I', 'U', 'E', 'O', 'Y', 'Q']:
            if hit_last_vowel == False:
                if root[i] in ['e', 'o', 'E', 'O']:
                    return True
                else: 
                    hit_last_vowel = True
            else:
                return False



with open('SpanVerbs.txt') as infile:
    with open('spanish_train.txt', 'w') as outfile:
        outstr = ''
        lines = [line.split('\t') for line in infile.read().rstrip().split('\n')]
        lines = lines[1:]
        for line in lines:
            if line[3] == '1':
                if is_last_vowel_mid(line[0]):
                    outstr += line[0] + '\t' + line[1] + '\n'

        outfile.write(outstr)


